import { createAdminSupabaseClient } from "@/lib/supabase/admin";

/**
 * HOTFIX-7 §1 — "changing a price is a database update, not a deploy."
 * This is the write side of that: a super-admin-only settings-page field
 * instead of asking Talha to open the Supabase dashboard. Callers MUST
 * check `member.isSuperAdmin` themselves before calling this — it goes
 * through the service-role client, bypassing the RLS policy that would
 * otherwise enforce that same check.
 */
export async function updatePricingRegionPrices(
  code: string,
  prices: { clarity: number; transform: number },
) {
  const supabase = createAdminSupabaseClient();
  const { error } = await supabase
    .from("pricing_regions")
    .update({
      price_clarity: prices.clarity,
      price_transform: prices.transform,
      updated_at: new Date().toISOString(),
    })
    .eq("code", code);

  if (error) {
    throw new Error(error.message);
  }
}
