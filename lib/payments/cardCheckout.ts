import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

import { getPublicAppUrl } from "@/lib/leads/photoShortLink";
import { confirmLeadPayment } from "@/lib/payments/confirmLeadPayment";
import { cardPaymentsAvailable, createSafepayCheckout, fetchSafepayPayment, safepayConfig } from "@/lib/payments/safepay";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

/**
 * Card checkout for a lead (31 October 2026).
 *
 * The amount is the lead's own final_price, in the lead's own currency,
 * read here on the server: discounts and gifts are already applied there
 * by the database, and nothing the browser sends can change it. Every
 * attempt is a card_payments row; a lead is marked paid only after Safepay
 * confirms the tracker ended, for the amount and currency on that row.
 */

// Every currency Safepay's checkout takes has two decimal places.
const MINOR_UNITS = 2;

function linkKey(): string {
  const key = process.env.PAYMENT_LINK_SECRET || process.env.CONSULTATION_LINK_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("No key available to sign payment links.");
  return key;
}

const sign = (kind: string, id: string) => createHmac("sha256", linkKey()).update(`${kind}:${id}`).digest("base64url");

function verify(kind: string, id: string, signature: string | null | undefined): boolean {
  if (!signature) return false;
  const expected = Buffer.from(sign(kind, id));
  const given = Buffer.from(signature);
  return expected.length === given.length && timingSafeEqual(expected, given);
}

export const signCardPay = (leadId: string) => sign("card-pay", leadId);

/** A link a client can open later to pay by card (emails, studio). */
export function cardPayUrl(leadId: string): string {
  return `${getPublicAppUrl()}/pay?l=${leadId}&s=${signCardPay(leadId)}`;
}
export const verifyCardPayLink = (leadId: string, s: string | null | undefined) => verify("card-pay", leadId, s);
export const verifyReturnLink = (paymentId: string, s: string | null | undefined) => verify("card-return", paymentId, s);

type LeadForPayment = {
  id: string;
  is_test: boolean | null;
  deleted_at: string | null;
  payment_status: string;
  final_price: number | string | null;
  currency: string | null;
  plan_name: string | null;
};

async function leadForPayment(leadId: string): Promise<LeadForPayment | null> {
  const { data } = await createAdminSupabaseClient()
    .from("leads")
    .select("id, is_test, deleted_at, payment_status, final_price, currency, plan_name")
    .eq("id", leadId)
    .maybeSingle();
  return (data as LeadForPayment | null) ?? null;
}

export type CardEligibility =
  | { ok: true; amountMinor: number; currency: string; planName: string | null }
  | { ok: false; reason: "not_configured" | "not_found" | "already_paid" | "nothing_to_pay" | "currency" | "test_lead" };

/** Whether this lead can pay by card right now, and how much. */
export async function cardEligibility(leadId: string): Promise<CardEligibility> {
  const config = safepayConfig();
  if (!config) return { ok: false, reason: "not_configured" };
  const lead = await leadForPayment(leadId);
  if (!lead || lead.deleted_at) return { ok: false, reason: "not_found" };
  // A test lead may only ever reach the sandbox.
  if (lead.is_test && config.env !== "sandbox") return { ok: false, reason: "test_lead" };
  if (lead.payment_status === "verified") return { ok: false, reason: "already_paid" };
  if (lead.payment_status === "waived") return { ok: false, reason: "nothing_to_pay" };
  const price = Number(lead.final_price);
  if (!Number.isFinite(price) || price <= 0) return { ok: false, reason: "nothing_to_pay" };
  const currency = (lead.currency ?? "PKR").toUpperCase();
  if (!cardPaymentsAvailable(currency)) return { ok: false, reason: "currency" };
  return { ok: true, amountMinor: Math.round(price * 10 ** MINOR_UNITS), currency, planName: lead.plan_name };
}

