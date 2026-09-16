import "server-only";

import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { GIFT_CODE_PREFIX, generateGiftCode } from "@/lib/gifts/giftCodes";

/**
 * Issuing, listing and retiring codes from the studio.
 *
 * ── Two kinds of code, and why manual ones are allowed ───────────────────
 * HANDOVER-28 §2.4 says "never let a human type one", and for a PERSONAL
 * gift that is right: a single-use 100% code is a bearer token, so it has to
 * be unguessable, and `generate_gift_code()` makes one with ~10^15
 * combinations.
 *
 * A campaign code is the opposite kind of object. AYESHA20 is meant to be
 * published to an influencer's whole audience — being guessable is not a
 * threat, it is the point, and a code nobody can remember or type cannot do
 * the job. So both are supported, and the difference is in the LIMITS, not
 * in the secrecy:
 *
 *   generated  single use, one named recipient, unguessable
 *   manual     many uses, published openly, bounded by maxUses and expiry
 *
 * The thing that actually protects the business is `maxUses` plus the
 * monthly free-assessment cap, both enforced in the database. A leaked
 * manual code can burn at most `maxUses` assessments; it cannot become
 * unlimited.
 *
 * ⚠️ A manual code at 100% is the risky combination: it is public AND free.
 * `requireDeliberate100` below makes the caller opt into that explicitly
 * rather than reaching it by leaving a default alone.
 */

export type GiftCodeKind = "gift" | "referral" | "promo";

export type IssueCodeInput = {
  /** Omit to auto-generate an unguessable GLAM-GIFT-XXXXXX. */
  code?: string | null;
  kind: GiftCodeKind;
  grantsPlan: string;
  /** 1–100. 100 means a free assessment. */
  discountPct: number;
  maxUses: number;
  /** Overrides pricing_settings.gift_expiry_days when set. */
  expiryDays?: number | null;
  note?: string | null;
  issuedToPerson?: string | null;
  issuedBy?: string | null;
};

export type IssueCodeResult =
  | { ok: true; code: string; expiresAt: string }
  | { ok: false; error: string };

/**
 * What a manual code may contain.
 *
 * Mirrors the database's `gift_codes_code_format_check` so the studio can
 * say what is wrong before the insert, rather than surfacing a constraint
 * name. The database is still the authority — this is the friendly copy.
 */
const MANUAL_CODE_RE = /^[A-Z0-9][A-Z0-9-]{2,22}[A-Z0-9]$/;

/** Uppercase, strip whitespace. Matches the DB's normalise trigger. */
export function normaliseManualCode(input: string): string {
  return input.trim().replace(/\s+/g, "").toUpperCase();
}

export function validateManualCode(input: string): string | null {
  const code = normaliseManualCode(input);
  if (code.length < 4) return "Codes need at least 4 characters.";
  if (code.length > 24) return "Codes can be at most 24 characters.";
  if (!MANUAL_CODE_RE.test(code)) {
    return "Use letters, numbers and dashes only, starting and ending with a letter or number.";
  }
  // Reserving the generated prefix keeps the two populations distinguishable
  // at a glance, which matters when reading a list of sixty codes. Read from
  // GIFT_CODE_PREFIX rather than typed, so it cannot drift from the string
  // generateGiftCode() actually produces.
  if (code.startsWith(GIFT_CODE_PREFIX)) {
    return `${GIFT_CODE_PREFIX} is reserved for auto-generated codes. Pick a different prefix.`;
  }
  return null;
}

/**
 * Create a code. Auto-generates when `code` is omitted.
 *
 * Every limit is enforced in the database (monthly free-assessment cap,
 * format, case-insensitive uniqueness), so this reports failures rather
 * than pre-empting them — the DB is the only place a concurrent issue can
 * be counted correctly.
 *
 * ── Why generation is retried and a typed code is not ────────────────────
 * A 23505 means two different things depending on where the code came from.
 * On a generated code it is a collision in 31^6 and the right response is to
 * roll again. On a code Talha typed it is "AYESHA20 already exists", which is
 * a fact he needs told, not something to paper over by inventing a near-miss
 * he never meant to publish.
 */
