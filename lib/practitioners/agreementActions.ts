"use server";

import { isIP } from "node:net";

import { revalidatePath, updateTag } from "next/cache";
import { headers } from "next/headers";

import { sendPractitionerEmail } from "@/lib/email/sendPractitionerEmail";
import { getPublicAppUrl } from "@/lib/leads/photoShortLink";
import { DOCS_BUCKET } from "@/lib/practitioners/applications";
import { buildAgreementPdf } from "@/lib/practitioners/agreementPdf";
import {
  agreementPdfPath,
  currentAgreementVersion,
  getAgreement,
  sha256Hex,
  unfinishedMarkers,
  VERSION_PATTERN,
} from "@/lib/practitioners/agreements";
import { PRACTITIONERS_TAG } from "@/lib/practitioners/directory";
import { ownPractitionerProfile } from "@/lib/practitioners/roster";
import { requireStudioMember } from "@/lib/studio/member";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

/**
 * Practitioner agreements (Handover 66 §3, §5). Every write is here, on the
 * server, behind the guard each action calls. The service role skips RLS,
 * so these checks are the control (CLAUDE.md 3.1).
 */

export type AgreementActionResult = { ok: true; message: string } | { ok: false; error: string };

async function superAdmin() {
  const { user, member } = await requireStudioMember();
  if (!user || !member) return { error: "Not signed in." } as const;
  if (!member.isSuperAdmin) return { error: "Only a super admin can do this." } as const;
  return { userId: user.id } as const;
}

function revalidate() {
  revalidatePath("/studio/agreements");
  revalidatePath("/studio/agreement");
  revalidatePath("/studio/practitioners");
  revalidatePath("/studio/practice");
}

function clientIp(h: Headers): string | null {
  const candidates = [h.get("x-forwarded-for")?.split(",")[0], h.get("x-real-ip")];
  for (const c of candidates) {
    const ip = c?.trim();
    if (ip && isIP(ip)) return ip;
  }
  return null;
}

// ── The practitioner ─────────────────────────────────────────────────────

/**
 * Accept the agreement in force for the practitioner's track (§5.2). Works
 * for anyone with a practitioner profile and a studio sign-in, whatever
 * their approval status: a new practitioner accepts before approval (the
 * database requires it for approval), an existing one when a version is
 * published.
 *
 * Nothing about the text comes from the browser except which version they
 * were shown. The body is re-read here and hashed here; the composite key
 * in the database then refuses the row unless that hash is of a real
 * published text. The signed PDF is written before the row, so a row never
 * points at a file that does not exist.
 */
export async function acceptPractitionerAgreement(input: { version: string; agreed: boolean }): Promise<AgreementActionResult> {
  if (input.agreed !== true) return { ok: false, error: "Tick the box to accept." };
  const { user, member } = await requireStudioMember();
  if (!user || !member) return { ok: false, error: "Not signed in." };
  const profile = await ownPractitionerProfile(user.id);
  if (!profile || profile.offboarded_at) return { ok: false, error: "You do not have a practitioner profile." };

  const required = await currentAgreementVersion(profile.track);
  if (!required) return { ok: false, error: "There is no agreement to accept yet." };
  if (input.version !== required) return { ok: false, error: "A newer version has been published. Reload the page to read it." };

  const agreement = await getAgreement(required);
  if (!agreement || !agreement.published) return { ok: false, error: "That agreement is not published." };
  const hash = sha256Hex(agreement.body);
  if (hash !== agreement.body_sha256) {
    console.error("[agreement] stored hash does not match the text", required);
    return { ok: false, error: "The agreement could not be verified. Nothing was recorded. Please tell the studio." };
  }

  const admin = createAdminSupabaseClient();
  const already = async () =>
    (
      await admin
        .from("practitioner_agreement_acceptances")
        .select("id")
        .eq("practitioner_id", profile.id)
        .eq("agreement_version", required)
        .maybeSingle()
    ).data;
  if (await already()) return { ok: true, message: "You have already accepted this version." };

  const h = await headers();
  const ip = clientIp(h);
  const userAgent = h.get("user-agent")?.slice(0, 500) ?? null;
  const acceptedAt = new Date().toISOString();
  const path = agreementPdfPath(profile.id, required);

  const pdf = await buildAgreementPdf({
    title: agreement.title,
    version: agreement.version,
    body: agreement.body,
    sha256: hash,
    effectiveFrom: agreement.effective_from,
    signed: { practitionerName: profile.full_name, practitionerId: profile.id, acceptedAt, ip, userAgent },
  });

  // upsert: false, so a second click racing the first cannot replace the
  // copy the first one's row will point at.
  const { error: uploadError } = await admin.storage
    .from(DOCS_BUCKET)
    .upload(path, pdf, { contentType: "application/pdf", upsert: false });
  if (uploadError) {
    if (await already()) return { ok: true, message: "You have already accepted this version." };
    console.error("[agreement] upload", uploadError.message);
    return { ok: false, error: "Your signed copy could not be saved, so nothing was recorded. Please try again." };
  }

  const { error } = await admin.from("practitioner_agreement_acceptances").insert({
    practitioner_id: profile.id,
    agreement_version: required,
    body_sha256: hash,
    accepted_at: acceptedAt,
    accepted_ip: ip,
    user_agent: userAgent,
    pdf_path: path,
    evidence: "clickwrap",
  });
  if (error) {
    // No row, so no orphan copy either; a retry starts clean.
    await admin.storage.from(DOCS_BUCKET).remove([path]);
    if (error.message.includes("acceptance_once")) return { ok: true, message: "You have already accepted this version." };
    console.error("[agreement] insert", error.message);
    return { ok: false, error: "Your acceptance could not be recorded. Please try again." };
  }

  // Deprecated mirror, kept in step for the approved_requires_terms
  // constraint until it is removed (Handover 66 §6).
  await admin
    .from("practitioner_profiles")
    .update({ accepted_terms_at: acceptedAt, accepted_terms_version: required, updated_at: acceptedAt })
    .eq("id", profile.id);

  updateTag(PRACTITIONERS_TAG);
  revalidate();
  return { ok: true, message: `Accepted: ${required}. Your signed copy is saved on the Agreement page.` };
}

