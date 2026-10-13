import { createHash } from "node:crypto";

import { NextResponse } from "next/server";

import { sendPractitionerEmail } from "@/lib/email/sendPractitionerEmail";
import { getPublicAppUrl } from "@/lib/leads/photoShortLink";
import { OPEN_STATUSES } from "@/lib/practitioners/applications";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

/**
 * "Apply in 5 minutes" — the applicant asks for their own application link.
 *
 * The link is emailed rather than opened straight away, so the address is
 * proven before anything is stored, and the same link is how they come
 * back. Asking again reattaches an unfinished draft to the new link, so
 * progress is never lost. The reply never says whether an address is
 * already known.
 */
export const dynamic = "force-dynamic";

const PER_EMAIL_PER_DAY = 3;
const PER_NETWORK_PER_DAY = 10;
const LINK_DAYS = 7;
const DONE = { ok: true, message: "Check your inbox. If you can apply, your link is on its way." };

function networkHash(request: Request): string | null {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "";
  if (!ip) return null;
  const salt = process.env.APPLICATION_LINK_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  return createHash("sha256").update(`${salt}:${ip}`).digest("hex").slice(0, 32);
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { email?: unknown; name?: unknown } | null;
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase().slice(0, 200) : "";
  const name = typeof body?.name === "string" ? body.name.trim().slice(0, 120) : "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ ok: false, error: "Please enter a valid email address." }, { status: 422 });
  }

  const admin = createAdminSupabaseClient();
  const since = new Date(Date.now() - 86_400_000).toISOString();
  const ipHash = networkHash(request);
  const [{ count: byEmail }, { count: byNetwork }] = await Promise.all([
    admin.from("practitioner_invites").select("id", { count: "exact", head: true }).eq("source", "self").eq("email", email).gte("created_at", since),
    ipHash
      ? admin.from("practitioner_invites").select("id", { count: "exact", head: true }).eq("requested_ip_hash", ipHash).gte("created_at", since)
      : Promise.resolve({ count: 0 }),
  ]);
  if ((byEmail ?? 0) >= PER_EMAIL_PER_DAY || (byNetwork ?? 0) >= PER_NETWORK_PER_DAY) {
    return NextResponse.json(
      { ok: false, error: "We have already sent a few links today. Please check your inbox and spam folder, or try again tomorrow." },
      { status: 429 },
    );
  }

  const { data: apps } = await admin
    .from("practitioner_applications")
    .select("id, status, submitted_at")
    .eq("email", email)
    .is("deleted_at", null);
  // Already applied and still open: nothing to send, and nothing to say.
  if ((apps ?? []).some((a) => a.submitted_at && OPEN_STATUSES.includes(a.status))) return NextResponse.json(DONE);
  const draft = (apps ?? []).find((a) => !a.submitted_at);

  const { data, error } = await admin.rpc("issue_practitioner_invite", {
    p_email: email,
    p_kind: "practitioner",
    p_by: null,
    p_note: "Requested from /join",
    p_days: LINK_DAYS,
  });
  const issued = data?.[0];
  if (error || !issued) {
    console.error("[api/join/start]", error?.message);
    return NextResponse.json({ ok: false, error: "Something went wrong. Please try again." }, { status: 500 });
  }
  await admin
    .from("practitioner_invites")
    .update({ source: "self", requested_ip_hash: ipHash, ...(draft ? { application_id: draft.id } : {}) })
    .eq("id", issued.invite_id);

  const sent = await sendPractitionerEmail({
    kind: "continue",
    toEmail: email,
    name: name || null,
    joinUrl: `${getPublicAppUrl()}/join/apply?token=${encodeURIComponent(issued.token)}`,
    expiresAt: new Date(Date.now() + LINK_DAYS * 86_400_000).toISOString(),
  });
  if (!sent.ok) {
    console.error("[api/join/start] email", sent.message);
    return NextResponse.json({ ok: false, error: "We could not send the email. Please try again in a few minutes." }, { status: 502 });
  }
  return NextResponse.json(DONE);
}
