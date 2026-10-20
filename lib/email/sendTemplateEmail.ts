import "server-only";

import { renderMarkdown } from "@/lib/blog/markdown";
import { logClientEmail } from "@/lib/email/logClientEmail";
import { escapeHtml, getResendConfig } from "@/lib/email/resendClient";
import { getWhatsAppDisplayNumber } from "@/lib/funnel/whatsapp";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

/**
 * Emails written in Studio, not in code — the email_templates rows (19
 * October 2026): the abandonment sequence, the 15 and 30 day follow-ups.
 * Each is markdown with {{placeholders}}, wrapped with the signature and
 * footer from email_settings, sent, and logged on the client's record.
 *
 * Placeholders are filled from plain values and escaped by the markdown
 * renderer, so a client's own name cannot inject markup into the email.
 */

const BRAND = "#662d91";

export type TemplateKey = "abandon_1" | "abandon_2" | "abandon_final" | "followup_15" | "followup_30";

function fill(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, name: string) => vars[name] ?? "");
}

export async function sendTemplateEmail(input: {
  key: TemplateKey;
  leadId: string;
  toEmail: string;
  fullName: string | null;
  vars?: Record<string, string>;
}): Promise<{ ok: true; subject: string; text: string; resendId: string | null } | { ok: false; message: string }> {
  const config = getResendConfig();
  if (!config) return { ok: false, message: "Email is not configured." };
  const admin = createAdminSupabaseClient();
  const [{ data: template }, { data: settings }] = await Promise.all([
    admin.from("email_templates").select("subject, body_markdown, active").eq("key", input.key).maybeSingle(),
    admin.from("email_settings").select("signature_markdown, footer_markdown, reply_to").eq("id", 1).maybeSingle(),
  ]);
  if (!template) return { ok: false, message: `No template "${input.key}".` };
  if (!template.active) return { ok: false, message: `Template "${input.key}" is switched off.` };

  // Markdown characters out of the name, so "[x](link)" cannot become a link.
  const firstName = (input.fullName?.trim().split(/\s+/)[0] ?? "").replace(/[[\]()*_`#<>!]/g, "") || "there";
  const vars = { first_name: firstName, whatsapp: getWhatsAppDisplayNumber(), ...input.vars };
  const subject = fill(template.subject, vars).replace(/[\r\n]+/g, " ").trim();
  const body = fill(template.body_markdown, vars);
  const signature = settings?.signature_markdown ?? "**The Glam Repairs Team**";
  const footer = settings?.footer_markdown ?? "";

  const html = `
    <div style="font-family: Arial, Helvetica, sans-serif; line-height: 1.65; color: #2b2b2b; max-width: 560px;">
      ${renderMarkdown(body).replace(/<a /g, `<a style="color: ${BRAND};" `)}
      <div style="margin-top: 24px; color: #4a4a4a;">${renderMarkdown(signature)}</div>
      ${footer ? `<p style="margin-top: 24px; font-size: 12px; color: #8a8a8a;">${escapeHtml(footer)}</p>` : ""}
    </div>`;
  const text = [body, "", signature.replace(/\*\*/g, ""), footer ? `\n${footer}` : ""].join("\n").trim();

  const { data, error } = await config.resend.emails.send({
    from: config.from,
    to: [input.toEmail],
    subject,
    html,
    text,
    ...(settings?.reply_to ? { replyTo: settings.reply_to } : {}),
  });
  if (error) {
    await logClientEmail({
      leadId: input.leadId,
      toEmail: input.toEmail,
      subject,
      body: text,
      kind: input.key.startsWith("abandon") ? (input.key as "abandon_1") : "other",
      templateKey: input.key,
      error: error.message,
    });
    return { ok: false, message: error.message };
  }
  return { ok: true, subject, text, resendId: data?.id ?? null };
}
