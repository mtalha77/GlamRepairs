import "server-only";

import { loadClientCredit, normaliseCreditEmail } from "@/lib/credits/credits";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

/**
 * A signed-in client's credit and the assessment it could pay (13 November
 * 2026). Always resolved from the account the session belongs to, never
 * from anything the browser sends.
 */
export type PendingForCredit = { id: string; finalPrice: number; currency: string; planName: string | null };

export async function pendingAssessmentFor(email: string): Promise<PendingForCredit | null> {
  const key = normaliseCreditEmail(email);
  if (!key) return null;
  const { data } = await createAdminSupabaseClient()
    .from("leads")
    .select("id, final_price, currency, plan_name, email")
    .ilike("email", key.replace(/[%_\\]/g, (c) => `\\${c}`))
    .eq("payment_status", "pending")
    .eq("funnel_complete", true)
    .eq("is_test", false)
    .is("deleted_at", null)
    .gt("final_price", 0)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!data || !data.currency || data.final_price == null) return null;
  return { id: data.id, finalPrice: Number(data.final_price), currency: data.currency, planName: data.plan_name };
}

export async function clientCreditView(email: string) {
  const [credit, pending] = await Promise.all([loadClientCredit(email), pendingAssessmentFor(email)]);
  const sameCurrency = pending ? (credit.balances.find((b) => b.currency === pending.currency)?.balance ?? 0) : 0;
  return { credit, pending, canPay: Boolean(pending && sameCurrency >= pending.finalPrice) };
}
