import "server-only";

import { renderMarkdown } from "@/lib/blog/markdown";
import { formatSlot } from "@/lib/consultation/format";
import { escapeHtml, getResendConfig } from "@/lib/email/resendClient";
import { getWhatsAppChatLink } from "@/lib/funnel/whatsapp";

/**
 * Consultation emails — HANDOVER-50 §6–7.
 *
 *   confirmed   the time, the join link (or that it will follow), guidelines
 *   repick      the time was lost after payment: choose again, here is how
 *   no_time     paid, but no time was chosen: choose one
 *   reminder    24 hours and 1 hour before
 *
 * Only ever the guest join link. `appointments.host_url` is Ayma's and is
 * never passed in here, so it cannot leak into an email by accident.
 */

type Base = { toEmail: string | null; name: string | null };

export type ConsultationEmail =
  | (Base & { kind: "confirmed"; startsAt: string; joinUrl: string | null; password?: string | null; minutes: number; guidelinesMarkdown: string })
  | (Base & { kind: "repick" | "no_time"; pickUrl: string })
  | (Base & { kind: "reminder"; when: "24h" | "1h"; startsAt: string; joinUrl: string | null; guidelinesMarkdown: string });

const BRAND = "#662d91";

function shell(name: string, inner: string) {
  return `
    <div style="font-family: Arial, Helvetica, sans-serif; line-height: 1.65; color: #2b2b2b; max-width: 560px;">
      <p style="margin: 0 0 12px;">Hi ${escapeHtml(name)},</p>
      ${inner}
      <p style="margin: 24px 0 0; color: #4a4a4a;">Warm regards,<br /><strong style="color: ${BRAND};">The GlamRepairs Team</strong></p>
    </div>`;
}

function button(href: string, label: string) {
  return `<p style="margin: 20px 0;"><a href="${escapeHtml(href)}" style="display: inline-block; background: ${BRAND}; color: #fff; text-decoration: none; padding: 12px 22px; border-radius: 999px;">${escapeHtml(label)}</a></p>`;
}

function guidelinesBlock(md: string) {
  if (!md.trim()) return "";
  return `<div style="margin-top: 20px; padding: 16px; background: #fff7e5; border-radius: 12px;">${renderMarkdown(md)}</div>`;
}

function compose(e: ConsultationEmail): { subject: string; html: string; text: string } {
  const name = e.name?.trim() || "there";
  const whatsapp = getWhatsAppChatLink();
  switch (e.kind) {
    case "confirmed": {
      const when = formatSlot(e.startsAt);
      const link = e.joinUrl
        ? `${button(e.joinUrl, "Join your consultation")}<p style="margin: 0 0 12px; font-size: 14px; color: #4a4a4a;">Open this link at the time above and type your name to join; there is nothing to install or sign in to. Your practitioner joins you in the same room. The link is for you alone and stops working after your call.${e.password ? ` Meeting password: <strong>${escapeHtml(e.password)}</strong>.` : ""}</p>`
        : `<p style="margin: 0 0 12px;">Your video link will follow before the call.</p>`;
      return {
        subject: `Your consultation is booked: ${when}`,
        html: shell(name, `
          <p style="margin: 0 0 12px;">Your payment is confirmed and your ${e.minutes}-minute video consultation with Ayma Arif is booked for:</p>
          <p style="margin: 0 0 12px; font-size: 18px;"><strong>${escapeHtml(when)}</strong></p>
          ${link}
          ${guidelinesBlock(e.guidelinesMarkdown)}
          <p style="margin: 16px 0 0; font-size: 14px;">Need to change the time? Message us on <a href="${escapeHtml(whatsapp)}">WhatsApp</a>.</p>`),
        text: [
          `Hi ${name},`, "",
          `Your ${e.minutes}-minute video consultation with Ayma Arif is booked for ${when}.`,
          e.joinUrl ? `Join here at that time: ${e.joinUrl}` : "Your video link will follow before the call.",
          e.password ? `Meeting password: ${e.password}` : "",
          "", e.guidelinesMarkdown, "", `Need to change the time? WhatsApp us: ${whatsapp}`,
        ].filter((l) => l !== null).join("\n"),
      };
    }
    case "repick":
    case "no_time": {
      const lead =
        e.kind === "repick"
          ? "Thank you, your payment is confirmed. Unfortunately the consultation time you picked was taken while we were confirming it, and we are sorry for that."
          : "Thank you, your payment is confirmed. Your plan includes a video consultation with Ayma Arif, and you have not chosen a time yet.";
      return {
        subject: e.kind === "repick" ? "Please choose a new consultation time" : "Choose your consultation time",
        html: shell(name, `
          <p style="margin: 0 0 12px;">${escapeHtml(lead)}</p>
          <p style="margin: 0 0 12px;">Please choose a time that suits you. It is booked the moment you pick it, as your payment is already done.</p>
          ${button(e.pickUrl, "Choose a time")}
          <p style="margin: 0; font-size: 14px;">Or message us on <a href="${escapeHtml(whatsapp)}">WhatsApp</a> and we will arrange it with you.</p>`),
        text: [`Hi ${name},`, "", lead, "", `Choose a time (booked as soon as you pick): ${e.pickUrl}`, `Or WhatsApp us: ${whatsapp}`].join("\n"),
      };
    }
    case "reminder": {
      const when = formatSlot(e.startsAt);
      const soon = e.when === "1h" ? "in about an hour" : "tomorrow";
      return {
        subject: `Reminder: your consultation ${soon}, ${when}`,
        html: shell(name, `
          <p style="margin: 0 0 12px;">A reminder that your video consultation with Ayma Arif is ${soon}:</p>
          <p style="margin: 0 0 12px; font-size: 18px;"><strong>${escapeHtml(when)}</strong></p>
          ${e.joinUrl ? button(e.joinUrl, "Join your consultation") : `<p style="margin: 0 0 12px;">Your video link will follow before the call.</p>`}
          ${guidelinesBlock(e.guidelinesMarkdown)}`),
        text: [`Hi ${name},`, "", `Your consultation with Ayma Arif is ${soon}: ${when}.`, e.joinUrl ? `Join: ${e.joinUrl}` : "", "", e.guidelinesMarkdown].join("\n"),
      };
    }
  }
}

export async function sendConsultationEmail(
  email: ConsultationEmail,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const config = getResendConfig();
  if (!config) return { ok: false, message: "Email is not configured." };
  const to = email.toEmail?.trim();
  if (!to || !to.includes("@")) return { ok: false, message: "No email address on this lead." };
  const { subject, html, text } = compose(email);
  const { error } = await config.resend.emails.send({ from: config.from, to: [to], subject, html, text });
  if (error) return { ok: false, message: error.message };
  return { ok: true };
}