// ── Super admin ──────────────────────────────────────────────────────────

/** Create or edit an unpublished version. The database refuses edits to a published one. */
export async function saveAgreementDraft(input: {
  version: string;
  title: string;
  body: string;
  effectiveFrom: string;
}): Promise<AgreementActionResult> {
  const g = await superAdmin();
  if ("error" in g) return { ok: false, error: g.error as string };
  const version = input.version.trim();
  if (!VERSION_PATTERN.test(version)) return { ok: false, error: "Name it <track>-v<number>, for example aesthetics-v1." };
  const track = version.split("-v")[0] as "all" | "aesthetics" | "medical";
  const title = input.title.trim();
  if (title.length < 5) return { ok: false, error: "Give it a title." };
  const body = input.body.replace(/\r\n/g, "\n").trim();
  if (body.length < 500) return { ok: false, error: "The text is too short to be the agreement." };
  const from = new Date(`${input.effectiveFrom}T00:00:00Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.effectiveFrom) || Number.isNaN(from.getTime())) {
    return { ok: false, error: "Choose the date it comes into force." };
  }

  const admin = createAdminSupabaseClient();
  const existing = await getAgreement(version);
  if (existing?.published) return { ok: false, error: `${version} is published and cannot change. Save the change as the next version.` };
  const row = { track, title, body, effective_from: from.toISOString() };
  const { error } = existing
    ? await admin.from("practitioner_agreements").update(row).eq("version", version)
    : await admin.from("practitioner_agreements").insert({ ...row, version, created_by: g.userId });
  if (error) return { ok: false, error: error.message };
  revalidate();
  return { ok: true, message: `Saved ${version} as a draft. Nobody sees it until it is published.` };
}

/**
 * Publish, which freezes it for good (§3.4). The version name has to be
 * typed back, and text still carrying review notes or blanks is refused,
 * because both would be frozen into what practitioners sign.
 */
export async function publishAgreement(input: { version: string; confirm: string }): Promise<AgreementActionResult> {
  const g = await superAdmin();
  if ("error" in g) return { ok: false, error: g.error as string };
  if (input.confirm.trim() !== input.version) return { ok: false, error: `Type ${input.version} to confirm.` };
  const agreement = await getAgreement(input.version);
  if (!agreement) return { ok: false, error: "No such version." };
  if (agreement.published) return { ok: false, error: "Already published." };
  const unfinished = unfinishedMarkers(agreement.body);
  if (unfinished.length) {
    return { ok: false, error: `Not published: the text still has ${unfinished.join(" and ")}. Finish it first; a published version can never be edited.` };
  }

  const admin = createAdminSupabaseClient();
  const now = new Date();
  const { error } = await admin
    .from("practitioner_agreements")
    .update({ published: true, published_at: now.toISOString() })
    .eq("version", input.version)
    .eq("published", false);
  if (error) return { ok: false, error: error.message };

  // §5.4: tell everyone it applies to, rather than let them find it by
  // being stopped at the studio door. A link, never the document.
  const { data: practitioners } = await admin
    .from("practitioner_profiles")
    .select("id, full_name, user_id, track")
    .is("offboarded_at", null)
    .not("user_id", "is", null);
  const affected = (practitioners ?? []).filter((p) => agreement.track === "all" || p.track === agreement.track);
  const { data: prior } = await admin.from("practitioner_agreement_acceptances").select("practitioner_id");
  const hadOne = new Set((prior ?? []).map((r) => r.practitioner_id));
  let sent = 0;
  for (const p of affected) {
    const { data: u } = await admin.auth.admin.getUserById(p.user_id as string);
    const email = u?.user?.email;
    if (!email) continue;
    const res = await sendPractitionerEmail({
      kind: "agreement",
      toEmail: email,
      name: p.full_name,
      title: agreement.title,
      version: agreement.version,
      effectiveFrom: agreement.effective_from.slice(0, 10),
      reviewUrl: `${getPublicAppUrl()}/studio/agreement`,
      renewal: hadOne.has(p.id),
    });
    if (res.ok) sent += 1;
    else console.error("[agreement] email", p.id, res.message);
  }

  revalidate();
  const later = new Date(agreement.effective_from) > now;
  return {
    ok: true,
    message: `${input.version} is published and frozen. ${sent} of ${affected.length} practitioners emailed.${later ? " It applies from its in-force date." : ""}`,
  };
}

/** A draft that was never published can be thrown away. */
export async function deleteAgreementDraft(version: string): Promise<AgreementActionResult> {
  const g = await superAdmin();
  if ("error" in g) return { ok: false, error: g.error as string };
  const { error } = await createAdminSupabaseClient().from("practitioner_agreements").delete().eq("version", version).eq("published", false);
  if (error) return { ok: false, error: error.message };
  revalidate();
  return { ok: true, message: `Deleted the ${version} draft.` };
}
