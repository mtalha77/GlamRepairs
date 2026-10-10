import sharp from "sharp";
import { NextResponse } from "next/server";

import { MEDIA_BUCKET } from "@/lib/studio/media";
import { ownPractitionerProfile } from "@/lib/practitioners/roster";
import { getStudioMember, getStudioUser } from "@/lib/studio/member";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

/**
 * A practitioner's profile photograph — HANDOVER-52 §2.6, §4.1 step 4.
 *
 * The practitioner uploads her own; a super admin may upload for anyone
 * (`profileId`). Resized to a 4:5 headshot and stored as WebP in the public
 * media bucket, because author pages show it. Every new photograph resets
 * `profile_photo_verified`: a super admin checks it again before the
 * profile can go live.
 */
export const dynamic = "force-dynamic";

const MAX_INPUT_BYTES = 4_000_000;
const ACCEPTED = ["image/jpeg", "image/png", "image/webp"];

export async function POST(request: Request) {
  const user = await getStudioUser();
  if (!user) return NextResponse.json({ ok: false, error: "Not signed in." }, { status: 401 });
  const member = await getStudioMember(user.id);
  if (!member) return NextResponse.json({ ok: false, error: "Not a studio member." }, { status: 403 });

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return NextResponse.json({ ok: false, error: "Choose a photograph." }, { status: 400 });
  if (!ACCEPTED.includes(file.type)) return NextResponse.json({ ok: false, error: "JPG, PNG or WebP only." }, { status: 400 });
  if (file.size > MAX_INPUT_BYTES) return NextResponse.json({ ok: false, error: "That file is too large. Try one under 4 MB." }, { status: 400 });

  const requested = form?.get("profileId");
  let profileId: string | null = null;
  if (typeof requested === "string" && requested && member.isSuperAdmin) {
    profileId = requested;
  } else {
    profileId = (await ownPractitionerProfile(user.id))?.id ?? null;
  }
  if (!profileId) return NextResponse.json({ ok: false, error: "No practitioner profile." }, { status: 403 });

  let output: Buffer;
  try {
    output = await sharp(Buffer.from(await file.arrayBuffer()), { failOn: "error" })
      .rotate()
      .resize(800, 1000, { fit: "cover", position: "attention" })
      .webp({ quality: 82 })
      .toBuffer();
  } catch {
    return NextResponse.json({ ok: false, error: "That image could not be read." }, { status: 400 });
  }

  const admin = createAdminSupabaseClient();
  const path = `practitioners/${profileId}/${Date.now()}.webp`;
  const { error: upError } = await admin.storage.from(MEDIA_BUCKET).upload(path, output, { contentType: "image/webp", upsert: false });
  if (upError) return NextResponse.json({ ok: false, error: "Upload failed. Please try again." }, { status: 500 });
  const { data: pub } = admin.storage.from(MEDIA_BUCKET).getPublicUrl(path);

  const { error } = await admin
    .from("practitioner_profiles")
    .update({ photo_url: pub.publicUrl, profile_photo_verified: false, updated_at: new Date().toISOString() })
    .eq("id", profileId);
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, url: pub.publicUrl });
}
