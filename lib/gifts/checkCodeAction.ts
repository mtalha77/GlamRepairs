"use server";

import { headers } from "next/headers";

import { checkGiftCode } from "@/lib/gifts/issueGiftCode";
import {
  normaliseGiftCode,
  type GiftCheckReason,
} from "@/lib/gifts/giftCodes";

/**
 * Check a typed code from the funnel — HANDOVER-28 §2.1.
 *
 * ── What crosses the wire, and what does not ─────────────────────────────
 * §2.2: "Never send a price, a discount percentage or a payment status from
 * the browser." This returns `discountPct` for DISPLAY — so the reader can
 * be told whether the code covers the assessment or takes 20% off — and the
 * browser never sends it anywhere. The lead insert carries the code string
 * alone, and `lead_zz_gift_redeem` recomputes the price in the database from
 * the code's own row. A tampered response changes what the page says, not
 * what anyone is charged.
 *
 * ── Rate limiting is the database's job, not this file's ─────────────────
 * A generated code is a bearer token, so an unthrottled checker is an
 * enumeration oracle. An in-memory counter here would be per-instance, and
 * serverless spreads requests across instances — it would look like a limit
 * and not be one.
 *
 * `check_gift_code`'s three-argument overload already does this properly:
 * eight failures per caller per fifteen minutes, counted in
 * `gift_code_attempts`, shared across every instance because it is a table.
 * All this function owes it is a stable caller key.
 */

export type GiftFieldResult = {
  /** Normalised, ready to store. Null when nothing usable was typed. */
  code: string | null;
  reason: GiftCheckReason | "empty" | "error";
  discountPct: number | null;
};

export async function checkGiftCodeAction(
  raw: string,
): Promise<GiftFieldResult> {
  const code = normaliseGiftCode(raw ?? "");
  if (!code) return { code: null, reason: "empty", discountPct: null };

  const headerList = await headers();
  /*
   * The caller key for the database's rate limit. A shared or missing value
   * would put every anonymous visitor in one bucket, where eight bad guesses
   * anywhere lock out everybody — so an unresolvable IP gets its own random
   * bucket rather than joining a common one.
   */
  const ip =
    headerList.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headerList.get("x-real-ip") ||
    `unidentified-${crypto.randomUUID()}`;

  try {
    // `personKey` is null: at this point in the funnel nobody has told us who
    // they are yet. `self_redemption` and `already_gifted` both need identity
    // and are checked again on insert, where it is known.
    const result = await checkGiftCode(code, null, ip);
    return {
      code: result.valid ? code : null,
      reason: result.reason,
      discountPct: result.discountPct,
    };
  } catch (error) {
    console.error("[checkGiftCodeAction]", error);
    return { code: null, reason: "error", discountPct: null };
  }
}
