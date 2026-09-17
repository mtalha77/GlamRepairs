import { escapeHtml, getResendConfig } from "@/lib/email/resendClient";
import {
  getWhatsAppChatLink,
  getWhatsAppDisplayNumber,
} from "@/lib/funnel/whatsapp";
import { leadDisplayRef } from "@/lib/leads/displayRef";
import {
  buildPaymentLines,
  buildScreenshotPrefill,
} from "@/lib/leads/paymentDetails";
import { PAYMENT } from "@/lib/seo/site";

export type PlanThankYouPayload = {
  fullName?: string | null;
  email?: string | null;
  planName?: string | null;
  planPrice?: string | null;
  selectedPlan?: string | null;
  /**
   * HANDOVER-9 §1 — used to derive the client-facing reference (GR-XXXXXX)
   * that has to appear in the bank transfer note. Without it the email can
   * still be sent, it just carries no reference.
   */
  sessionId?: string | null;
  /**
   * HANDOVER-28 §1.1 — the confirmation email is one of the four places the
   * bank block must not reach a gifted client.
   *
   * Defaults to true so a caller that has no lead row (the local/dev path)
   * behaves exactly as before. The real caller computes it with
   * `showBankDetails()` from the row the triggers produced, never from
   * anything the browser sent.
   */
  showBankDetails?: boolean;
};

/** Bank block for the HTML part. The text part uses buildPaymentLines(). */
function paymentHtml(amount: string | null, reference: string | null) {
  const row = (label: string, value: string) =>
    `<tr>
      <td style="padding: 4px 12px 4px 0; color: #6b6b6b; font-size: 14px; white-space: nowrap;">${escapeHtml(label)}</td>
      <td style="padding: 4px 0; color: #2b2b2b; font-size: 14px; font-weight: 600;">${escapeHtml(value)}</td>
    </tr>`;

  const rows = [
    row("Bank", PAYMENT.bank),
    row("Title", PAYMENT.accountTitle),
    row("Account", PAYMENT.accountNumber),
    row("IBAN", PAYMENT.iban),
    amount ? row("Amount", amount) : "",
  ].join("");

  const referenceBlock = reference
    ? `<div style="margin: 14px 0 0; padding: 12px 14px; background: #ffffff; border: 1px solid #c9a9e0; border-radius: 10px;">
         <p style="margin: 0; font-size: 11px; letter-spacing: 0.08em; text-transform: uppercase; color: #662d91; font-weight: 700;">Include this reference</p>
         <p style="margin: 6px 0 0; font-size: 20px; font-weight: 700; color: #662d91; font-family: monospace;">${escapeHtml(reference)}</p>
         <p style="margin: 6px 0 0; font-size: 13px; color: #6b6b6b;">Put it in the transfer note — it&#39;s how we match your payment to your assessment.</p>
       </div>`
    : "";

  return `
    <div style="margin: 0 0 16px; padding: 16px; background: #f6edff; border-radius: 12px;">
      <h3 style="margin: 0 0 8px; font-size: 17px; color: #662d91;">Almost done — here&#39;s how to pay</h3>
      <p style="margin: 0 0 10px; font-size: 14px;">
        ${amount ? `Transfer <strong>${escapeHtml(amount)}</strong> to the account below, then send us the screenshot on WhatsApp so we can confirm it.` : "Transfer your plan amount to the account below, then send us the screenshot on WhatsApp so we can confirm it."}
      </p>
      <p style="margin: 0 0 12px; padding: 10px 12px; background: #ece0f7; border-radius: 8px; font-size: 13px; color: #4a4a4a;">
        ${escapeHtml(PAYMENT.ownerDisclosure)}
      </p>
      <table role="presentation" cellpadding="0" cellspacing="0" style="border-collapse: collapse;">${rows}</table>
      ${referenceBlock}
      <p style="margin: 14px 0 0; font-size: 13px; color: #4a4a4a;">
        We confirm payments within ${escapeHtml(PAYMENT.confirmationWindow)}. Once confirmed, your assessment is written and sent within 24 hours.
      </p>
    </div>`;
}

/**
 * Thank the user after they complete the funnel and select a plan.
 */
