import "server-only";

import { escapeHtml, getResendConfig } from "@/lib/email/resendClient";

/**
 * Practitioner onboarding emails — HANDOVER-51.
 *
 *   invite     a link to /join carrying the one-time token
 *   received   the application arrived; what happens next
 *   rejected   the decision, with the reviewer's note (never blank: the
 *              database refuses a rejection without one)
 *   sign_in    approved: set a password for the studio
 *
 * No claims about the applicant beyond what they told us, and nothing
 * that promises paid work: approval starts a probation, not a job.
 */

type Base = { toEmail: string; name: string | null };

export type PractitionerEmail =
  | (Base & { kind: "invite"; joinUrl: string; expiresAt: string; note: string | null })
  | (Base & { kind: "received" })
  | (Base & { kind: "rejected"; note: string })
  | (Base & { kind: "changes"; message: string; fields: string[]; editUrl: string })
  | (Base & { kind: "sign_in"; signInUrl: string });

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

function p(text: string) {
  return `<p style="margin: 0 0 12px;">${escapeHtml(text)}</p>`;
}

function compose(e: PractitionerEmail): { subject: string; html: string; text: string } {
  const name = e.name?.trim() || "there";
  switch (e.kind) {
    case "invite": {
      const expires = new Date(e.expiresAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
      const lines = [
        "You have been invited to apply to join GlamRepairs as a practitioner.",
        "We take practitioners with a relevant qualification and clinic experience. Every new practitioner reads three sample assessments, and their first reports are reviewed before they are sent.",
        `The link below is for you only and works until ${expires}.`,
      ];
      return {
        subject: "Your invitation to apply to GlamRepairs",
        html: shell(name, `${lines.map(p).join("")}${e.note ? p(e.note) : ""}${button(e.joinUrl, "Start your application")}`),
        text: [`Hi ${name},`, "", ...lines, e.note ?? "", "", `Apply here: ${e.joinUrl}`].join("\n"),
      };
    }
    case "received": {
      const lines = [
        "Thank you, your application to join GlamRepairs has arrived.",
        "We read every application ourselves and will reply by email. If we would like to take it further, the next step is a short conversation and three sample assessments.",
      ];
      return {
        subject: "We have your application",
        html: shell(name, lines.map(p).join("")),
        text: [`Hi ${name},`, "", ...lines].join("\n"),
      };
    }
    case "rejected": {
      const lines = ["Thank you for applying to join GlamRepairs. We have decided not to take your application further."];
      return {
        subject: "Your GlamRepairs application",
        html: shell(name, `${lines.map(p).join("")}${p(e.note)}${p("The documents you uploaded will be deleted within 30 days.")}`),
        text: [`Hi ${name},`, "", ...lines, "", e.note, "", "The documents you uploaded will be deleted within 30 days."].join("\n"),
      };
    }
    case "changes": {
      const lines = ["Thank you for your application to join GlamRepairs. Before we can go further, we need a few changes."];
      const list = e.fields.length ? `Please look at: ${e.fields.join(", ")}.` : "";
      return {
        subject: "A few changes to your GlamRepairs application",
        html: shell(name, `${lines.map(p).join("")}${p(e.message)}${list ? p(list) : ""}${button(e.editUrl, "Update your application")}`),
        text: [`Hi ${name},`, "", ...lines, "", e.message, list, "", `Update it here: ${e.editUrl}`].join("\n"),
      };
    }
    case "sign_in": {
      const lines = [
        "Your application to join GlamRepairs has been approved.",
        "Set a password for the studio with the button below. Once you are in, finish your profile with a photograph and a short bio; it is not shown to clients until it is complete.",
        "Your first reports are reviewed before they are sent.",
      ];
      return {
        subject: "Welcome to GlamRepairs: set your password",
        html: shell(name, `${lines.map(p).join("")}${button(e.signInUrl, "Set your password")}`),
        text: [`Hi ${name},`, "", ...lines, "", `Set your password: ${e.signInUrl}`].join("\n"),
      };
    }
  }
}

export async function sendPractitionerEmail(
  email: PractitionerEmail,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const config = getResendConfig();
  if (!config) return { ok: false, message: "Email is not configured." };
  const { subject, html, text } = compose(email);
  const { error } = await config.resend.emails.send({ from: config.from, to: [email.toEmail], subject, html, text });
  if (error) return { ok: false, message: error.message };
  return { ok: true };
}
