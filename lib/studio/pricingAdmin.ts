import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import type { PlanKey } from "@/lib/plans/plansPublic";

/**
 * HOTFIX-7 §1 — "changing a price is a database update, not a deploy."
 * This is the write side of that: a super-admin-only settings-page field
 * instead of asking Talha to open the Supabase dashboard. Callers MUST
 * check `member.isSuperAdmin` themselves before calling this — it goes
 * through the service-role client, bypassing the RLS policy that would
 * otherwise enforce that same check.
 *
 * ── HANDOVER-27 §1.2 — this wrote to the wrong place ─────────────────────
 * It updated `pricing_regions.price_clarity` and `.price_transform`. Those
 * columns are now stale and nothing reads them, so the form kept working,
 * kept saying "saved", and changed nothing a visitor could see. A price
 * admin that silently no-ops is worse than not having one.
 *
 * Prices now live in `plan_prices`, one row per region per plan. This
 * upserts, so a region that has no row for a plan yet gets one rather than
 * failing — which is what happens the first time a new plan is priced.
 */
export async function updatePlanPrices(
  regionCode: string,
  prices: Partial<Record<PlanKey, number>>,
) {
  const rows = Object.entries(prices)
    .filter(([, price]) => Number.isFinite(price))
    .map(([planKey, price]) => ({
      region_code: regionCode,
      plan_key: planKey,
      price: price as number,
      updated_at: new Date().toISOString(),
    }));

  if (!rows.length) return;

  const supabase = createAdminSupabaseClient();
  const { error } = await supabase
    .from("plan_prices")
    .upsert(rows, { onConflict: "region_code,plan_key" });

  if (error) {
    throw new Error(error.message);
  }
}