export async function sendPlanThankYouEmail(
  payload: PlanThankYouPayload,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const config = getResendConfig();
  const email = payload.email?.trim();

  if (!config || !email || !email.includes("@")) {
    return { ok: false, message: "Resend is not configured or email is missing." };
  }

  const name =
    payload.fullName?.trim() ||
    email.split("@")[0] ||
    "there";
  const planName =
    payload.planName?.trim() ||
    (payload.selectedPlan
      ? payload.selectedPlan.charAt(0).toUpperCase() + payload.selectedPlan.slice(1)
      : "your selected");
  const planPrice = payload.planPrice?.trim();

  const safeName = escapeHtml(name);
  const safePlan = escapeHtml(planName);
  const safePrice = planPrice ? escapeHtml(planPrice) : null;
  const planLine = safePrice
    ? `<strong>${safePlan}</strong> (${safePrice})`
    : `<strong>${safePlan}</strong>`;
  const planLineText = planPrice
    ? `${planName} (${planPrice})`
    : planName;

  /*
   * Two independent reasons there may be nothing to pay, and both must
   * suppress the bank block.
   *
   * HANDOVER-9 §1 — the free plan is never paid for.
   * HANDOVER-28 §1.1 — a gift code covered it, so `payment_status` is
   * 'waived' and `final_price` is 0. That one is decided by the caller from
   * the lead row, because only the triggers know whether the code applied.
   */
  const isPaidPlan = Boolean(
    payload.selectedPlan && payload.selectedPlan !== "free",
  );
  const includePayment = isPaidPlan && payload.showBankDetails !== false;
  const reference = leadDisplayRef(payload.sessionId);
  const paymentBlockHtml = includePayment
    ? paymentHtml(planPrice ?? null, reference)
    : "";
  const paymentBlockText = includePayment
    ? buildPaymentLines({ amount: planPrice, reference })
    : "";

  const whatsappDisplay = getWhatsAppDisplayNumber();
  // The screenshot prefill asks for proof of a transfer. A gifted client has
  // nothing to send, so they get the plain "message us" link.
  const whatsappLink = includePayment
    ? getWhatsAppChatLink(
        buildScreenshotPrefill({
          amount: planPrice,
          reference,
          planName,
        }),
      )
    : getWhatsAppChatLink();
  const safeWhatsappDisplay = escapeHtml(whatsappDisplay);
  const safeWhatsappLink = escapeHtml(whatsappLink);

  const { resend, from } = config;

  const { error } = await resend.emails.send({
    from,
    to: [email],
    subject: `Your ${planName} plan is confirmed | GlamRepairs`,
    html: `
      <div style="font-family: Arial, Helvetica, sans-serif; line-height: 1.65; color: #2b2b2b; max-width: 560px;">
        <h2 style="color: #662d91; margin: 0 0 12px; font-size: 22px;">Hi ${safeName},</h2>
        <p style="margin: 0 0 12px;">
          Thank you for completing your skin assessment with <strong>GlamRepairs</strong>.
        </p>
        <p style="margin: 0 0 12px;">
          Your selected plan: ${planLine}
        </p>
        ${paymentBlockHtml}
        <p style="margin: 0 0 12px;">
          Our experts will carefully review your answers and photos, then share
          personalized guidance for your skin journey.
        </p>
        <p style="margin: 0 0 12px;">
          We will be in touch with you soon with the next steps.
        </p>
        <p style="margin: 0 0 12px; padding: 12px 14px; background: #f6edff; border-radius: 10px;">
          ${isPaidPlan ? "Send your payment screenshot on WhatsApp:" : "Need help? Message us on WhatsApp:"}<br />
          <a href="${safeWhatsappLink}" style="color: #662d91; font-weight: 600; text-decoration: none;">
            ${safeWhatsappDisplay}
          </a>
        </p>
        <p style="margin: 24px 0 0; color: #4a4a4a;">
          Warm regards,<br />
          <strong style="color: #662d91;">The GlamRepairs Team</strong>
        </p>
      </div>
    `,
    text: [
      `Hi ${name},`,
      "",
      "Thank you for completing your skin assessment with GlamRepairs.",
      "",
      `Your selected plan: ${planLineText}`,
      "",
      ...(paymentBlockText ? [paymentBlockText, ""] : []),
      "Our experts will carefully review your answers and photos, then share personalized guidance for your skin journey.",
      "We will be in touch with you soon with the next steps.",
      "",
      isPaidPlan
        ? `Send your payment screenshot on WhatsApp: ${whatsappDisplay}`
        : `Need help? Message us on WhatsApp: ${whatsappDisplay}`,
      whatsappLink,
      "",
      "Warm regards,",
      "The GlamRepairs Team",
    ].join("\n"),
  });

  if (error) {
    console.error("[sendPlanThankYouEmail]", error);
    return { ok: false, message: error.message };
  }

  return { ok: true };
}
