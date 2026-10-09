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
export const DOCUMENT_KINDS: PractitionerDocumentKind[] = ["degree", "attestation", "certificate", "registration", "id", "other"];

export type InviteFacts = { inviteId: string; email: string; kind: "practitioner" | "doctor" };

/** Empty for a wrong, expired, revoked or used token: the caller cannot tell which. */
export async function lookupInvite(token: string | null | undefined): Promise<InviteFacts | null> {
  if (!token || token.length < 32 || token.length > 128) return null;
  const { data, error } = await createAdminSupabaseClient().rpc("lookup_practitioner_invite", { p_token: token });
  if (error) {
    console.error("[lookupInvite]", error.message);
    return null;
  }
  const row = data?.[0];
  if (!row) return null;
  // One application per invite: once it has been used to apply, the link
  // is spent, even if that application is later rejected.
  const { data: used } = await createAdminSupabaseClient()
    .from("practitioner_invites")
    .select("application_id")
    .eq("id", row.invite_id)
    .maybeSingle();
  if (used?.application_id) return null;
  return { inviteId: row.invite_id, email: row.email, kind: row.kind };
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
