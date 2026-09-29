"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import type { MediaRole } from "@/lib/studio/mediaProcess";

/**
 * Upload one image — HANDOVER-45 §3.1.
 *
 * The browser does two things before anything is sent: it refuses file
 * types the pipeline cannot take, and it downscales to 2400px on the long
 * edge so a 9 MB phone photo does not hit the 4.5 MB request ceiling. The
 * server does the real resize, WebP conversion and 500 KB check.
 *
 * Save stays disabled until there is alt text of at least 10 characters,
 * the same rule the database enforces. §3.1.7: every CMS that makes alt
 * text optional ends up with a site full of empty alts.
 */

const ACCEPT = ["image/png", "image/jpeg", "image/webp"];
const MAX_EDGE = 2400;

const ROLE_HELP: Record<MediaRole, string> = {
  hero: "Top of a blog post. Resized to at most 1600px wide.",
  og: "Social share card. Cropped to exactly 1200 × 630 around the point you click.",
  inline: "Inside an article. Resized to at most 1600px wide.",
  icon: "Small graphic. Resized to at most 512px.",
};

/** Words a written description contains and a keyword list does not. */
const FUNCTION_WORDS = /\b(a|an|the|of|on|in|with|at|and|to|for|by|her|his|their|from|over|under|beside|while)\b/i;

function looksLikeKeywords(alt: string) {
  const words = alt.trim().split(/\s+/).filter(Boolean);
  return words.length >= 4 && !FUNCTION_WORDS.test(alt);
}

function slugify(raw: string) {
  const slug = raw
    .toLowerCase()
    .replace(/\.[a-z0-9]{2,5}$/, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return /^(img|dsc|dcim|pxl|image|photo|screenshot|whatsapp)(-|$)/.test(slug) ? "" : slug.slice(0, 80);
}

async function downscale(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  if (scale === 1 && file.size < 3_500_000) {
    bitmap.close();
    return file;
  }
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("resize failed"))), "image/jpeg", 0.92),
  );
}

export type UploadedMedia = {
  id: string;
  publicUrl: string;
  filename: string;
  width: number;
  height: number;
  bytes: number;
  altText: string;
};

