import "server-only";

import { createHash } from "node:crypto";

import { createAdminSupabaseClient } from "@/lib/supabase/admin";

/**
 * Practitioner agreements (Handover 66). The database holds the guarantees:
 * the hash always matches the text, a published version is frozen, and an
 * acceptance can only point at a real published text. This file reads.
 */

export type Agreement = {
  version: string;
  track: "all" | "aesthetics" | "medical";
  title: string;
  body: string;
  body_sha256: string;
  effective_from: string;
  published: boolean;
  published_at: string | null;
  created_at: string;
};

export type AgreementStatus = {
  practitioner_id: string;
  slug: string;
  full_name: string;
  track: string;
  required_version: string | null;
  accepted_version: string | null;
  accepted_at: string | null;
  evidence: string | null;
  up_to_date: boolean;
};

export type Acceptance = {
  id: string;
  practitioner_id: string;
  agreement_version: string;
  body_sha256: string;
  accepted_at: string;
  accepted_ip: string | null;
  user_agent: string | null;
  pdf_path: string | null;
  evidence: string;
  note: string | null;
};

/** `<track>-v<n>`: no dates, which age badly and invite back-dating. */
export const VERSION_PATTERN = /^(all|aesthetics|medical)-v[1-9]\d{0,2}$/;

/** The same digest the database computes: SHA-256 of the UTF-8 body, hex. */
export const sha256Hex = (body: string) => createHash("sha256").update(body, "utf8").digest("hex");

/** Where a signed copy lives in the private practitioner-docs bucket. */
export const agreementPdfPath = (practitionerId: string, version: string) => `agreements/${practitionerId}/${version}.pdf`;

/**
 * Text that must not be frozen: the draft's own review markers and the
 * dotted blanks of a paper contract. A clickwrap version has no blanks to
 * fill per person, so anything like this left in it would be signed as is.
 */
export function unfinishedMarkers(body: string): string[] {
  const found: string[] = [];
  if (/\u{1F534}/u.test(body)) found.push("review notes marked with a red circle");
  if (/\.{6,}/.test(body)) found.push("dotted blanks to fill in");
  if (/\bnote for legal review\b|\bcounsel should\b|\bfor the accountant\b/i.test(body)) found.push("notes addressed to counsel or the accountant");
  return found;
}

const AGREEMENT_COLUMNS = "version, track, title, body, body_sha256, effective_from, published, published_at, created_at";
const STATUS_COLUMNS = "practitioner_id, slug, full_name, track, required_version, accepted_version, accepted_at, evidence, up_to_date";

export async function getAgreement(version: string): Promise<Agreement | null> {
  const { data } = await createAdminSupabaseClient().from("practitioner_agreements").select(AGREEMENT_COLUMNS).eq("version", version).maybeSingle();
  return (data as Agreement | null) ?? null;
}

export async function listAgreements(): Promise<Agreement[]> {
  const { data, error } = await createAdminSupabaseClient()
    .from("practitioner_agreements")
    .select(AGREEMENT_COLUMNS)
    .order("created_at", { ascending: false });
  if (error) console.error("[agreements] list", error.message);
  return (data ?? []) as Agreement[];
}

/** The version a practitioner on this track must have accepted, or null if none is published and in force. */
export async function currentAgreementVersion(track: string): Promise<string | null> {
  const { data, error } = await createAdminSupabaseClient().rpc("current_agreement_version", { p_track: track });
  if (error) {
    console.error("[agreements] current", error.message);
    return null;
  }
  return (data as string | null) ?? null;
}

export async function agreementStatusFor(practitionerId: string): Promise<AgreementStatus | null> {
  const { data } = await createAdminSupabaseClient()
    .from("practitioner_agreement_status")
    .select(STATUS_COLUMNS)
    .eq("practitioner_id", practitionerId)
    .maybeSingle();
  return (data as AgreementStatus | null) ?? null;
}

export async function listAgreementStatus(): Promise<AgreementStatus[]> {
  const { data } = await createAdminSupabaseClient().from("practitioner_agreement_status").select(STATUS_COLUMNS).order("full_name");
  return (data ?? []) as AgreementStatus[];
}

export async function agreementStatusMap(ids: string[]): Promise<Map<string, AgreementStatus>> {
  if (!ids.length) return new Map();
  const { data } = await createAdminSupabaseClient().from("practitioner_agreement_status").select(STATUS_COLUMNS).in("practitioner_id", ids);
  return new Map(((data ?? []) as AgreementStatus[]).map((s) => [s.practitioner_id, s]));
}

export async function listAcceptances(practitionerId?: string): Promise<Acceptance[]> {
  let q = createAdminSupabaseClient()
    .from("practitioner_agreement_acceptances")
    .select("id, practitioner_id, agreement_version, body_sha256, accepted_at, accepted_ip, user_agent, pdf_path, evidence, note")
    .order("accepted_at", { ascending: false });
  if (practitionerId) q = q.eq("practitioner_id", practitionerId);
  const { data } = await q;
  return (data ?? []) as Acceptance[];
}

/**
 * The studio gate: a practitioner whose track has a version in force that
 * they have not accepted. Null when there is nothing to accept. This covers
 * a practitioner approved yesterday exactly as it covers one who has been
 * here a year: everyone with a profile is checked on every studio page.
 */
export async function pendingAgreementForUser(userId: string): Promise<string | null> {
  const admin = createAdminSupabaseClient();
  const { data: profile } = await admin
    .from("practitioner_profiles")
    .select("id")
    .eq("user_id", userId)
    .is("offboarded_at", null)
    .maybeSingle();
  if (!profile) return null;
  const status = await agreementStatusFor(profile.id);
  return status?.required_version && !status.up_to_date ? status.required_version : null;
}
