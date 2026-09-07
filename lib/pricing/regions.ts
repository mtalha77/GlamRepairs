import type { FunnelPlanId } from "@/lib/funnel/plans";
import { createPublicSupabaseClient } from "@/lib/supabase/publicClient";

/**
 * HOTFIX-7 §1 — regional pricing, read from `public.pricing_regions`.
 *
 * Prices are fixed per region and never FX-converted at runtime — changing
 * one is a database update (via Supabase, or the studio admin field), not a
 * deploy. This module is the only place in the app that reads that table;
 * every page/step that shows or charges a price goes through it.
 */

export type { FunnelPlanId };

export type PricingRegion = {
  code: string;
  label: string;
  currency: string;
  symbol: string;
  priceFree: number;
  priceClarity: number;
  priceTransform: number;
  isDefault: boolean;
};

type PricingRegionRow = {
  code: string;
  label: string;
  currency: string;
  symbol: string;
  price_free: number | string;
  price_clarity: number | string;
  price_transform: number | string;
  is_default: boolean;
};

// Used only if the database is unreachable — matches the DEFAULT row so a
// transient outage degrades to the same price everyone else already sees,
// never to a stale or invented number.
const FALLBACK_REGION: PricingRegion = {
  code: "DEFAULT",
  label: "International",
  currency: "USD",
  symbol: "$",
  priceFree: 0,
  priceClarity: 15,
  priceTransform: 25,
  isDefault: true,
};

function mapRow(row: PricingRegionRow): PricingRegion {
  return {
    code: row.code,
    label: row.label,
    currency: row.currency,
    symbol: row.symbol,
    priceFree: Number(row.price_free),
    priceClarity: Number(row.price_clarity),
    priceTransform: Number(row.price_transform),
    isDefault: row.is_default,
  };
}

/** All active regions, for the currency switcher. DEFAULT sorts last. */
export async function listActivePricingRegions(): Promise<PricingRegion[]> {
  const supabase = createPublicSupabaseClient();
  const { data, error } = await supabase
    .from("pricing_regions")
    .select(
      "code,label,currency,symbol,price_free,price_clarity,price_transform,is_default",
    )
    .eq("active", true);

  if (error || !data?.length) {
    if (error) console.error("[listActivePricingRegions]", error.message);
    return [FALLBACK_REGION];
  }

  const regions = data.map(mapRow);
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
  return mapRow(row as PricingRegionRow);
}

export function priceForPlan(region: PricingRegion, planId: FunnelPlanId): number {
  if (planId === "free") return region.priceFree;
  if (planId === "clarity") return region.priceClarity;
  return region.priceTransform;
}

/** e.g. "Rs. 2,000" or "$15" — no decimals for whole numbers. */
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
