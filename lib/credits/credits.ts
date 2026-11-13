import "server-only";

import { createAdminSupabaseClient } from "@/lib/supabase/admin";

/**
 * A client's credit (13 November 2026). No refunds since 10 November: where
 * a fee would have been refunded it is held as a credit (Terms, "Revisions
 * and credits"). public.client_credits is the ledger; a balance is the sum of
 * its rows per currency, and a row is never edited.
 */

export const CREDIT_REASONS = {
  medical_referral: "Referred to a doctor",
  cancelled_before_work: "Cancelled before work started",
  unable_to_complete: "We could not complete the assessment",
  appointment_cancelled: "We cancelled an appointment",
  declined: "We declined before starting",
  short_transfer: "Transfer arrived short; client did not go ahead",
  goodwill: "Goodwill",
} as const;

export type CreditReason = keyof typeof CREDIT_REASONS;
export const isCreditReason = (v: unknown): v is CreditReason => typeof v === "string" && v in CREDIT_REASONS;

export type CreditRow = {
  id: string;
  amount: number;
  currency: string;
  reason: CreditReason | "applied";
  note: string | null;
  sourceLeadId: string | null;
  appliedLeadId: string | null;
  createdAt: string;
};

export type ClientCredit = { balances: { currency: string; balance: number }[]; rows: CreditRow[] };

export const normaliseCreditEmail = (email: string | null | undefined) => (email ?? "").trim().toLowerCase();

export async function loadClientCredit(email: string | null | undefined): Promise<ClientCredit> {
  const key = normaliseCreditEmail(email);
  if (!key) return { balances: [], rows: [] };
  const { data, error } = await createAdminSupabaseClient()
    .from("client_credits" as never)
    .select("id, amount, currency, reason, note, source_lead_id, applied_lead_id, created_at")
    .eq("email", key)
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) {
    console.error("[loadClientCredit]", error.message);
    return { balances: [], rows: [] };
  }
  const rows = ((data ?? []) as Array<Record<string, unknown>>).map((r) => ({
    id: String(r.id),
    amount: Number(r.amount),
    currency: String(r.currency),
    reason: r.reason as CreditRow["reason"],
    note: (r.note as string | null) ?? null,
    sourceLeadId: (r.source_lead_id as string | null) ?? null,
    appliedLeadId: (r.applied_lead_id as string | null) ?? null,
    createdAt: String(r.created_at),
  }));
  const totals = new Map<string, number>();
  for (const r of rows) totals.set(r.currency, Math.round(((totals.get(r.currency) ?? 0) + r.amount) * 100) / 100);
  return { balances: [...totals].filter(([, b]) => b !== 0).map(([currency, balance]) => ({ currency, balance })), rows };
}

export const formatCredit = (amount: number, currency: string) =>
  `${currency} ${amount.toLocaleString("en-GB", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
