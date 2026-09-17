import "server-only";

import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { GIFT_CODE_PREFIX } from "@/lib/gifts/giftCodes";
import { getGiftSettings } from "@/lib/gifts/giftSettings";

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
  /** Omit to auto-generate an unguessable GR-XXXXX-XXXXX. */
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
  const expiryDays = input.expiryDays ?? settings.expiryDays;

  if (!Number.isInteger(expiryDays) || expiryDays < 1) {
    return { ok: false, error: "Expiry must be a whole number of days, at least 1." };
  }

  const expiresAt = new Date(
    Date.now() + expiryDays * 24 * 60 * 60 * 1000,
  ).toISOString();

  // One attempt for a typed code, five for a generated one — see above.
  const attempts = manual ? 1 : 5;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    let code = manual;
    if (!code) {
      const { data: generated, error: genError } = await supabase.rpc(
        "generate_gift_code",
      );
      if (genError || typeof generated !== "string") {
        console.error("[issueCode] generate", genError?.message);
        return { ok: false, error: "Could not generate a code." };
      }
      code = generated;
    }

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
    /*
     * Both trigger messages already name the numbers and say where to change
     * them, which beats anything this layer could paraphrase. Matched on
     * text because the cap raises 23505 — the same errcode as a genuine
     * unique violation — so the code alone cannot tell them apart.
     */
    if (
      error.message.includes("Monthly gift code limit reached") ||
      error.message.includes("gift programme is switched off")
    ) {
      return { ok: false, error: error.message };
    }
    if (error.message.includes("which is not currently offered")) {
      return {
        ok: false,
        error:
          "That code would grant a plan that is no longer offered. Pick an active plan.",
      };
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

/*
 * Settings live in lib/gifts/giftSettings.ts, not here.
 *
 * They were briefly in both files with different shapes — one defaulting
 * the monthly cap to 20, the other preserving NULL — which is how a screen
 * ends up showing a cap nobody set. Reading and writing them is one
 * module's job.
 */
