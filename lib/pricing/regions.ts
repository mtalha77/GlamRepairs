import type { FunnelPlanId } from "@/lib/funnel/plans";
import { ALL_PLAN_KEYS, type PlanKey } from "@/lib/plans/plansPublic";
import { createPublicSupabaseClient } from "@/lib/supabase/publicClient";

/**
 * HOTFIX-7 §1 — regional pricing, read from `public.pricing_regions`.
 *
 * Prices are fixed per region and never FX-converted at runtime — changing
 * one is a database update (via Supabase, or the studio admin field), not a
 * deploy. This module is the only place in the app that reads that table;
 * every page/step that shows or charges a price goes through it.
 *
 * ── HANDOVER-27 §1.2: prices moved out of this table ─────────────────────
 * `price_free`, `price_clarity` and `price_transform` were COLUMNS here and
 * are now STALE — they still hold 2,000 and 3,500. They are not read
 * anywhere in this file any more. `plan_prices` (one row per region per
 * plan) is the source, and every region carries the resulting map as
 * `prices`.
 *
 * Attaching the map to the region, rather than migrating each caller to an
 * async lookup, is deliberate: `priceForPlan` and `formatRegionPrice` stay
 * synchronous and every existing call site — including the two in
 * ConsentStep that write `plan_price` and `list_price` onto the lead —
 * became correct without being touched. Those two mattered most: a lead
 * recorded at a price that is not for sale is wrong money on a real record,
 * not just wrong copy on a page.
 *
 * For anything that needs labels, features or the offer window, use
 * lib/plans/plansPublic.ts instead. This module is now just "which region,
 * and what does each plan cost there".
 */

export type { FunnelPlanId };

export type PricingRegion = {
  code: string;
  label: string;
  currency: string;
  symbol: string;
  /**
   * Price per plan key, from `plan_prices`. Includes retired plans, so a
   * historical lead carrying `selected_plan = 'clarity'` still resolves to
   * the amount that client was actually quoted.
   */
  prices: Record<PlanKey, number>;
  isDefault: boolean;
};

type PricingRegionRow = {
  code: string;
  label: string;
  currency: string;
  symbol: string;
  is_default: boolean;
};

type PlanPriceRow = { region_code: string; plan_key: string; price: number | string };

// Used only if the database is unreachable — matches the DEFAULT row so a
// transient outage degrades to the same price everyone else already sees,
// never to a stale or invented number.
const FALLBACK_REGION: PricingRegion = {
  code: "DEFAULT",
  label: "International",
  currency: "USD",
  symbol: "$",
  // The current DEFAULT figures, not the old ones. A fallback quoting a
  // retired price is worse than no fallback: it looks authoritative.
  prices: { free: 0, clarity: 15, transform: 22 },
  isDefault: true,
};

const EMPTY_PRICES: Record<PlanKey, number> = {
  free: 0,
  clarity: 0,
  transform: 0,
};

function mapRow(
  row: PricingRegionRow,
  prices: Record<PlanKey, number>,
): PricingRegion {
  return {
    code: row.code,
    label: row.label,
    currency: row.currency,
    symbol: row.symbol,
    prices,
    isDefault: row.is_default,
  };
}

/** region_code -> { planKey -> price }, for the regions asked about. */
async function loadPlanPrices(
  codes: string[],
): Promise<Record<string, Record<PlanKey, number>>> {
  const supabase = createPublicSupabaseClient();
  const { data, error } = await supabase
    .from("plan_prices")
    .select("region_code,plan_key,price")
    .in("region_code", codes);

  if (error) {
    console.error("[loadPlanPrices]", error.message);
    return {};
  }

  const out: Record<string, Record<PlanKey, number>> = {};
  for (const row of (data ?? []) as PlanPriceRow[]) {
    const key = row.plan_key as PlanKey;
    if (!(ALL_PLAN_KEYS as readonly string[]).includes(key)) continue;
    out[row.region_code] ??= { ...EMPTY_PRICES };
    out[row.region_code][key] = Number(row.price);
  }
  return out;
}

/** All active regions, for the currency switcher. DEFAULT sorts last. */
export async function listActivePricingRegions(): Promise<PricingRegion[]> {
  const supabase = createPublicSupabaseClient();
  const { data, error } = await supabase
    .from("pricing_regions")
    .select("code,label,currency,symbol,is_default")
    .eq("active", true);

  if (error || !data?.length) {
    if (error) console.error("[listActivePricingRegions]", error.message);
    return [FALLBACK_REGION];
  }

  const rows = data as PricingRegionRow[];
  const priceMap = await loadPlanPrices(rows.map((r) => r.code));
  const regions = rows.map((row) =>
    mapRow(row, priceMap[row.code] ?? { ...EMPTY_PRICES }),
  );
  return regions.sort((a, b) => {
    if (a.isDefault !== b.isDefault) return a.isDefault ? 1 : -1;
    return a.code.localeCompare(b.code);
  });
}

/**
 * Resolves the region for a country code via the database's own
 * `resolve_pricing_region` function — falls back to DEFAULT for an unknown
 * or missing code, same as the SQL side. Pass `null` for "no geo signal".
 */
export async function resolvePricingRegion(
  countryCode?: string | null,
): Promise<PricingRegion> {
  const supabase = createPublicSupabaseClient();
  const { data, error } = await supabase.rpc("resolve_pricing_region", {
    p_country: countryCode ?? null,
  });

  const row = Array.isArray(data) ? data[0] : data;
  if (error || !row) {
    if (error) console.error("[resolvePricingRegion]", error.message);
    return FALLBACK_REGION;
  }
  const typed = row as PricingRegionRow;
  const priceMap = await loadPlanPrices([typed.code]);
  return mapRow(typed, priceMap[typed.code] ?? { ...EMPTY_PRICES });
}

/**
 * One region by code, regardless of where the visitor is.
 *
 * Almost everything on the site should use the visitor's own region instead.
 * The exception is a page whose *other* figures are tied to one market —
 * /compare quotes Lahore clinic fees in rupees, and putting a £12 price
 * beside them would compare nothing. Returns null when the code is unknown,
 * so the caller decides what to do rather than silently getting DEFAULT.
 */
export async function getPricingRegionByCode(
  code: string,
): Promise<PricingRegion | null> {
  const regions = await listActivePricingRegions();
  return regions.find((region) => region.code === code) ?? null;
}

export function priceForPlan(region: PricingRegion, planId: FunnelPlanId): number {
  return region.prices[planId] ?? 0;
}

/** e.g. "Rs. 3,000" or "$22" — no decimals for whole numbers. */
export function formatRegionPrice(
  region: PricingRegion,
  planId: FunnelPlanId,
): string {
  const amount = priceForPlan(region, planId);
  const formatted = Number.isInteger(amount)
    ? amount.toLocaleString("en-US")
    : amount.toFixed(2);
  return `${region.symbol}${formatted}`;
}
