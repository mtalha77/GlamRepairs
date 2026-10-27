import "server-only";

import type SharpModule from "sharp";

import { MEDIA_BUCKET } from "@/lib/studio/media";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { inspectUpload, MAX_PIXELS } from "@/lib/uploads/inspect";

/**
 * A practitioner's public headshot — HANDOVER-52 §2.6, §4.1 step 4.
 *
 * Resized to 4:5 and stored as WebP in the public media bucket, because
 * author pages show it. Every new photograph resets
 * `profile_photo_verified`: a super admin checks it again before the
 * profile can go live.
 */
export async function storeProfilePhoto(
  profileId: string,
  input: Buffer,
  mime = "image/jpeg",
): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  // Loaded on use, never at import: every server action in a file that
  // imported this used to fail with it when the native library was missing
  // (the application decision buttons, 19 October 2026).
  // HANDOVER-59 — the bytes decide the type, and the header's size is
  // checked before anything decodes it.
  const inspection = inspectUpload({
    bytes: input,
    declaredMime: null,
    allowed: ["image/jpeg", "image/png", "image/webp"],
    maxBytes: 10 * 1024 * 1024,
  });
  if (inspection.status === "rejected" || !inspection.detectedMime) {
    return { ok: false, error: "That file is not a readable JPG, PNG or WebP image." };
  }
  mime = inspection.detectedMime;
  let output = input;
  let contentType = mime;
  let ext = mime === "image/png" ? "png" : mime === "image/webp" ? "webp" : "jpg";
  let sharp: typeof SharpModule | null = null;
  try {
    sharp = (await import("sharp")).default;
  } catch (err) {
    // Keep the photograph as uploaded rather than fail an approval over a
    // resize. It is checked by a person before it goes live either way.
    console.error("[storeProfilePhoto] sharp failed to load; storing the original", err);
  }
  if (sharp) {
    try {
      output = await sharp(input, { failOn: "error", limitInputPixels: MAX_PIXELS })
        .rotate()
        .resize(800, 1000, { fit: "cover", position: "attention" })
        .webp({ quality: 82 })
        .toBuffer();
      contentType = "image/webp";
      ext = "webp";
    } catch {
      return { ok: false, error: "That image could not be read." };
    }
  }

  const admin = createAdminSupabaseClient();
  const path = `practitioners/${profileId}/${Date.now()}.${ext}`;
  const { error: upError } = await admin.storage.from(MEDIA_BUCKET).upload(path, output, { contentType, upsert: false });
  if (upError) return { ok: false, error: "Upload failed. Please try again." };
  const { data: pub } = admin.storage.from(MEDIA_BUCKET).getPublicUrl(path);

  const { error } = await admin
    .from("practitioner_profiles")
    .update({ photo_url: pub.publicUrl, profile_photo_verified: false, updated_at: new Date().toISOString() })
    .eq("id", profileId);
  if (error) return { ok: false, error: error.message };
  return { ok: true, url: pub.publicUrl };
}