/** Create a Safepay checkout for the lead and return where to send the client. */
export async function startCardCheckout(leadId: string): Promise<{ ok: true; url: string } | { ok: false; reason: string }> {
  const eligible = await cardEligibility(leadId);
  if (!eligible.ok) return { ok: false, reason: eligible.reason };
  const config = safepayConfig()!;
  const admin = createAdminSupabaseClient();

  const { data: row, error } = await admin
    .from("card_payments")
    .insert({ lead_id: leadId, environment: config.env, amount_minor: eligible.amountMinor, currency: eligible.currency })
    .select("id")
    .single();
  if (error || !row) {
    console.error("[card] insert", error?.message);
    return { ok: false, reason: "error" };
  }

  const back = `${getPublicAppUrl()}/payment/return?p=${row.id}&s=${sign("card-return", row.id)}`;
  try {
    const checkout = await createSafepayCheckout({
      reference: row.id,
      amountMinor: eligible.amountMinor,
      currency: eligible.currency,
      redirectUrl: back,
      cancelUrl: `${back}&cancelled=1`,
    });
    await admin.from("card_payments").update({ tracker: checkout.tracker, updated_at: new Date().toISOString() }).eq("id", row.id);
    return { ok: true, url: checkout.url };
  } catch (err) {
    console.error("[card] checkout", (err as Error).message);
    await admin.from("card_payments").update({ status: "failed", provider_state: "checkout_not_created", updated_at: new Date().toISOString() }).eq("id", row.id);
    return { ok: false, reason: "error" };
  }
}

export type CardPaymentRow = {
  id: string;
  lead_id: string;
  tracker: string | null;
  amount_minor: number;
  currency: string;
  status: string;
};

/**
 * Ask Safepay about a payment and, if it ended for the right amount, mark
 * the lead paid. Called by the webhook and by the return page, whichever
 * arrives first; the second call finds it already paid and does nothing.
 */
export async function settleCardPayment(row: CardPaymentRow, event?: unknown): Promise<"paid" | "pending" | "mismatch" | "error"> {
  if (row.status === "paid") return "paid";
  if (!row.tracker) return "pending";
  const admin = createAdminSupabaseClient();
  let remote;
  try {
    remote = await fetchSafepayPayment(row.tracker);
  } catch (err) {
    console.error("[card] fetch", (err as Error).message);
    return "error";
  }
  const now = new Date().toISOString();
  if (!remote.ended) {
    await admin
      .from("card_payments")
      .update({ provider_state: remote.state, updated_at: now, ...(event ? { last_event: event } : {}) })
      .eq("id", row.id);
    return "pending";
  }
  // Paid, but only counts for what we asked for. Fields Safepay did not
  // report are not held against the payment; fields it did must match.
  const amountOk = remote.amountMinor === null || remote.amountMinor === Number(row.amount_minor);
  const currencyOk = remote.currency === null || remote.currency === row.currency;
  if (!amountOk || !currencyOk) {
    console.error("[card] mismatch", row.id, remote);
    await admin
      .from("card_payments")
      .update({ status: "mismatch", provider_state: remote.state, updated_at: now, ...(event ? { last_event: event } : {}) })
      .eq("id", row.id);
    return "mismatch";
  }
  // Claim the row first, so two callers cannot both confirm it.
  const { data: claimed } = await admin
    .from("card_payments")
    .update({ status: "paid", paid_at: now, provider_state: remote.state, updated_at: now, ...(event ? { last_event: event } : {}) })
    .eq("id", row.id)
    .neq("status", "paid")
    .select("id")
    .maybeSingle();
  if (!claimed) return "paid";
  await confirmLeadPayment(row.lead_id, { actorId: null, method: "card", reference: `Safepay ${row.tracker}` });
  return "paid";
}

export async function cardPaymentById(id: string): Promise<CardPaymentRow | null> {
  const { data } = await createAdminSupabaseClient()
    .from("card_payments")
    .select("id, lead_id, tracker, amount_minor, currency, status")
    .eq("id", id)
    .maybeSingle();
  return (data as CardPaymentRow | null) ?? null;
}

export async function cardPaymentByTracker(tracker: string): Promise<CardPaymentRow | null> {
  const { data } = await createAdminSupabaseClient()
    .from("card_payments")
    .select("id, lead_id, tracker, amount_minor, currency, status")
    .eq("tracker", tracker)
    .maybeSingle();
  return (data as CardPaymentRow | null) ?? null;
}

/** The client left Safepay's page without paying. */
export async function markCardPaymentCancelled(id: string) {
  await createAdminSupabaseClient()
    .from("card_payments")
    .update({ status: "cancelled", updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("status", "created");
}