export async function issueCode(
  input: IssueCodeInput,
  opts: { confirmPublicFreeCode?: boolean } = {},
): Promise<IssueCodeResult> {
  if (input.discountPct < 1 || input.discountPct > 100) {
    return { ok: false, error: "Discount must be between 1 and 100 percent." };
  }
  if (!Number.isInteger(input.maxUses) || input.maxUses < 1) {
    return { ok: false, error: "Uses must be a whole number, at least 1." };
  }

  const manual = input.code ? normaliseManualCode(input.code) : null;

  if (manual) {
    const problem = validateManualCode(manual);
    if (problem) return { ok: false, error: problem };

    // The one combination that can actually hurt: a memorable code, published
    // openly, that costs nothing to redeem. Confirmed explicitly rather than
    // reached by leaving the discount at its default.
    if (input.discountPct >= 100 && opts.confirmPublicFreeCode !== true) {
      return {
        ok: false,
        error:
          "A code you type is one anyone can guess, and at 100% each guess is a free assessment. Tick the confirmation to issue it anyway.",
      };
    }
  }

  const supabase = createAdminSupabaseClient();
  const settings = await getGiftSettings();
  const expiryDays = input.expiryDays ?? settings.giftExpiryDays;

  if (!Number.isInteger(expiryDays) || expiryDays < 1) {
    return { ok: false, error: "Expiry must be a whole number of days, at least 1." };
  }

  const expiresAt = new Date(
    Date.now() + expiryDays * 24 * 60 * 60 * 1000,
  ).toISOString();

  // One attempt for a typed code, five for a generated one — see above.
  const attempts = manual ? 1 : 5;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const code = manual ?? generateGiftCode();

    const { data, error } = await supabase
      .from("gift_codes")
      .insert({
        code,
        kind: input.kind,
        grants_plan: input.grantsPlan,
        discount_pct: input.discountPct,
        max_uses: input.maxUses,
        uses_count: 0,
        active: true,
        expires_at: expiresAt,
        note: input.note?.trim() || null,
        issued_to_person: input.issuedToPerson || null,
        issued_by: input.issuedBy || null,
      })
      .select("code, expires_at")
      .single();

    if (!error) {
      const row = data as unknown as { code: string; expires_at: string };
      return { ok: true, code: row.code, expiresAt: row.expires_at };
    }

    /*
     * The monthly cap raises with errcode 23505, which Postgres also uses
     * for a unique violation, so the two are told apart by the message the
     * cap writes. Surfacing that message verbatim is deliberate: it already
     * names the numbers and says where to change them, which is more useful
     * than anything this layer could paraphrase.
     */
    if (error.message.includes("Monthly free assessment limit")) {
      return { ok: false, error: error.message };
    }
    if (error.message.includes("gift_codes_code_format_check")) {
      return { ok: false, error: "That code contains characters we cannot use." };
    }
    if (error.code === "23505") {
      if (manual) return { ok: false, error: `The code ${code} already exists.` };
      continue;
    }

    console.error("[issueCode]", error.message);
    return { ok: false, error: "Could not create the code." };
  }

  return {
    ok: false,
    error: "Could not create a unique code. Try again.",
  };
}

/**
 * Retire a code.
 *
 * `active = false` rather than a delete: a redeemed code is referenced by
 * `leads.gift_code_used`, so deleting one would either fail on the foreign
 * key or orphan a client's record of how they paid. Deactivating stops
 * future redemptions and changes nothing about a redemption that already
 * happened.
 */
export async function setCodeActive(
  code: string,
  active: boolean,
): Promise<{ ok: boolean; error?: string }> {
  const supabase = createAdminSupabaseClient();
  const { error } = await supabase
    .from("gift_codes")
    .update({ active })
    .eq("code", normaliseManualCode(code));

  if (error) {
    console.error("[setCodeActive]", error.message);
    return { ok: false, error: "Could not update the code." };
  }
  return { ok: true };
}

