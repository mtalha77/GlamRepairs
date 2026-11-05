import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { Resend } from "resend";

import { normalizeEmailAddress } from "@/lib/email/resendClient";
import { getSupabaseServiceRoleKey, getSupabaseUrl } from "@/lib/supabase/env";

/**
 * Outreach sending config (Handovers 68 and 69).
 *
 * Cold outreach goes through its OWN Resend account: OUTREACH_RESEND_API_KEY,
 * from an address on the outreach subdomain (OUTREACH_FROM_EMAIL). Resend's
 * Acceptable Use Policy prohibits cold outreach, so an account that sends it
 * may be suspended; keeping it separate means a suspension never touches
 * assessments, payment confirmations or sign-in emails. Sending is refused
 * if the key or the domain is the transactional one.
 */

export type OutreachConfig = {
  resend: Resend;
  fromEmail: string;
  replyTo: string | null;
  webhookSecret: string | null;
};

export type OutreachConfigResult = { ok: true; config: OutreachConfig } | { ok: false; reason: string };

const domainOf = (email: string | null | undefined) => email?.split("@")[1]?.toLowerCase().replace(/>$/, "") ?? null;

export function outreachConfig(): OutreachConfigResult {
  const key = process.env.OUTREACH_RESEND_API_KEY?.trim();
  const from = normalizeEmailAddress(process.env.OUTREACH_FROM_EMAIL)?.match(/[^<\s]+@[^>\s]+/)?.[0] ?? null;
  if (!key) return { ok: false, reason: "OUTREACH_RESEND_API_KEY is not set (a separate Resend account for outreach)." };
  if (!from) return { ok: false, reason: "OUTREACH_FROM_EMAIL is not set (an address on the outreach subdomain)." };
  if (key === process.env.RESEND_API_KEY?.trim()) {
    return { ok: false, reason: "The outreach key is the transactional key. Use a separate Resend account for outreach." };
  }
  const transactionalDomain = domainOf(normalizeEmailAddress(process.env.CONTACT_FROM_EMAIL)?.match(/[^<\s]+@[^>\s]+/)?.[0]);
  if (transactionalDomain && domainOf(from) === transactionalDomain) {
    return { ok: false, reason: `Outreach must not send from ${transactionalDomain}, the domain that sends assessments and payment emails.` };
  }
  return {
    ok: true,
    config: {
      resend: new Resend(key),
      fromEmail: from,
      replyTo: normalizeEmailAddress(process.env.OUTREACH_REPLY_TO),
      webhookSecret: process.env.OUTREACH_RESEND_WEBHOOK_SECRET?.trim() || null,
    },
  };
}

/** Display name per audience: the person who signs that sequence. */
export const SENDER_NAME: Record<"practitioner" | "brand", string> = {
  practitioner: "Ayma Arif, Glam Repairs",
  brand: "Talha, Glam Repairs",
};

/**
 * The outreach tables are not in the generated Database type; this client
 * is untyped and every query in lib/outreach declares its own row shape.
 * Service role, server only, like createAdminSupabaseClient.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function outreachDb(): SupabaseClient<any, "public", any> {
  return createClient(getSupabaseUrl(), getSupabaseServiceRoleKey(), {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
