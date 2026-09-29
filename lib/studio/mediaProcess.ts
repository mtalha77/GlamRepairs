import "server-only";

import sharp from "sharp";

/**
 * Image processing for the media library — HANDOVER-45 §3.1.
 *
 * Every upload leaves here as WebP at quality 82, sized for the job it was
 * uploaded for, with its real pixel dimensions measured from the output
 * rather than trusted from the browser. `studio_media` refuses rows over
 * 500 KB or without dimensions, so this is where both are guaranteed.
 */

export type MediaRole = "hero" | "og" | "inline" | "icon";

export const MEDIA_ROLES: readonly MediaRole[] = ["hero", "og", "inline", "icon"];

/** The database CHECK is `bytes <= 500000`. */
export const MAX_MEDIA_BYTES = 500_000;

export const ACCEPTED_UPLOAD_TYPES = ["image/png", "image/jpeg", "image/webp"] as const;

export type ProcessedImage = {
  data: Buffer;
  width: number;
  height: number;
  bytes: number;
  quality: number;
};

/**
 * Resize and convert.
 *
 * - og: exactly 1200 x 630, cropped around the focal point, because social
 *   cards are cropped by every platform that shows them and a 1600px inline
 *   image sent as og:image is both oversized and mis-framed (§4.6).
 * - hero and inline: at most 1600px wide, never enlarged.
 * - icon: at most 512px on the long edge.
 *
 * Quality starts at 82. If the result is still over the 500 KB ceiling it
 * steps down twice, to 74 and then 66, before giving up, because a busy
 * photograph at 1600px can land just over the line at 82 and re-cropping is
 * a worse answer than a slightly softer file. Below 66 the loss starts to
 * show on skin texture, which is the subject of most of these images, so
 * the upload is refused and the person is asked to crop instead.
 */
export async function processImage(
  input: Buffer,
  role: MediaRole,
  focal: { x: number; y: number } = { x: 0.5, y: 0.5 },
): Promise<ProcessedImage | { error: string }> {
  let base: sharp.Sharp;
  try {
    base = sharp(input, { failOn: "error" }).rotate(); // honour EXIF orientation
    const meta = await base.metadata();
    if (!meta.width || !meta.height) return { error: "That file is not a readable image." };
  } catch {
    return { error: "That file is not a readable image." };
  }

  for (const quality of [82, 74, 66]) {
    let pipeline = base.clone();
    if (role === "og") {
      pipeline = pipeline.resize(1200, 630, {
        fit: "cover",
        position: focalGravity(focal),
      });
    } else if (role === "icon") {
      pipeline = pipeline.resize(512, 512, { fit: "inside", withoutEnlargement: true });
    } else {
      pipeline = pipeline.resize({ width: 1600, withoutEnlargement: true });
    }

    const { data, info } = await pipeline
      .webp({ quality, effort: 5 })
      .toBuffer({ resolveWithObject: true });

    if (info.size <= MAX_MEDIA_BYTES) {
      return {
        data,
        width: info.width,
        height: info.height,
        bytes: info.size,
        quality,
      };
    }
  }

  return {
    error:
      "Even after compression this image is over 500 KB. Crop it closer to " +
      "the subject, or use a less detailed photograph, and upload it again.",
  };
}

/** Map a 0..1 focal point onto sharp's nine gravity positions. */
function focalGravity({ x, y }: { x: number; y: number }): string {
  const col = x < 0.34 ? "west" : x > 0.66 ? "east" : "";
  const row = y < 0.34 ? "north" : y > 0.66 ? "south" : "";
  if (!col && !row) return "centre";
  return `${row}${col}` || "centre";
}

/**
 * A readable, slug-based filename: `lahore-smog-skin`, never `IMG_4821`
 * (§3.1.5 — Google reads filenames). Camera and screenshot defaults are
 * rejected here so the caller falls back to a name built from the alt text.
 */
export function slugifyFilename(raw: string): string {
  const slug = raw
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\.[a-z0-9]{2,5}$/, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .split("-")
    .filter(Boolean)
    .slice(0, 8)
    .join("-");
  if (!slug || /^(img|dsc|dcim|pxl|image|photo|screenshot|whatsapp)(-|$)/.test(slug)) {
    return "";
  }
  return slug.slice(0, 80).replace(/-+$/, "");
}
