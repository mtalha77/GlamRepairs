import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

import { getPublicAppUrl } from "@/lib/leads/photoShortLink";

/**
 * "Finish your assessment" links in the recovery emails (20 October 2026).
 *
 * The funnel keeps its answers in the browser, so a link opened on another
 * device used to start from nothing. The progressive save already stores the
 * answers on the lead; this signed link lets /onboarding/resume put them back.
 */

function key(): string {
  const k = process.env.APPLICATION_LINK_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!k) throw new Error("No key available to sign resume links.");
  return k;
}

export function signLeadResume(leadId: string): string {
  return createHmac("sha256", key()).update(`lead-resume:${leadId}`).digest("base64url");
}

export function verifyLeadResume(leadId: string, signature: string): boolean {
  const expected = Buffer.from(signLeadResume(leadId));
  const given = Buffer.from(signature);
  return expected.length === given.length && timingSafeEqual(expected, given);
}

export function leadResumeUrl(leadId: string): string {
  return `${getPublicAppUrl()}/onboarding/resume?l=${leadId}&s=${signLeadResume(leadId)}`;
}
