import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

import type { PractitionerDocumentKind } from "@/lib/supabase/database.types";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

/**
 * /join, the application form — HANDOVER-51 §4.1, §4.3.
 *
 * Invite-only for now: a valid token is required to see the form and to
 * submit it. Opening it to everyone is a later step (and needs a rate limit
 * by IP as well as the one-open-application-per-email index).
 *
 * Documents go straight from the browser to the private bucket through
 * one-time signed upload URLs, which the server hands out only after the
 * invite has been checked and the terms box is ticked. Nothing touches
 * Storage before consent, and no file passes through our functions (whose
 * request size limit is below the 10 MB the bucket allows).
 */

export const MAX_FILES = 6;
export const MAX_BYTES = 10 * 1024 * 1024;
export const ALLOWED_MIME = ["application/pdf", "image/jpeg", "image/png", "image/webp"] as const;
export const DOCUMENT_KINDS: PractitionerDocumentKind[] = ["degree", "attestation", "certificate", "registration", "id", "photo", "other"];
export const PHOTO_MIME = ["image/jpeg", "image/png", "image/webp"] as const;

export type InviteFacts = {
  inviteId: string;
  email: string;
  kind: "practitioner" | "doctor";
  /** The draft this invite has started, if it has not been submitted yet. */
  applicationId: string | null;
};

/**
 * Empty for a wrong, expired or revoked token, and for one whose
 * application has been submitted: the caller cannot tell which. Until it is
 * submitted, the invite link is how the applicant gets back to their
 * draft (HANDOVER-52 §4.1: "they should come back to step 3, not step 1").
 */
export async function lookupInvite(token: string | null | undefined): Promise<InviteFacts | null> {
  if (!token || token.length < 32 || token.length > 128) return null;
  const admin = createAdminSupabaseClient();
  const { data, error } = await admin.rpc("lookup_practitioner_invite", { p_token: token });
  if (error) {
    console.error("[lookupInvite]", error.message);
    return null;
  }
  const row = data?.[0];
  if (!row) return null;
  const { data: used } = await admin
    .from("practitioner_invites")
    .select("application_id")
    .eq("id", row.invite_id)
    .maybeSingle();
  if (used?.application_id) {
    // One application per invite. Once submitted the link is spent, even
    // if that application is later rejected.
    const { data: app } = await admin
      .from("practitioner_applications")
      .select("id, submitted_at, deleted_at")
      .eq("id", used.application_id)
      .maybeSingle();
    if (!app || app.submitted_at || app.deleted_at) return null;
    return { inviteId: row.invite_id, email: row.email, kind: row.kind, applicationId: app.id };
  }
  return { inviteId: row.invite_id, email: row.email, kind: row.kind, applicationId: null };
}

export type DraftDocument = { id: string; kind: PractitionerDocumentKind; name: string };

export type Draft = {
  step: number;
  fullName: string;
  phone: string;
  city: string;
  qualification: string;
  qualificationYear: string;
  institution: string;
  years: string;
  clinics: string;
  about: string;
  portfolioUrl: string;
  regBody: string;
  regNo: string;
  payoutBank: string;
  payoutAccountTitle: string;
  payoutReference: string;
  documents: DraftDocument[];
};

export async function loadDraft(applicationId: string): Promise<Draft | null> {
  const admin = createAdminSupabaseClient();
  const { data: a } = await admin.from("practitioner_applications").select("*").eq("id", applicationId).maybeSingle();
  if (!a) return null;
  const { data: docs } = await admin
    .from("practitioner_documents")
    .select("id, kind, original_name")
    .eq("application_id", applicationId)
    .is("deleted_at", null)
    .order("created_at");
  return {
    step: a.current_step,
    fullName: a.full_name,
    phone: a.phone ?? "",
    city: a.city ?? "",
    qualification: a.qualification,
    qualificationYear: a.qualification_year ? String(a.qualification_year) : "",
    institution: a.institution ?? "",
    years: a.years_experience === null ? "" : String(a.years_experience),
    clinics: a.clinics ?? "",
    about: a.about,
    portfolioUrl: a.portfolio_url ?? "",
    regBody: a.reg_body ?? "",
    regNo: a.reg_no ?? "",
    payoutBank: a.payout_bank ?? "",
    payoutAccountTitle: a.payout_account_title ?? "",
    payoutReference: a.payout_reference ?? "",
    documents: (docs ?? []).map((d) => ({ id: d.id, kind: d.kind, name: d.original_name ?? "Document" })),
  };
}

function key(): string {
  const k = process.env.APPLICATION_LINK_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!k) throw new Error("No key available to sign application uploads.");
  return k;
}

/** Proves a /complete call comes from the browser that just created this application. */
export function signApplication(applicationId: string): string {
  return createHmac("sha256", key()).update(`application:${applicationId}`).digest("base64url");
}

export function verifyApplicationSignature(applicationId: string, signature: string): boolean {
  const expected = Buffer.from(signApplication(applicationId));
  const given = Buffer.from(signature);
  return expected.length === given.length && timingSafeEqual(expected, given);
}

export function extensionFor(mime: string): string {
  return mime === "application/pdf" ? "pdf" : mime === "image/png" ? "png" : mime === "image/webp" ? "webp" : "jpg";
}

const clip = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

