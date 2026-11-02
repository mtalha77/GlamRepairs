import "server-only";

import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";

/**
 * The agreement as a PDF (Handover 66 §5.2). Two uses:
 *
 *   unsigned  the published text, offered for download beside the tick box
 *   signed    the same text with the acceptance record printed on page one,
 *             written once to practitioner-docs when they accept
 *
 * The stored body and its SHA-256 are the authority; the PDF is a rendering
 * of them and prints the hash so the two can be matched later. Standard PDF
 * fonts cannot draw every character, so the few they cannot (emoji, curly
 * quotes) are replaced, which is why the hash, not the PDF, is the evidence.
 */

const W = 595.28;
const H = 841.89;
const M = 54;
const INK = rgb(0.169, 0.169, 0.169);
const GRAY = rgb(0.35, 0.35, 0.35);
const PURPLE = rgb(0.4, 0.176, 0.569);

function winAnsi(value: string) {
  return value
    .replace(/[–—]/g, "-")
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/…/g, "...")
    .replace(/\t/g, "    ")
    .replace(/[^\n\x20-\x7E\xA0-\xFF]/g, "");
}

function wrap(text: string, font: PDFFont, size: number, width: number): string[] {
  const out: string[] = [];
  for (const para of winAnsi(text).replace(/\r\n/g, "\n").split("\n")) {
    if (!para.trim()) {
      out.push("");
      continue;
    }
    let line = "";
    for (const word of para.split(/ +/)) {
      const next = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(next, size) <= width) {
        line = next;
        continue;
      }
      if (line) out.push(line);
      // A single word wider than the line (a hash, a long URL) is cut.
      let rest = word;
      while (font.widthOfTextAtSize(rest, size) > width) {
        let n = rest.length;
        while (n > 1 && font.widthOfTextAtSize(rest.slice(0, n), size) > width) n--;
        out.push(rest.slice(0, n));
        rest = rest.slice(n);
      }
      line = rest;
    }
    out.push(line);
  }
  return out;
}

export type AgreementPdfInput = {
  title: string;
  version: string;
  body: string;
  sha256: string;
  effectiveFrom: string;
  signed?: {
    practitionerName: string;
    practitionerId: string;
    acceptedAt: string;
    ip: string | null;
    userAgent: string | null;
  };
};

export async function buildAgreementPdf(input: AgreementPdfInput): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle(`${input.title} (${input.version})`);
  doc.setProducer("GlamRepairs");
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  let page: PDFPage = doc.addPage([W, H]);
  let y = H - M;

  const draw = (text: string, f: PDFFont, size: number, color = INK, gap = 4) => {
    for (const line of wrap(text, f, size, W - 2 * M)) {
      if (y < M + size) {
        page = doc.addPage([W, H]);
        y = H - M;
      }
      if (line) page.drawText(line, { x: M, y: y - size, size, font: f, color });
      y -= size + gap;
    }
  };

  draw(input.title, bold, 16, PURPLE, 6);
  draw(`Version ${input.version}, in force from ${input.effectiveFrom.slice(0, 10)}`, font, 10, GRAY);
  draw(`SHA-256 of the text: ${input.sha256}`, font, 8, GRAY);
  y -= 6;

  if (input.signed) {
    const s = input.signed;
    draw("Acceptance record", bold, 11, INK);
    draw(`Accepted by ${s.practitionerName} (practitioner ${s.practitionerId})`, font, 9.5);
    draw(`Accepted at ${s.acceptedAt} (UTC), by ticking the box below the full text in the GlamRepairs Studio`, font, 9.5);
    draw(`IP address: ${s.ip ?? "not available"}`, font, 9.5);
    draw(`Browser: ${s.userAgent ?? "not available"}`, font, 8.5, GRAY);
    y -= 8;
  }

  draw(input.body, font, 10, INK, 3.5);
  return doc.save();
}
