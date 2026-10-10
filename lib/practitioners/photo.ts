import "server-only";

import sharp from "sharp";

import { MEDIA_BUCKET } from "@/lib/studio/media";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

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
): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  let output: Buffer;
  try {
    output = await sharp(input, { failOn: "error" })
      .rotate()
      .resize(800, 1000, { fit: "cover", position: "attention" })
      .webp({ quality: 82 })
      .toBuffer();
  } catch {
    return { ok: false, error: "That image could not be read." };
  }

  const admin = createAdminSupabaseClient();
  const path = `practitioners/${profileId}/${Date.now()}.webp`;
  const { error: upError } = await admin.storage.from(MEDIA_BUCKET).upload(path, output, { contentType: "image/webp", upsert: false });
  if (upError) return { ok: false, error: "Upload failed. Please try again." };
  const { data: pub } = admin.storage.from(MEDIA_BUCKET).getPublicUrl(path);

  const { error } = await admin
    .from("practitioner_profiles")
    .update({ photo_url: pub.publicUrl, profile_photo_verified: false, updated_at: new Date().toISOString() })
    .eq("id", profileId);
  if (error) return { ok: false, error: error.message };
  return { ok: true, url: pub.publicUrl };
}
