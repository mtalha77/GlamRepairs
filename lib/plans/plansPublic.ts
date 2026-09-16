import { createPublicSupabaseClient } from "@/lib/supabase/publicClient";

/**
 * Plans, read from `public.plans_public` — HANDOVER-27 §1.2.
 *
 * ── Why this replaces the columns in lib/pricing/regions.ts ──────────────
 * `pricing_regions` used to hold `price_free`, `price_clarity` and
 * `price_transform` as COLUMNS. Retiring Clarity and repricing Transform
 * therefore needed a schema migration, and adding a fourth plan would have
 * needed another — which is exactly the friction that made this change
 * awkward enough to be worth doing properly.
 *
 * Prices now live in `plan_prices` (region_code, plan_key, price), one row
 * per region per plan, and `plans_public` joins that to `plan_settings` and
 * `plan_features`. A plan is a row. Retiring one is `active = false`.
 *
 * ⚠️ The old `price_*` columns still exist and are now STALE. Nothing may
 * read them. They are dropped in a follow-up migration once nothing does.
 *
 * ── `features` comes from the database. Do not hardcode bullets ──────────
 * There are 14 for `transform` and 4 for `free`, already ordered by the
 * view. components/pricing/pricingPlans.ts used to carry them as a literal
 * and is gone for that reason: a feature list in code and a price in the
 * database drift the first time someone edits one and not the other, and
 * the marketing card is the copy a customer holds you to.
 *
 * ── Clarity is retired, not deleted ──────────────────────────────────────
 * Historical leads carry `selected_plan = 'clarity'` and must still resolve
 * to a label and a price. `plans_public` filters to active plans, so use
 * `listPublicPlans` for anything a VISITOR sees and `getPlanByKey` for
 * anything that renders a PAST lead. Never delete the row.
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
  price: number;
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
  currency: "PKR",
  symbol: "Rs. ",
  price: 3000,
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

/**
 * One plan by key, INCLUDING retired ones.
 *
 * This is what renders a historical lead carrying `selected_plan =
 * 'clarity'`. It reads `plan_settings` and `plan_prices` directly rather
 * than the view, because the view filters to active plans and a retired
 * plan would come back empty — which would render a past client's record
 * with a blank plan name.
 */
export async function getPlanByKey(
  regionCode: string,
  planKey: string,
): Promise<{ label: string; price: number; symbol: string } | null> {
  const supabase = createPublicSupabaseClient();
  const [settings, priceRow] = await Promise.all([
    supabase
      .from("plan_settings")
      .select("label")
      .eq("plan_key", planKey)
      .maybeSingle(),
    supabase
      .from("plan_prices")
      .select("price")
      .eq("region_code", regionCode)
      .eq("plan_key", planKey)
      .maybeSingle(),
  ]);

  if (settings.error || !settings.data) {
    if (settings.error) console.error("[getPlanByKey]", settings.error.message);
    return null;
  }

  const region = await regionSymbol(regionCode);
  return {
    label: (settings.data as { label: string }).label,
    price: Number((priceRow.data as { price: number | string } | null)?.price ?? 0),
    symbol: region,
  };
}

async function regionSymbol(regionCode: string): Promise<string> {
  const supabase = createPublicSupabaseClient();
  const { data } = await supabase
    .from("pricing_regions")
    .select("symbol")
    .eq("code", regionCode)
    .maybeSingle();
  return (data as { symbol: string } | null)?.symbol ?? "Rs. ";
}

/**
 * e.g. "Rs. 3,000" or "$22". No decimals on a whole number.
 *
 * The symbol carries its own trailing space where one belongs ("Rs. " but
 * "$"), so this concatenates rather than inserting one — that is a property
 * of the currency, stored per region, not a formatting choice to make here.
 */
export function formatPlanPrice(plan: {
  symbol: string;
  price: number;
}): string {
  const formatted = Number.isInteger(plan.price)
    ? plan.price.toLocaleString("en-US")
    : plan.price.toFixed(2);
  return `${plan.symbol}${formatted}`;
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
