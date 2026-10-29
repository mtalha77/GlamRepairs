import { formatMoney } from "@/lib/pricing/money";
import { createPublicSupabaseClient } from "@/lib/supabase/publicClient";

/**
 * Plans, read from `public.plans_public`. HANDOVER-27 §1.2, HANDOVER-62.
 *
 * The view joins `plan_settings` and `plan_features` to `country_pricing`,
 * and lists only countries open to clients. `region_code` is a country
 * code. Prices are formatted from `amountMinor` and `minorUnits` with
 * Intl (lib/pricing/money.ts); `price` exists for arithmetic only.
 *
 * The old `pricing_regions` and `plan_prices` tables are no longer read by
 * anything in the app.
 *
 * `features` comes from the database. Do not hardcode bullets: a feature
 * list in code and a price in the database drift the first time someone
 * edits one and not the other, and the marketing card is the copy a
 * customer holds you to.
 *
 * Clarity is retired, not deleted: historical leads still carry
 * `selected_plan = 'clarity'`, with their own recorded price on the lead.
 */

/** Every plan key that may appear on a lead, including retired ones. */
export const ALL_PLAN_KEYS = ["free", "clarity", "transform"] as const;
export type PlanKey = (typeof ALL_PLAN_KEYS)[number];

/** The one paid plan a visitor can buy today. */
export const PAID_PLAN_KEY: PlanKey = "transform";
export const FREE_PLAN_KEY: PlanKey = "free";

export function isPlanKey(value: unknown): value is PlanKey {
  return (
    typeof value === "string" &&
    (ALL_PLAN_KEYS as readonly string[]).includes(value)
  );
}

export type PublicPlan = {
  planKey: PlanKey;
  label: string;
  tagline: string | null;
  sortOrder: number;
  photosRequired: number;
  photosMax: number;
  includesVideoCall: boolean;
  videoMinutes: number | null;
  includesWhatsapp: boolean;
  supportDays: number | null;
  expertReview: boolean;
  /** ISO timestamp, or null for a plan with no end date. */
  availableUntil: string | null;
  /**
   * Computed by the view. False once `available_until` has passed.
   *
   * ⚠️ This is the ONLY thing that may gate the free tier. Hiding the card
   * is not enough — `?plan=free` has to be rejected at the funnel entry too,
   * or the offer stays reachable by anyone with an old link. See
   * HANDOVER-27 §1.3.
   */
  currentlyOffered: boolean;
  currency: string;
  symbol: string;
  /** Major units, for arithmetic. Never format money from this. */
  price: number;
  /** HANDOVER-62: integer minor units and the currency's decimal places. */
  amountMinor: number;
  minorUnits: number;
  /** ISO country code the price is for. */
  regionCode: string;
  /** Ordered by the view. Flat strings, not title/description pairs. */
  features: string[];
};

type PlansPublicRow = {
  plan_key: string;
  label: string;
  tagline: string | null;
  sort_order: number;
  photos_required: number;
  photos_max: number;
  includes_video_call: boolean;
  video_minutes: number | null;
  includes_whatsapp: boolean;
  support_days: number | null;
  expert_review: boolean;
  available_until: string | null;
  currently_offered: boolean;
  currency: string;
  symbol: string;
  price: number | string;
  amount_minor: number | null;
  minor_units: number | null;
  region_code: string;
  features: unknown;
};

/**
 * Used only when the database is unreachable.
 *
 * Deliberately just the paid plan, at the real PK price. A transient outage
 * degrades to "one plan, correctly priced" rather than to a stale number or
 * to no pricing at all — and it must never fall back to showing the free
 * tier, because that is a time-limited offer this code cannot verify is
 * still open.
 */