export type JoinFields = {
  fullName: string;
  phone: string;
  city: string;
  qualification: string;
  years: number | null;
  clinics: string;
  about: string;
  portfolioUrl: string | null;
  regBody: string | null;
  regNo: string | null;
};

export function parseFields(body: Record<string, unknown>, kind: "practitioner" | "doctor"): JoinFields | { error: string } {
  const fullName = clip(body.fullName, 120);
  const qualification = clip(body.qualification, 200);
  const about = clip(body.about, 2000);
  const yearsRaw = typeof body.years === "number" ? body.years : Number(clip(body.years, 3));
  const years = Number.isFinite(yearsRaw) && yearsRaw >= 0 && yearsRaw <= 60 ? Math.round(yearsRaw) : null;
  let portfolioUrl: string | null = clip(body.portfolioUrl, 300) || null;
  if (portfolioUrl) {
    try {
      const u = new URL(portfolioUrl);
      if (u.protocol !== "https:" && u.protocol !== "http:") portfolioUrl = null;
    } catch {
      return { error: "The portfolio link is not a valid web address." };
    }
  }
  const regBody = clip(body.regBody, 120) || null;
  const regNo = clip(body.regNo, 60) || null;

  if (fullName.length < 3) return { error: "Please enter your full name." };
  if (qualification.length < 3) return { error: "Please enter your qualification." };
  if (years === null) return { error: "Please enter your years of practice." };
  if (about.length < 40) return { error: "Please tell us a little more about your practice (at least 40 characters)." };
  if (kind === "doctor" && (!regBody || !regNo || regNo.length < 4)) {
    return { error: "Please give your registration body and number." };
  }
  return {
    fullName,
    phone: clip(body.phone, 30),
    city: clip(body.city, 80),
    qualification,
    years,
    clinics: clip(body.clinics, 600),
    about,
    portfolioUrl,
    regBody,
    regNo,
  };
}

/** A longer-lived link that lets an applicant reopen their own application. */
export function signApplicationEdit(applicationId: string): string {
  return createHmac("sha256", key()).update(`application-edit:${applicationId}`).digest("base64url");
}

export function verifyApplicationEdit(applicationId: string, signature: string): boolean {
  const expected = Buffer.from(signApplicationEdit(applicationId));
  const given = Buffer.from(signature);
  return expected.length === given.length && timingSafeEqual(expected, given);
}

/** Fields a reviewer can flag, and how the applicant sees them. */
export const REVISION_FIELDS: Record<string, string> = {
  fullName: "Full name",
  phone: "Phone",
  city: "City",
  qualification: "Qualification",
  years: "Years of practice",
  clinics: "Clinics",
  about: "About your practice",
  portfolioUrl: "Portfolio link",
  documents: "Documents",
};

// ── The five steps (HANDOVER-52 §4.1) ──────────────────────────────────

export function parseWhoYouAre(body: Record<string, unknown>): { fullName: string; phone: string; city: string } | { error: string } {
  const fullName = clip(body.fullName, 120);
  const phone = clip(body.phone, 30);
  const city = clip(body.city, 80);
  if (fullName.length < 3) return { error: "Please enter your full name." };
  if (phone.replace(/[^\d]/g, "").length < 10) return { error: "Please enter a phone number we can reach you on." };
  if (city.length < 2) return { error: "Please enter your city." };
  return { fullName, phone, city };
}

export type QualificationFields = {
  qualification: string;
  qualificationYear: number;
  institution: string;
  years: number;
  clinics: string;
  about: string;
  portfolioUrl: string | null;
  regBody: string | null;
  regNo: string | null;
};

export function parseQualification(body: Record<string, unknown>, kind: "practitioner" | "doctor"): QualificationFields | { error: string } {
  if (!clip(body.years, 3)) return { error: "Please enter your years of practice." };
  const base = parseFields({ ...body, fullName: "placeholder" }, kind);
  if ("error" in base) return base;
  const year = Number(clip(body.qualificationYear, 4));
  const institution = clip(body.institution, 160);
  if (!Number.isInteger(year) || year < 1960 || year > new Date().getFullYear()) {
    return { error: "Please enter the year you qualified." };
  }
  if (institution.length < 3) return { error: "Please enter where you studied." };
  return {
    qualification: base.qualification,
    qualificationYear: year,
    institution,
    years: base.years ?? 0,
    clinics: base.clinics,
    about: base.about,
    portfolioUrl: base.portfolioUrl,
    regBody: base.regBody,
    regNo: base.regNo,
  };
}

/**
 * Bank name, account title and a reference: never the account number
 * (§3.1). Bank details belong in whatever you pay from, not in a table the
 * application reads on every page.
 */
export function parsePayout(body: Record<string, unknown>): { bank: string; title: string; reference: string } | { error: string } {
  const bank = clip(body.payoutBank, 80);
  const title = clip(body.payoutAccountTitle, 120);
  const reference = clip(body.payoutReference, 60);
  if (bank.length < 2) return { error: "Please enter your bank." };
  if (title.length < 3) return { error: "Please enter the account title, the name the account is in." };
  if (reference.replace(/[^\d]/g, "").length > 6 || /PK\d{2}/i.test(reference)) {
    return { error: "Please do not enter the account number or IBAN here. The last four digits are enough." };
  }
  return { bank, title, reference };
}
