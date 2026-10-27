import { createHash } from "node:crypto";
import { inflateSync } from "node:zlib";

/**
 * Server-side upload inspection. HANDOVER-59 Parts 4.1, 4.2 and 4.4.
 *
 *   - The declared Content-Type is never trusted. The first bytes decide
 *     what a file is, and a file whose bytes disagree with its declaration
 *     is rejected (magic_bytes_mismatch).
 *   - Image dimensions come from the header, read before anything decodes
 *     the file, so a 2 KB PNG declaring 50,000 x 50,000 is refused without
 *     ever allocating its pixels.
 *   - PDFs are refused when they carry active content. A degree certificate
 *     needs no JavaScript, no launch action and no embedded files.
 *
 * Every rejection names the checks that failed; upload_scans refuses one
 * that does not.
 */

export type DetectedMime = "image/jpeg" | "image/png" | "image/webp" | "application/pdf";

export type FailedCheck =
  | "empty_file"
  | "too_large"
  | "magic_bytes_mismatch"
  | "type_not_allowed"
  | "image_header_unreadable"
  | "dimensions_too_small"
  | "dimensions_too_large"
  | "pdf_active_content";

export type Inspection = {
  status: "clean" | "rejected";
  failedChecks: FailedCheck[];
  detectedMime: DetectedMime | null;
  width: number | null;
  height: number | null;
  sha256: string;
  bytes: number;
  detail: string | null;
};

/** Above this an image is refused before decode (Part 4.2). */
export const MAX_PIXELS = 50_000_000;
const MIN_SIDE = 10;

export function detectMime(b: Uint8Array): DetectedMime | null {
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (
    b.length >= 8 &&
    b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 &&
    b[4] === 0x0d && b[5] === 0x0a && b[6] === 0x1a && b[7] === 0x0a
  ) {
    return "image/png";
  }
  if (b.length >= 12 && ascii(b, 0, 4) === "RIFF" && ascii(b, 8, 4) === "WEBP") return "image/webp";
  // PDF readers accept the header anywhere in the first 1024 bytes, so a
  // stricter check here would only reject real files. It must still be there.
  if (b.length >= 5 && ascii(b, 0, Math.min(b.length, 1024)).includes("%PDF-")) return "application/pdf";
  return null;
}

function ascii(b: Uint8Array, start: number, length: number) {
  return Buffer.from(b.buffer, b.byteOffset + start, Math.min(length, b.length - start)).toString("latin1");
}

/** Width and height from the header only. Null when the header cannot be read. */
export function imageSize(b: Uint8Array, mime: DetectedMime): { width: number; height: number } | null {
  const view = new DataView(b.buffer, b.byteOffset, b.byteLength);
  try {
    if (mime === "image/png") {
      if (b.length < 24 || ascii(b, 12, 4) !== "IHDR") return null;
      return { width: view.getUint32(16), height: view.getUint32(20) };
    }
    if (mime === "image/jpeg") {
      let i = 2;
      while (i + 9 < b.length) {
        if (b[i] !== 0xff) return null;
        const marker = b[i + 1];
        if (marker === 0xff) {
          i += 1;
          continue;
        }
        // Standalone markers carry no length.
        if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
          i += 2;
          continue;
        }
        const length = view.getUint16(i + 2);
        // SOF0 to SOF15, except DHT (C4), JPG (C8) and DAC (CC).
        if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
          return { height: view.getUint16(i + 5), width: view.getUint16(i + 7) };
        }
        if (length < 2) return null;
        i += 2 + length;
      }
      return null;
    }
    if (mime === "image/webp") {
      const chunk = ascii(b, 12, 4);
      if (chunk === "VP8X" && b.length >= 30) {
        const w = 1 + (b[24] | (b[25] << 8) | (b[26] << 16));
        const h = 1 + (b[27] | (b[28] << 8) | (b[29] << 16));
        return { width: w, height: h };
      }
      if (chunk === "VP8 " && b.length >= 30) {
        return { width: view.getUint16(26, true) & 0x3fff, height: view.getUint16(28, true) & 0x3fff };
      }
      if (chunk === "VP8L" && b.length >= 25 && b[20] === 0x2f) {
        const bits = view.getUint32(21, true);
        return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 };
      }
      return null;
    }
  } catch {
    return null;
  }
  return null;
}

/*
 * Names that make a PDF do something rather than show something. /OpenAction
 * on its own is not here on purpose: Word and Acrobat write a page
 * destination there in ordinary files ("open at page 1"), and the dangerous
 * action types it can carry are caught by their own names below.
 */
