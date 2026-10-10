import { NextResponse } from "next/server";

import { storeProfilePhoto } from "@/lib/practitioners/photo";
import { ownPractitionerProfile } from "@/lib/practitioners/roster";
import { getStudioMember, getStudioUser } from "@/lib/studio/member";

/**
 * A practitioner's profile photograph — HANDOVER-52 §2.6, §4.1 step 4.
 *
 * The practitioner uploads her own; a super admin may upload for anyone
 * (`profileId`). Processing and storage live in `storeProfilePhoto`.
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

  const stored = await storeProfilePhoto(profileId, Buffer.from(await file.arrayBuffer()));
  if (!stored.ok) return NextResponse.json({ ok: false, error: stored.error }, { status: 400 });
  return NextResponse.json({ ok: true, url: stored.url });
}