export type GiftSettings = {
  giftCodesPerMonth: number;
  giftExpiryDays: number;
  memberDiscountPct: number;
};

export async function getGiftSettings(): Promise<GiftSettings> {
  const supabase = createAdminSupabaseClient();
  const { data } = await supabase
    .from("pricing_settings")
    .select("gift_codes_per_month, gift_expiry_days, member_discount_pct")
    .maybeSingle();

  const row = data as {
    gift_codes_per_month: number;
    gift_expiry_days: number;
    member_discount_pct: number;
  } | null;

  return {
    giftCodesPerMonth: row?.gift_codes_per_month ?? 20,
    giftExpiryDays: row?.gift_expiry_days ?? 90,
    memberDiscountPct: row?.member_discount_pct ?? 10,
  };
}

/**
 * The three numbers Talha changes without a deploy.
 *
 * Bounded here as well as in the UI because a server action is reachable
 * directly. The upper bounds are sanity rails, not policy: a 3650-day expiry
 * or a 100% member discount is far more likely to be a typo than an
 * intention.
 */
export async function updateGiftSettings(
  next: Partial<GiftSettings>,
  updatedBy?: string | null,
): Promise<{ ok: boolean; error?: string }> {
  const patch: {
    gift_codes_per_month?: number;
    gift_expiry_days?: number;
    member_discount_pct?: number;
    updated_at?: string;
    updated_by?: string;
  } = {};

  if (next.giftCodesPerMonth != null) {
    if (
      !Number.isInteger(next.giftCodesPerMonth) ||
      next.giftCodesPerMonth < 0 ||
      next.giftCodesPerMonth > 10_000
    ) {
      return { ok: false, error: "Free assessments per month must be 0 to 10,000." };
    }
    patch.gift_codes_per_month = next.giftCodesPerMonth;
  }
  if (next.giftExpiryDays != null) {
    if (
      !Number.isInteger(next.giftExpiryDays) ||
      next.giftExpiryDays < 1 ||
      next.giftExpiryDays > 3650
    ) {
      return { ok: false, error: "Expiry must be between 1 and 3650 days." };
    }
    patch.gift_expiry_days = next.giftExpiryDays;
  }
  if (next.memberDiscountPct != null) {
    if (
      !Number.isFinite(next.memberDiscountPct) ||
      next.memberDiscountPct < 0 ||
      next.memberDiscountPct > 100
    ) {
      return { ok: false, error: "Member discount must be 0 to 100 percent." };
    }
    patch.member_discount_pct = next.memberDiscountPct;
  }
  if (!Object.keys(patch).length) return { ok: true };

  patch.updated_at = new Date().toISOString();
  if (updatedBy) patch.updated_by = updatedBy;

  const supabase = createAdminSupabaseClient();

  /*
   * `pricing_settings` is a singleton table, but PostgREST refuses an
   * unfiltered UPDATE — and rightly so. Reading the row's id first means the
   * update names exactly one row, rather than relying on a filter like
   * `id is not null` that would silently rewrite every row if a second one
   * were ever added.
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
    .update(patch)
    .eq("id", (existing as { id: string }).id);

  if (error) {
    console.error("[updateGiftSettings]", error.message);
    return { ok: false, error: "Could not save the settings." };
  }
  return { ok: true };
}

/*
 * Free-assessment usage is NOT computed here.
 *
 * It was, briefly, and that is precisely the bug this file's header warns
 * about in another form: two functions counting the same capacity, drifting
 * apart, one of them shown as a headline while the other is enforced on
 * insert. `getGiftCapacity` in issueGiftCode.ts is the single source, and it
 * mirrors the database cap's own maths. Import that.
 */
export { getGiftCapacity } from "@/lib/gifts/issueGiftCode";