const PDF_ACTIVE = ["/JavaScript", "/JS", "/Launch", "/EmbeddedFile", "/EmbeddedFiles", "/RichMedia"] as const;
const MAX_INFLATED = 50 * 1024 * 1024;

/** "#4A" inside a name is "J". Attackers spell /JavaScript as /J#61vaScript. */
function decodeNameEscapes(text: string) {
  return text.replace(/\/[^\s/<>[\]()%{}]*#[0-9A-Fa-f]{2}[^\s/<>[\]()%{}]*/g, (name) =>
    name.replace(/#([0-9A-Fa-f]{2})/g, (_m, hex: string) => String.fromCharCode(parseInt(hex, 16))),
  );
}

function activeNamesIn(text: string): string[] {
  const decoded = decodeNameEscapes(text);
  return PDF_ACTIVE.filter((name) => new RegExp(`${name}(?![A-Za-z0-9])`).test(decoded));
}

/**
 * Active content in a PDF, including inside compressed streams: object
 * streams can hide an /OpenAction dictionary from a plain byte search.
 * Inflation is capped, so a compression bomb cannot exhaust memory here.
 */
export function pdfActiveContent(b: Uint8Array): string[] {
  const raw = Buffer.from(b.buffer, b.byteOffset, b.byteLength).toString("latin1");
  const found = new Set(activeNamesIn(raw));
  let budget = MAX_INFLATED;
  const streams = /(?<!end)stream\r?\n/g;
  let match: RegExpExecArray | null;
  while ((match = streams.exec(raw)) && budget > 0) {
    const start = match.index + match[0].length;
    const end = raw.indexOf("endstream", start);
    if (end < 0) break;
    try {
      const out = inflateSync(Buffer.from(b.buffer, b.byteOffset + start, end - start), { maxOutputLength: budget });
      budget -= out.length;
      for (const name of activeNamesIn(out.toString("latin1"))) found.add(name);
    } catch {
      // Not deflate, or truncated: the raw search above already covered it.
    }
    streams.lastIndex = end + "endstream".length;
  }
  return [...found];
}

export function inspectUpload(input: {
  bytes: Uint8Array;
  declaredMime: string | null;
  allowed: readonly string[];
  maxBytes: number;
}): Inspection {
  const { bytes } = input;
  const failed: FailedCheck[] = [];
  const notes: string[] = [];
  const sha256 = createHash("sha256").update(bytes).digest("hex");
  const detected = detectMime(bytes);
  let width: number | null = null;
  let height: number | null = null;

  if (bytes.length === 0) failed.push("empty_file");
  if (bytes.length > input.maxBytes) failed.push("too_large");
  if (!detected || (input.declaredMime && detected !== input.declaredMime)) {
    failed.push("magic_bytes_mismatch");
    notes.push(`declared ${input.declaredMime ?? "nothing"}, content is ${detected ?? "not a known type"}`);
  }
  if (detected && !input.allowed.includes(detected)) failed.push("type_not_allowed");

  if (detected && detected !== "application/pdf") {
    const size = imageSize(bytes, detected);
    if (!size) {
      failed.push("image_header_unreadable");
    } else {
      width = size.width;
      height = size.height;
      if (width < MIN_SIDE || height < MIN_SIDE) failed.push("dimensions_too_small");
      if (width * height > MAX_PIXELS) failed.push("dimensions_too_large");
    }
  }

  if (detected === "application/pdf") {
    const active = pdfActiveContent(bytes);
    if (active.length) {
      failed.push("pdf_active_content");
      notes.push(`contains ${active.join(", ")}`);
    }
  }

  return {
    status: failed.length ? "rejected" : "clean",
    failedChecks: failed,
    detectedMime: detected,
    width,
    height,
    sha256,
    bytes: bytes.length,
    detail: notes.length ? notes.join("; ") : null,
  };
}

/** What the uploader is told. Never the internal check names. */
export function rejectionMessage(i: Inspection): string {
  if (i.failedChecks.includes("pdf_active_content")) {
    return "This PDF contains active content (scripts or embedded files), so we cannot accept it. A plain scan or photo of the document works.";
  }
  if (i.failedChecks.includes("magic_bytes_mismatch") || i.failedChecks.includes("type_not_allowed")) {
    return "This file is not a real PDF, JPG, PNG or WebP. Please export it again and re-upload it.";
  }
  if (i.failedChecks.includes("too_large")) return "This file is too large.";
  return "This image could not be read. Please take or export it again.";
}