const FALLBACK_PLAN: PublicPlan = {
  planKey: "transform",
  label: "Skin Transform",
  tagline: "Everything, including a 15 minute video consultation.",
  sortOrder: 20,
  photosRequired: 3,
  photosMax: 6,
  includesVideoCall: true,
  videoMinutes: 15,
  includesWhatsapp: true,
  supportDays: 30,
  expertReview: true,
  availableUntil: null,
  currentlyOffered: true,
  // Mirrors the Pakistan row in country_pricing; see lib/pricing/regions.ts.
  currency: "PKR",
  symbol: "Rs ",
  price: 3000,
  amountMinor: 300000,
  minorUnits: 2,
  regionCode: "PK",
  features: [],
};

function mapRow(row: PlansPublicRow): PublicPlan {
  return {
    planKey: row.plan_key as PlanKey,
    label: row.label,
    tagline: row.tagline,
    sortOrder: row.sort_order,
    photosRequired: row.photos_required,
    photosMax: row.photos_max,
    includesVideoCall: row.includes_video_call,
    videoMinutes: row.video_minutes,
    includesWhatsapp: row.includes_whatsapp,
    supportDays: row.support_days,
    expertReview: row.expert_review,
    availableUntil: row.available_until,
    currentlyOffered: row.currently_offered,
    currency: row.currency,
    symbol: row.symbol,
    price: Number(row.price),
    amountMinor: row.amount_minor ?? Math.round(Number(row.price) * 100),
    minorUnits: row.minor_units ?? 2,
    regionCode: row.region_code,
    // Defensive: the view returns a JSON array, but a plan with no rows in
    // `plan_features` would map to null here and every `.map` downstream
    // would throw on a page that should simply show no bullets.
    features: Array.isArray(row.features) ? (row.features as string[]) : [],
  };
}

/**
 * Every plan a visitor may be shown, for one region, in display order.
 *
 * Note this returns plans that are ACTIVE but possibly no longer OFFERED —
 * `currently_offered` is a separate flag. The caller decides, because the
 * two cases render differently: an expired free tier disappears from the
 * pricing grid, but `/compare` may still want to describe what the paid
 * plan includes relative to it.
 */
export async function listPublicPlans(
  regionCode: string,
): Promise<PublicPlan[]> {
  const supabase = createPublicSupabaseClient();
  // `select("*")` rather than a column list: the view exists to be exactly
  // the columns a pricing surface needs, so naming them again here is a
  // second list to keep in sync — and a non-literal column string defeats
  // the generated row typing anyway.
  const { data, error } = await supabase
    .from("plans_public")
    .select("*")
    .eq("region_code", regionCode)
    .order("sort_order");

  if (error || !data?.length) {
    if (error) console.error("[listPublicPlans]", error.message);
    return [FALLBACK_PLAN];
  }
  return (data as PlansPublicRow[]).map(mapRow);
}

/** Only the plans a visitor can actually choose right now. */
export async function listOfferedPlans(
  regionCode: string,
): Promise<PublicPlan[]> {
  return (await listPublicPlans(regionCode)).filter((p) => p.currentlyOffered);
}

/** The single paid plan. Null only if the database is misconfigured. */
export async function getPaidPlan(
  regionCode: string,
): Promise<PublicPlan | null> {
  const plans = await listPublicPlans(regionCode);
  return plans.find((p) => p.planKey === PAID_PLAN_KEY) ?? null;
}

/** e.g. "Rs 3,000", "£20", "₦15,000". No decimals on a whole amount. */
export function formatPlanPrice(plan: {
  amountMinor: number;
  minorUnits: number;
  currency: string;
  regionCode?: string;
}): string {
  // HANDOVER-62 Part 4: Intl from minor units, never a symbol glued on.
  return formatMoney(plan.amountMinor, plan.currency, plan.minorUnits, plan.regionCode);
}

/**
 * "30 September" — the free tier's end date, for the urgency line.
 *
 * Formatted in Asia/Karachi on purpose. `available_until` is stored as
 * 2026-09-30T18:59:59Z, which is 23:59:59 PKT; rendered in the server's own
 * zone it would read as 30 September in Pakistan and 30 September in London
 * but 30 September at 11am in Karachi terms — and on a US server it would
 * say the wrong day entirely.
 */
export function formatOfferEndDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    timeZone: "Asia/Karachi",
  });
}