export default function MediaUploader({
  defaultRole = "inline",
  lockRole = false,
  onUploaded,
}: {
  defaultRole?: MediaRole;
  lockRole?: boolean;
  onUploaded?: (media: UploadedMedia) => void;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [role, setRole] = useState<MediaRole>(defaultRole);
  const [alt, setAlt] = useState("");
  const [filename, setFilename] = useState("");
  const [caption, setCaption] = useState("");
  const [credit, setCredit] = useState("");
  const [focal, setFocal] = useState({ x: 0.5, y: 0.5 });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview);
  }, [preview]);

  const altOk = alt.trim().length >= 10;
  const canSave = Boolean(file) && altOk && !busy;

  function pick(f: File | undefined) {
    setError(null);
    setDone(null);
    if (!f) return;
    if (!ACCEPT.includes(f.type)) {
      setError("Only PNG, JPEG and WebP images can be uploaded.");
      if (inputRef.current) inputRef.current.value = "";
      return;
    }
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setFilename(slugify(f.name));
    setFocal({ x: 0.5, y: 0.5 });
  }

  async function save() {
    if (!file || !altOk) return;
    setBusy(true);
    setError(null);
    try {
      const body = new FormData();
      // A large image is re-encoded as JPEG in the browser only to shrink the
      // request; the server converts everything to WebP either way.
      const blob = await downscale(file);
      body.set(
        "file",
        blob === file ? file : new File([blob], "upload.jpg", { type: "image/jpeg" }),
      );
      body.set("altText", alt.trim());
      body.set("role", role);
      body.set("filename", filename || slugify(alt));
      body.set("caption", caption);
      body.set("credit", credit);
      body.set("focalX", String(focal.x));
      body.set("focalY", String(focal.y));
      const res = await fetch("/api/studio/media", { method: "POST", body });
      const json = await res.json().catch(() => ({ ok: false, error: "Upload failed." }));
      if (!json.ok) {
        setError(json.error ?? "Upload failed.");
        return;
      }
      setDone(
        `Saved ${json.filename}: ${json.width} × ${json.height}, ${Math.round(json.bytes / 1000)} KB WebP.`,
      );
      onUploaded?.({
        id: json.id,
        publicUrl: json.publicUrl,
        filename: json.filename,
        width: json.width,
        height: json.height,
        bytes: json.bytes,
        altText: alt.trim(),
      });
      setFile(null);
      setPreview(null);
      setAlt("");
      setFilename("");
      setCaption("");
      setCredit("");
      if (inputRef.current) inputRef.current.value = "";
      router.refresh();
    } catch {
      setError("Upload failed. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-5">
      <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <div>
          <label className="block text-sm font-medium" htmlFor="media-file">
            Image
          </label>
          <input
            ref={inputRef}
            id="media-file"
            type="file"
            accept=".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp"
            onChange={(e) => pick(e.target.files?.[0])}
            className="mt-2 block w-full text-sm file:mr-3 file:rounded-full file:border-0 file:bg-neutral-900 file:px-4 file:py-2 file:text-white"
          />
          <p className="mt-1 text-xs text-neutral-500">PNG, JPEG or WebP. Saved as WebP, 500 KB at most.</p>
          {preview ? (
            <div className="mt-3">
              {/* The click sets the focal point used for the 1200 × 630 crop. */}
              <button
                type="button"
                onClick={(e) => {
                  const r = e.currentTarget.getBoundingClientRect();
                  setFocal({
                    x: Math.round(((e.clientX - r.left) / r.width) * 100) / 100,
                    y: Math.round(((e.clientY - r.top) / r.height) * 100) / 100,
                  });
                }}
                className="relative block w-full overflow-hidden rounded-xl border border-neutral-200"
                aria-label="Set the focal point"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={preview} alt="" className="block w-full" />
                <span
                  aria-hidden
                  className="absolute h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-neutral-900/60"
                  style={{ left: `${focal.x * 100}%`, top: `${focal.y * 100}%` }}
                />
              </button>
              <p className="mt-1 text-xs text-neutral-500">
                Click the part of the picture that must never be cropped out.
              </p>
            </div>
          ) : null}
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium" htmlFor="media-alt">
              Alt text <span className="text-red-600">*</span>
            </label>
            <textarea
              id="media-alt"
              value={alt}
              onChange={(e) => setAlt(e.target.value)}
              rows={3}
              className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
              placeholder="Ayma reviewing a client's photographs on a tablet"
            />
            <div className="mt-1 flex justify-between text-xs">
              <p className="text-neutral-500">
                Describe what is in the image for someone who cannot see it. Do
                not write your keyword.
              </p>
              <span className={altOk ? "text-emerald-700" : "text-red-600"}>
                {alt.trim().length} / 10 min
              </span>
            </div>
            <p className="mt-1 text-xs text-neutral-500">
              Good: &ldquo;Ayma reviewing a client&apos;s photographs on a tablet&rdquo;. Bad:
              &ldquo;skin assessment Pakistan Lahore best&rdquo;.
            </p>
            {looksLikeKeywords(alt) ? (
              <p className="mt-1 text-xs text-amber-700">
                This reads like a list of keywords. Describe the picture as a sentence instead.
              </p>
            ) : null}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium" htmlFor="media-role">
                Used as
              </label>
              <select
                id="media-role"
                value={role}
                disabled={lockRole}
                onChange={(e) => setRole(e.target.value as MediaRole)}
                className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
              >
                <option value="hero">Post hero</option>
                <option value="og">Social card (1200 × 630)</option>
                <option value="inline">In an article</option>
                <option value="icon">Icon</option>
              </select>
              <p className="mt-1 text-xs text-neutral-500">{ROLE_HELP[role]}</p>
            </div>
            <div>
              <label className="block text-sm font-medium" htmlFor="media-name">
                File name
              </label>
              <input
                id="media-name"
                value={filename}
                onChange={(e) => setFilename(slugify(e.target.value) || e.target.value.toLowerCase())}
                placeholder={slugify(alt) || "lahore-smog-skin"}
                className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
              />
              <p className="mt-1 text-xs text-neutral-500">Words, not IMG_4821. Google reads it.</p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium" htmlFor="media-caption">
                Caption <span className="font-normal text-neutral-500">(optional)</span>
              </label>
              <input
                id="media-caption"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium" htmlFor="media-credit">
                Credit <span className="font-normal text-neutral-500">(optional)</span>
              </label>
              <input
                id="media-credit"
                value={credit}
                onChange={(e) => setCredit(e.target.value)}
                placeholder="Photograph: Glam Repairs"
                className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
              />
            </div>
          </div>

          {error ? <p className="text-sm text-red-700">{error}</p> : null}
          {done ? <p className="text-sm text-emerald-700">{done}</p> : null}

          <button
            type="button"
            onClick={save}
            disabled={!canSave}
            className="min-h-11 rounded-full bg-neutral-900 px-5 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            {busy ? "Uploading…" : "Save to library"}
          </button>
          {!altOk && file ? (
            <p className="text-xs text-neutral-500">Add alt text to enable saving.</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
