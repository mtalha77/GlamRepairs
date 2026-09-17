import "server-only";

import { createAdminSupabaseClient } from "@/lib/supabase/admin";

/**
 * The gift programme's settings, read from the database — HOTFIX-29 Part 1.
 *
 * ── Why the environment variable had to go ───────────────────────────────
 * There were two switches for one thing. `GIFT_PROGRAMME_ENABLED` lived in
 * Vercel and `pricing_settings.gift_programme_enabled` lived in the
 * database, and the studio read the wrong one — so the "gift programme is
 * switched off" notice kept coming back no matter how many times the
 * database was corrected, and nobody could see why.
 *
 * A boolean with two homes is not a feature flag, it is a bug with a
 * scheduler: the next deploy that copies an environment without the key
 * silently switches the programme off again.
 *
 * The switch now lives where Talha can reach it, and the database enforces
 * it on insert, so the UI cannot be the thing that gets it wrong.
 *
 * ── Failing closed, and why that reverses here ───────────────────────────
 * The old helper defaulted to OFF, and for an environment variable that was
 * right: an unset key should not silently enable giving away capacity.
 *
 * A failed database read is a different event. It means the query broke,
 * not that anyone chose anything, and defaulting to "off" would present a
 * deliberate business decision as the explanation for an outage. So a read
 * failure returns `enabled: false` — still the safe direction — but the
 * caller is told the read failed via `ok`, so the screen can say "we could
 * not read the settings" rather than "you switched this off".
 */

export type GiftSettings = {
  enabled: boolean;
  /** NULL in the database means UNLIMITED, and null is preserved here. */
  monthlyCap: number | null;
  defaultPlan: string;
  expiryDays: number;
  memberDiscountPct: number;
  /** False when the settings could not be read at all. */
  ok: boolean;
};

/**
 * Used only when `pricing_settings.gift_expiry_days` cannot be read. The
 * real value lives in the database and is editable at Studio → Gift codes;
 * this exists so a failed read does not produce a code with no expiry at
 * all.
 */
const DEFAULT_EXPIRY_DAYS = 30;

const FALLBACK: GiftSettings = {
  enabled: false,
  monthlyCap: null,
  defaultPlan: "transform",
  expiryDays: DEFAULT_EXPIRY_DAYS,
  memberDiscountPct: 0,
  ok: false,
};

export async function getGiftSettings(): Promise<GiftSettings> {
  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase
    .from("pricing_settings")
    .select(
      "gift_programme_enabled, gift_codes_per_month, gift_default_plan, gift_expiry_days, member_discount_pct",
    )
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    console.error("[getGiftSettings]", error?.message ?? "no settings row");
    return FALLBACK;
  }

  const row = data as {
    gift_programme_enabled: boolean | null;
    gift_codes_per_month: number | null;
    gift_default_plan: string | null;
    gift_expiry_days: number | null;
    member_discount_pct: number | null;
  };

  return {
    enabled: row.gift_programme_enabled === true,
    // `?? null` rather than `?? 20`: null is a real, meaningful value here
    // (unlimited), so a default would quietly impose a cap nobody set.
    monthlyCap: row.gift_codes_per_month ?? null,
    defaultPlan: row.gift_default_plan || "transform",
    expiryDays: row.gift_expiry_days ?? DEFAULT_EXPIRY_DAYS,
    memberDiscountPct: Number(row.member_discount_pct ?? 0),
    ok: true,
  };
}

/**
 * Codes issued this calendar month, counted the way the cap trigger counts.
 *
 * ── This changed, and the change is the point ────────────────────────────
 * It has now been two different rules. The previous trigger counted
 * `sum(max_uses)` over codes at 100% — free assessments, not rows — and the
 * studio was corrected to match it. HOTFIX-29 replaced that trigger with a
 * plain `count(*)` of every code created this month, whatever its discount
 * or uses.
 *
 * So the app follows again. The rule this mirrors is
 * `private.gift_codes_issue_cap`; if that function changes, this changes
 * with it. The failure being avoided is not a wrong number in the
 * abstract — it is a headline that says "3 of 20" above a button that
 * refuses with "20 of 20".
 */
export async function countCodesThisMonth(): Promise<number | null> {
  const supabase = createAdminSupabaseClient();
  const start = new Date();
  start.setUTCDate(1);
  start.setUTCHours(0, 0, 0, 0);

  const { count, error } = await supabase
    .from("gift_codes")
    .select("code", { count: "exact", head: true })
    .gte("created_at", start.toISOString());

  if (error) {
    console.error("[countCodesThisMonth]", error.message);
    // Null means "unknown", not zero and not the cap. The caller shows a
    // dash rather than inventing a number, because the database enforces
    // the real limit regardless of what this says.
    return null;
  }
  return count ?? 0;
}

export type GiftCapacity = {
  enabled: boolean;
  cap: number | null;
  used: number | null;
  /** Null when unlimited or unknown. */
  remaining: number | null;
  settingsOk: boolean;
};

