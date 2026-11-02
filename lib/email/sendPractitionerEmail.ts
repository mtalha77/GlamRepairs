import "server-only";

import { escapeHtml, getResendConfig } from "@/lib/email/resendClient";

/**
 * Practitioner onboarding emails — HANDOVER-51.
 *
 *   invite     a link to /join carrying the one-time token
 *   continue   the same kind of link, asked for from /join by the applicant
 *   received   the application arrived; what happens next
 *   rejected   the decision, with the reviewer's note (never blank: the
 *              database refuses a rejection without one)
 *   sign_in    approved: set a password for the studio
 *   assessment the screening test link (spec 20 October §6.3)
 *
 * No claims about the applicant beyond what they told us, and nothing
 * that promises paid work: approval starts a probation, not a job.
 */

type Base = { toEmail: string; name: string | null };

export type PractitionerEmail =
  | (Base & { kind: "invite"; joinUrl: string; expiresAt: string; note: string | null })
  | (Base & { kind: "continue"; joinUrl: string; expiresAt: string })
  | (Base & { kind: "received" })
  | (Base & { kind: "rejected"; note: string })
  | (Base & { kind: "changes"; message: string; fields: string[]; editUrl: string })
  | (Base & { kind: "sign_in"; signInUrl: string; fee: string | null })
  | (Base & { kind: "assessment"; assessmentUrl: string; questions: number; minutes: number })
  | (Base & { kind: "agreement"; title: string; version: string; effectiveFrom: string; reviewUrl: string; renewal: boolean });

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
    case "continue": {
      const expires = new Date(e.expiresAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
      const lines = [
        "Here is your link to apply to join GlamRepairs as a practitioner.",
        "The application is five short steps. It is saved after every step, so you can stop and come back to where you left off with this same link.",
        `The link is for you only and works until ${expires}. If you did not ask for it, you can ignore this email.`,
      ];
      return {
        subject: "Your GlamRepairs application link",
        html: shell(name, `${lines.map(p).join("")}${button(e.joinUrl, "Continue your application")}`),
        text: [`Hi ${name},`, "", ...lines, "", `Continue here: ${e.joinUrl}`].join("\n"),
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
    case "assessment": {
      const lines = [
        "Thank you for your application to join GlamRepairs. The next step is a short written assessment.",
        `It is ${e.questions} multiple choice questions about skin, safety and how we work, and you have ${e.minutes} minutes once you press start. Your answers save as you go.`,
        "Start it when you have the time free and a steady connection. Please stay on the page while it runs: we can see if the tab is left, and a person reads every result.",
      ];
      return {
        subject: "Your GlamRepairs assessment",
        html: shell(name, `${lines.map(p).join("")}${button(e.assessmentUrl, "Open the assessment")}`),
        text: [`Hi ${name},`, "", ...lines, "", `Open it here: ${e.assessmentUrl}`].join("\n"),
      };
    }
    case "sign_in": {
      const lines = [
        "Your application to join GlamRepairs has been approved.",
        "Set a password for the studio with the button below. Once you are in, finish your profile with a photograph and a short bio; it is not shown to clients until it is complete.",
        "Your first reports are reviewed before they are sent.",
        "The button works for 7 days. If you have already set a password, sign in at glamrepairs.com/studio/login instead.",
        // Audit, 29 October 2026: the rate is no longer published on /join
        // (clients read that page too), so the approval is where it is told.
        ...(e.fee
          ? [
              `Your fee is ${e.fee} for each completed consultation. Each month runs from the 1st to its last day, and it is paid by the 5th of the next month. You can see what you have earned and what has been released under My practice.`,
            ]
          : []),
      ];
      return {
        subject: "Welcome to GlamRepairs: set your password",
        html: shell(name, `${lines.map(p).join("")}${button(e.signInUrl, "Set your password")}`),
        text: [`Hi ${name},`, "", ...lines, "", `Set your password: ${e.signInUrl}`].join("\n"),
      };
    }
    case "agreement": {
      // Handover 66 §5.3-5.4: a link to read it in the studio, never the
      // document itself. A signed copy carries a name, an IP address and a
      // signature event, so it is never attached to an email.
      const lines = [
        e.renewal
          ? `We have published a new version of the ${e.title}: ${e.version}, in force from ${e.effectiveFrom}.`
          : `The ${e.title} is now published: version ${e.version}, in force from ${e.effectiveFrom}.`,
        "Please read it in the studio and accept it there. The full text is on the page, with a PDF copy to keep.",
        e.renewal
          ? "Your earlier acceptance stays on record. Until you accept the new version, the studio shows it to you first when you sign in."
          : "Until you accept it, the studio shows it to you first when you sign in.",
      ];
      return {
        subject: `Please review the ${e.title} (${e.version})`,
        html: shell(name, `${lines.map(p).join("")}${button(e.reviewUrl, "Read and accept")}`),
        text: [`Hi ${name},`, "", ...lines, "", `Read and accept: ${e.reviewUrl}`].join("\n"),
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
