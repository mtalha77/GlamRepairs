import { PAYMENT } from "@/lib/seo/site";

/**
 * HANDOVER-9 §1 — one builder for the payment text, so the completion
 * screen, the WhatsApp message and the confirmation email cannot drift
 * apart. The rendered UI block lives in
 * components/onboarding/PaymentDetails.tsx and reads the same constants.
 *
 * `amount` is always passed in already formatted for the client's region
 * (formatRegionPrice) — never derived here. See the note on PAYMENT.
 */
export type PaymentTextInput = {
  /** Region-formatted, e.g. "Rs. 2,000" or "$15". */
  amount?: string | null;
  /** e.g. "GR-8DDFA7". */
  reference?: string | null;
  /** e.g. "Clarity". */
  planName?: string | null;
};

/** Plain-text bank block. Used in the WhatsApp body and the email's text part. */
export function buildPaymentLines({ amount, reference }: PaymentTextInput) {
  const lines = [
    "— How to pay —",
    PAYMENT.ownerDisclosure,
    "",
    `Bank: ${PAYMENT.bank}`,
    `Title: ${PAYMENT.accountTitle}`,
    `Account: ${PAYMENT.accountNumber}`,
    `IBAN: ${PAYMENT.iban}`,
  ];
  if (amount) lines.splice(3, 0, `Amount: ${amount}`);
  if (reference) {
    lines.push(
      "",
      `Please put the reference ${reference} in the transfer note — it is how we match your payment to your assessment.`,
    );
  }
  lines.push(
    "",
    `We confirm payments within ${PAYMENT.confirmationWindow}. Once confirmed, your assessment is written and sent within 24 hours.`,
  );
  return lines.join("\n");
}

/**
 * Prefill for the "Send payment screenshot on WhatsApp" button. Written in
 * the client's voice — they are the one sending it.
 */
export function buildScreenshotPrefill({
  amount,
  reference,
  planName,
}: PaymentTextInput) {
  const lines = ["Hi Glam Repairs, I've completed my assessment."];
  if (reference) lines.push(`Reference: ${reference}`);
  if (planName) {
    lines.push(amount ? `Plan: ${planName} (${amount})` : `Plan: ${planName}`);
  }
  lines.push("Attaching my payment screenshot.");
  return lines.join("\n");
}