export async function getGiftCapacity(): Promise<GiftCapacity> {
  const settings = await getGiftSettings();
  // An unlimited cap makes the count a statistic rather than a limit, but it
  // is still worth showing — it is how many gifts went out this month.
  const used = await countCodesThisMonth();

  return {
    enabled: settings.enabled,
    cap: settings.monthlyCap,
    used,
    remaining:
      settings.monthlyCap == null || used == null
        ? null
        : Math.max(settings.monthlyCap - used, 0),
    settingsOk: settings.ok,
  };
}

export type GiftSettingsPatch = {
  enabled?: boolean;
  /** Null means unlimited. `undefined` means "leave it alone". */
  monthlyCap?: number | null;
  defaultPlan?: string;
  expiryDays?: number;
  memberDiscountPct?: number;
};

/**
 * Write the settings — HOTFIX-29 §3.1.
 *
 * ── `null` and `undefined` mean different things here ────────────────────
 * `undefined` is "leave this field alone"; `null` on `monthlyCap` is the
 * real value "unlimited". Collapsing the two would make the Unlimited
 * checkbox impossible to express, and saving one field would silently reset
 * the others — which is how a monthly cap becomes 0 because someone cleared
 * a box to retype it.
 *
 * Bounded here as well as in the UI because a server action is a public
 * endpoint. The upper bounds are sanity rails, not policy: a 3650-day
 * expiry is far more likely to be a typo than an intention.
 */
export async function updateGiftSettings(
  patch: GiftSettingsPatch,
  updatedBy?: string | null,
): Promise<{ ok: boolean; error?: string }> {
  const row: {
    gift_programme_enabled?: boolean;
    gift_codes_per_month?: number | null;
    gift_default_plan?: string;
    gift_expiry_days?: number;
    member_discount_pct?: number;
    updated_at?: string;
    updated_by?: string;
  } = {};

  if (patch.enabled !== undefined) row.gift_programme_enabled = patch.enabled;

  if (patch.monthlyCap !== undefined) {
    if (patch.monthlyCap !== null) {
      if (
        !Number.isInteger(patch.monthlyCap) ||
        patch.monthlyCap < 0 ||
        patch.monthlyCap > 10_000
      ) {
        return {
          ok: false,
          error: "The monthly cap must be a whole number from 0 to 10,000, or unlimited.",
        };
      }
    }
    row.gift_codes_per_month = patch.monthlyCap;
  }

  if (patch.defaultPlan !== undefined) {
    const plan = patch.defaultPlan.trim();
    if (!plan) return { ok: false, error: "Pick a default plan." };
    /*
     * Checked against the database rather than a literal list. A gift code
     * granting a retired plan is refused by `gift_codes_guard` at insert, so
     * saving one here would store a setting that breaks every future code —
     * and the error would surface at generation time, far from the cause.
     */
    const supabase = createAdminSupabaseClient();
    const { data: planRow } = await supabase
      .from("plan_settings")
      .select("plan_key")
      .eq("plan_key", plan)
      .eq("active", true)
      .maybeSingle();
    if (!planRow) {
      return {
        ok: false,
        error: `"${plan}" is not an active plan, so codes granting it would be refused.`,
      };
    }
    row.gift_default_plan = plan;
  }

  if (patch.expiryDays !== undefined) {
    if (
      !Number.isInteger(patch.expiryDays) ||
      patch.expiryDays < 1 ||
      patch.expiryDays > 3650
    ) {
      return { ok: false, error: "Expiry must be between 1 and 3650 days." };
    }
    row.gift_expiry_days = patch.expiryDays;
  }

  if (patch.memberDiscountPct !== undefined) {
    if (
      !Number.isFinite(patch.memberDiscountPct) ||
      patch.memberDiscountPct < 0 ||
      patch.memberDiscountPct > 100
    ) {
      return { ok: false, error: "Member discount must be 0 to 100 percent." };
    }
    row.member_discount_pct = patch.memberDiscountPct;
  }

  if (!Object.keys(row).length) return { ok: true };

  row.updated_at = new Date().toISOString();
  if (updatedBy) row.updated_by = updatedBy;

  const supabase = createAdminSupabaseClient();

  /*
   * `pricing_settings` is a singleton, but PostgREST refuses an unfiltered
   * UPDATE — rightly. Reading the id first means the update names exactly
   * one row, rather than relying on a filter that would rewrite every row if
   * a second one were ever added.
   */
  const { data: existing, error: readError } = await supabase
    .from("pricing_settings")
    .select("id")
    .limit(1)
    .maybeSingle();

  if (readError || !existing) {
    console.error("[updateGiftSettings] read", readError?.message);
    return { ok: false, error: "Could not find the settings row." };
  }

  const { error } = await supabase
    .from("pricing_settings")
    .update(row)
    .eq("id", (existing as { id: string }).id);

  if (error) {
    console.error("[updateGiftSettings]", error.message);
    return { ok: false, error: "Could not save the settings." };
  }
  return { ok: true };
}
