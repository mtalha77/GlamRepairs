import { NextResponse } from "next/server";

import { createSignedPhotoUrl } from "@/lib/leads/signedPhotoUrl";
import { storagePathFromShortParts } from "@/lib/leads/photoShortLink";
import { getStudioMember, getStudioUser } from "@/lib/studio/member";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

type RouteContext = {
  params: Promise<{ packId: string; file: string }>;
};

/** Signed redirect stays valid long enough to load, not much longer. */
const SIGNED_URL_TTL_SECONDS = 300;

function notFound() {
  // 404, not 401/403 — an unauthenticated or unauthorized caller should not
  // be able to tell a link of this shape resolves to anything at all.
  return NextResponse.json({ error: "Not found." }, { status: 404 });
}

/**
 * Auth-gated photo redirect.
 *
 * ── What this used to be ─────────────────────────────────────────────────
 * A fully public 302 straight to a public Storage URL — a permanent,
 * un-revocable link to a client's face, generated specifically to be pasted
 * into WhatsApp messages. See the storage-lockdown handover for the full
 * writeup; this route was the actual exposure, not the public bucket flag by
 * itself (flipping the bucket alone does nothing if the app keeps minting
 * shareable links to it).
 *
 * ── What it is now ────────────────────────────────────────────────────────
 * 1. Requires a signed-in studio member — otherwise 404.
 * 2. Requires that member be a super admin, or the practitioner the lead
 *    owning this photo is assigned to — otherwise 404.
 * 3. Mints a 5-minute signed URL and redirects to that, never to a public
 *    object URL.
 *
 * The lead lookup uses the admin (service-role) client deliberately: this is
 * the authorization check itself, so it must not depend on — or be quietly
 * narrowed or widened by — whatever RLS happens to allow the signed-in
 * user's own session to see on `leads`. The `isSuperAdmin` / `assigned_to`
 * comparison right below is what actually enforces the rule.
 */
export async function GET(_request: Request, context: RouteContext) {
  const { packId, file } = await context.params;
  const storagePath = storagePathFromShortParts(packId, file);
  if (!storagePath) return notFound();

  const user = await getStudioUser();
  if (!user) return notFound();

  const member = await getStudioMember(user.id);
  if (!member) return notFound();

  const admin = createAdminSupabaseClient();
  const { data: lead, error } = await admin
    .from("leads")
    .select("id, assigned_to")
    .contains("photo_paths", [storagePath])
    .maybeSingle();

  if (error) {
    console.error("[/p route] Lead lookup failed:", error.message);
    return notFound();
  }
  if (!lead) return notFound();

  const allowed = member.isSuperAdmin || lead.assigned_to === user.id;
  if (!allowed) return notFound();

  const signedUrl = await createSignedPhotoUrl(
    storagePath,
    SIGNED_URL_TTL_SECONDS,
  );
  if (!signedUrl) {
    return NextResponse.json(
      { error: "Storage is not configured." },
      { status: 503 },
    );
  }

  return NextResponse.redirect(signedUrl, 302);
}
