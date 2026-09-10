import { escapeHtml, getResendConfig } from "@/lib/email/resendClient";
import { giftCodeUrl } from "@/lib/gifts/giftCodes";

export type StudioReportEmailPayload = {
  toEmail: string;
  customerName?: string | null;
  pdf: Buffer;
  fileName: string;
  /**
   * HANDOVER-20 Part 2 — a gift code to pass on, when one was issued.
   *
   * Null whenever the programme is off or an issuing rule refused, and the
   * whole block is then omitted rather than rendered empty. The report is
   * the point of this email; the gift is an addition to it.
   */
  giftCode?: string | null;
  giftExpiresAt?: string | null;
};

export async function sendStudioReportEmail(
  payload: StudioReportEmailPayload,
): Promise<
  { ok: true; resendId: string | null } | { ok: false; message: string }
> {
  const config = getResendConfig();
  const toEmail = payload.toEmail.trim();

  if (!config) {
    return { ok: false, message: "Email is not configured." };
  }
  if (!toEmail.includes("@")) {
    return { ok: false, message: "A valid customer email is required." };
  }

  const name =
    payload.customerName?.trim() || toEmail.split("@")[0] || "there";
  const safeName = escapeHtml(name);

  /**
   * The gift block, in the client's own words rather than marketing: "send
   * them this link and their assessment is on us" is a gesture they can
   * forward, which is the whole reason a gift converts better than a
   * discount code.
   */
  const giftLink = payload.giftCode ? giftCodeUrl(payload.giftCode) : null;
  const giftValidUntil = payload.giftExpiresAt
    ? new Date(payload.giftExpiresAt).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : null;

  const giftHtml = giftLink
    ? `
        <div style="margin: 24px 0 0; padding: 16px; border: 1px solid #d6cdea; border-radius: 12px; background: #f7f2ff;">
          <p style="margin: 0 0 8px; font-weight: bold; color: #662d91;">A gift for someone you care about</p>
          <p style="margin: 0 0 8px;">Send them this link and their assessment is on us. No charge, no catch.</p>
          <p style="margin: 0 0 8px;"><a href="${escapeHtml(giftLink)}" style="color: #662d91;">${escapeHtml(giftLink)}</a></p>
          ${giftValidUntil ? `<p style="margin: 0; color: #4a4a4a; font-size: 13px;">Valid until ${escapeHtml(giftValidUntil)}.</p>` : ""}
        </div>`
    : "";

  const giftText = giftLink
    ? [
        "",
        "A gift for someone you care about",
        "Send them this link and their assessment is on us. No charge, no catch.",
        giftLink,
        ...(giftValidUntil ? [`Valid until ${giftValidUntil}.`] : []),
      ]
    : [];

  const { resend, from } = config;
  const { data, error } = await resend.emails.send({
    from,
    to: [toEmail],
    subject: "Your skin guidance report | GlamRepairs",
    html: `
      <div style="font-family: Arial, Helvetica, sans-serif; line-height: 1.65; color: #2b2b2b; max-width: 560px;">
        <p style="margin: 0 0 12px;">Hi ${safeName},</p>
        <p style="margin: 0 0 12px;">
          Your personalized skin guidance report from the GlamRepairs team is attached as a PDF.
        </p>
        <p style="margin: 0 0 12px;">
          Please read it carefully and follow the morning and night routine as written. If anything feels irritating, pause and message us.
        </p>
        ${giftHtml}
        <p style="margin: 24px 0 0; color: #4a4a4a;">
          Warm regards,<br />
          <strong style="color: #662d91;">The GlamRepairs Team</strong>
        </p>
      </div>
    `,
    text: [
      `Hi ${name},`,
      "",
      "Your personalized skin guidance report from the GlamRepairs team is attached as a PDF.",
      "Please read it carefully and follow the morning and night routine as written. If anything feels irritating, pause and message us.",
      ...giftText,
      "",
      "Warm regards,",
      "The GlamRepairs Team",
    ].join("\n"),
    attachments: [
      {
        filename: payload.fileName,
        content: payload.pdf.toString("base64"),
      },
    ],
  });

  if (error) {
    console.error("[sendStudioReportEmail]", error);
    return { ok: false, message: error.message };
  }

  return { ok: true, resendId: data?.id ?? null };
}
