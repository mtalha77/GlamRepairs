/**
 * Whether a lead should be shown bank details — HANDOVER-28 §1.1.
 *
 * ── One rule, one file, four call sites ──────────────────────────────────
 * The handover names four places this has to hold: the completion screen,
 * the WhatsApp message body, the confirmation email, and the studio lead
 * detail. Four copies of a boolean is how three of them stay right and the
 * fourth quietly does not, which is the failure this whole handover exists
 * to clean up. So the rule is written once and imported.
 *
 * ── Why `finalPrice > 0` is part of it ───────────────────────────────────
 * It is belt and braces, and deliberately redundant. `payment_status` alone
 * would be enough if nothing ever went wrong with it — but a gifted lead is
 * exactly a row where two independent fields both say "nothing to pay", and
 * requiring both means a future bug in either one cannot leak the account
 * number on its own.
 *
 * ── What `waived` means ──────────────────────────────────────────────────
 *   pending  → awaiting a bank transfer
 *   verified → money received and confirmed
 *   waived   → nothing to pay, because a gift code covered it
 *
 * Before `waived` existed, a gifted lead sat at `pending` with
 * `final_price = 0`, so anything keyed on "pending means ask for payment"
 * showed the account, the IBAN and a screenshot request to someone who owed
 * nothing.
 */

/** The three states a lead's payment can be in. */
export type LeadPaymentStatus = "pending" | "verified" | "waived";

export function isLeadPaymentStatus(v: unknown): v is LeadPaymentStatus {
  return v === "pending" || v === "verified" || v === "waived";
}

type PaymentFacts = {
  /** Unknown or malformed values are treated as NOT pending — see below. */
  paymentStatus: string | null | undefined;
  /** `final_price` from the lead. Strings are accepted: Postgres numerics
   *  arrive as strings through PostgREST, and `Number("0.00")` is 0. */
  finalPrice: number | string | null | undefined;
};

/**
 * The only thing that may gate the bank block, the IBAN, the copy buttons
 * and the payment-screenshot request.
 *
 * Fails CLOSED. An unrecognised `payment_status`, a null, or an
 * unparseable price all return false, because the cost of wrongly hiding
 * the bank details is a client messaging to ask how to pay, and the cost of
 * wrongly showing them is billing someone for a gift.
 */
export function showBankDetails({
  paymentStatus,
  finalPrice,
}: PaymentFacts): boolean {
  const price = Number(finalPrice);
  return (
    paymentStatus === "pending" && Number.isFinite(price) && price > 0
  );
}

/** True when a gift code covered the whole assessment. */
export function isGiftedLead({
  paymentStatus,
  finalPrice,
}: PaymentFacts): boolean {
  const price = Number(finalPrice);
  return paymentStatus === "waived" || (Number.isFinite(price) && price === 0);
}

/**
 * Revenue counts `verified` and nothing else — HANDOVER-28 §1.1.
 *
 * The obvious spelling is `!== "pending"`, and it is now wrong: it would
 * count every gifted assessment as money received. `waived` rows are real
 * work and real practitioner time, so they belong in capacity and volume
 * metrics — they are simply not revenue.
 */
export function countsAsRevenue(
  paymentStatus: string | null | undefined,
): boolean {
  return paymentStatus === "verified";
}
