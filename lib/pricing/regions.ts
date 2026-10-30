import type { FunnelPlanId } from "@/lib/funnel/plans";
import { formatMoney } from "@/lib/pricing/money";
import { ALL_PLAN_KEYS, type PlanKey } from "@/lib/plans/plansPublic";
import { createPublicSupabaseClient } from "@/lib/supabase/publicClient";

/**
 * Which market a visitor buys in, and what each plan costs there.
 *
 * HANDOVER-62: the source is `country_pricing`, read through `plans_public`,
 * which lists only countries open to clients. The old five-region tables
 * (`pricing_regions`, `plan_prices`) disagreed with it and are no longer
 * read anywhere in the app. A "region" is now a country: its code is the
 * ISO country code, and its prices are integers in minor units with the
 * country's own decimal places.
 *
 * Only countries with `clients_enabled` appear, and the database refuses
 * that flag without a real price and a payment method. So a visitor can
 * never be shown a price nobody can pay (Part 1). Today that is Pakistan
 * alone, and everyone, wherever they are, is quoted in rupees.
 *
 * Prices are never FX-converted. Changing one is an edit in Studio →
 * Countries, not a deploy.
 */

export type { FunnelPlanId };

export type PricingRegion = {
  /** ISO country code. */
  code: string;
  label: string;
  currency: string;
  symbol: string;
  /** Decimal places for this currency: 2 mostly, 3 for KWD/BHD/OMR, 0 for JPY. */
  minorUnits: number;
  /** Price per plan key, in major units, for arithmetic that already expects it. */
  prices: Record<PlanKey, number>;
  /** Price per plan key, in minor units. What formatting reads. */
  pricesMinor: Record<PlanKey, number>;
  isDefault: boolean;
};

export const DEFAULT_COUNTRY = "PK";

/** The price shown to visitors from a country without its own price. */
export const INTERNATIONAL_COUNTRY = "US";

type PlanRow = {
  plan_key: string;
  region_code: string;
  currency: string;
  symbol: string;
  amount_minor: number | null;
  minor_units: number | null;
};

const EMPTY: Record<PlanKey, number> = { free: 0, clarity: 0, transform: 0 };

/*
 * Used only if the database is unreachable. It mirrors the Pakistan row in
 * country_pricing, because the funnel writes the quoted price onto the lead
 * and a lead recorded at an invented price is wrong money on a real record.
 * country_pricing remains the source; if the Pakistan price changes there,
 * change it here too.
 */
const FALLBACK_REGION: PricingRegion = {
  code: DEFAULT_COUNTRY,
  label: "Pakistan",
  currency: "PKR",
  symbol: "Rs ",
  minorUnits: 2,
  prices: { free: 0, clarity: 0, transform: 3000 },
  pricesMinor: { free: 0, clarity: 0, transform: 300000 },
  isDefault: true,
};

function countryName(code: string) {
  try {
    return new Intl.DisplayNames(["en"], { type: "region" }).of(code) ?? code;
  } catch {
    return code;
  }
}

/** Every country open to clients, the default first. */
export async function listActivePricingRegions(): Promise<PricingRegion[]> {
  const { data, error } = await createPublicSupabaseClient()
    .from("plans_public")
    .select("plan_key,region_code,currency,symbol,amount_minor,minor_units");
  if (error || !data?.length) {
    if (error) console.error("[listActivePricingRegions]", error.message);
    return [FALLBACK_REGION];
  }
  const byCode = new Map<string, PricingRegion>();
  for (const row of data as PlanRow[]) {
    const key = row.plan_key as PlanKey;
    if (!(ALL_PLAN_KEYS as readonly string[]).includes(key)) continue;
    const minorUnits = row.minor_units ?? 2;
    const region =
      byCode.get(row.region_code) ??
      ({
        code: row.region_code,
        label: countryName(row.region_code),
        currency: row.currency,
        symbol: row.symbol,
        minorUnits,
        prices: { ...EMPTY },
        pricesMinor: { ...EMPTY },
        isDefault: row.region_code === DEFAULT_COUNTRY,
      } satisfies PricingRegion);
    region.pricesMinor[key] = row.amount_minor ?? 0;
    region.prices[key] = (row.amount_minor ?? 0) / 10 ** minorUnits;
    byCode.set(row.region_code, region);
  }
  return [...byCode.values()].sort((a, b) => {
    if (a.isDefault !== b.isDefault) return a.isDefault ? -1 : 1;
    return a.label.localeCompare(b.label);
  });
}

/**
 * The region for a country code. A country not open to clients, or no code
 * at all, resolves to the default, so the visitor is quoted a price that can
 * actually be paid.
 */
export async function resolvePricingRegion(countryCode?: string | null): Promise<PricingRegion> {
  const regions = await listActivePricingRegions();
  const code = (countryCode ?? "").toUpperCase();
  // A country with no price of its own is quoted in US dollars rather than
  // rupees: an anchor price chosen for international visitors, never an FX
  // conversion (Talha, 29 October 2026).
  const international = code && code !== DEFAULT_COUNTRY ? regions.find((r) => r.code === INTERNATIONAL_COUNTRY) : undefined;
  return (
    regions.find((r) => r.code === code) ??
    international ??
    regions.find((r) => r.isDefault) ??
    regions[0] ??
    FALLBACK_REGION
  );
}

/**
 * One region by code, regardless of where the visitor is. /compare quotes
 * Lahore clinic fees in rupees, so it asks for Pakistan explicitly. Null
 * when the code is not open to clients.
 */
export async function getPricingRegionByCode(code: string): Promise<PricingRegion | null> {
  const regions = await listActivePricingRegions();
  return regions.find((region) => region.code === code) ?? null;
}

export function priceForPlan(region: PricingRegion, planId: FunnelPlanId): number {
  return region.prices[planId] ?? 0;
}

/** e.g. "Rs 3,000", "£20", "₦15,000": Intl, from minor units. */
export function formatRegionPrice(region: PricingRegion, planId: FunnelPlanId): string {
  return formatMoney(region.pricesMinor[planId] ?? 0, region.currency, region.minorUnits, region.code);
}
