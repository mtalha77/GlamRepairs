import "server-only";

import { escapeHtml, getResendConfig } from "@/lib/email/resendClient";

/**
 * Studio password reset. The link opens a page that spends nothing until
 * the button is pressed, so an inbox scanner cannot use it up, and it works
 * for one hour.
 */
export async function sendStudioPasswordResetEmail(input: {
  toEmail: string;
  name: string | null;
  resetUrl: string;
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const config = getResendConfig();
  if (!config) return { ok: false, message: "Email is not configured." };

  const name = input.name?.trim() || "there";
  const safeUrl = escapeHtml(input.resetUrl);
  const { error } = await config.resend.emails.send({
    from: config.from,
    to: [input.toEmail],
    subject: "Reset your GlamRepairs Studio password",
    html: `
      <div style="font-family: Arial, Helvetica, sans-serif; line-height: 1.65; color: #2b2b2b; max-width: 560px;">
        <p style="margin: 0 0 12px;">Hi ${escapeHtml(name)},</p>
        <p style="margin: 0 0 12px;">Someone asked to reset the password for your GlamRepairs Studio account. If it was you, open the link below and choose a new password.</p>
        <p style="margin: 20px 0;">
          <a href="${safeUrl}" style="display: inline-block; background: #662d91; color: #ffffff; text-decoration: none; padding: 12px 22px; border-radius: 999px; font-weight: 600;">Reset my password</a>
        </p>
        <p style="margin: 0 0 12px; color: #4a4a4a; font-size: 13px;">The link works for one hour and only once. If you did not ask for this, ignore this email; your password stays as it is.</p>
        <p style="margin: 0; color: #4a4a4a; font-size: 13px;">If the button does not work, copy this link:<br />${safeUrl}</p>
      </div>
    `,
    text: [
      `Hi ${name},`,
      "",
      "Someone asked to reset the password for your GlamRepairs Studio account. If it was you, open this link and choose a new password:",
      input.resetUrl,
      "",
      "The link works for one hour and only once. If you did not ask for this, ignore this email; your password stays as it is.",
      "",
      "The GlamRepairs Team",
    ].join("\n"),
  });
  if (error) return { ok: false, message: error.message };
  return { ok: true };
}
