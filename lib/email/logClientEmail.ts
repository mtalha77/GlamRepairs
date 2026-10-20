import "server-only";

import { createAdminSupabaseClient } from "@/lib/supabase/admin";

/**
 * Every email a client receives goes on their record — Talha, 20 October
 * 2026: "Client history should be saved like everything, what email
 * communication is done ... so I can check in the future."
 *
 * studio_emails already held the ones staff send by hand. This adds the
 * automatic ones (confirmations, reminders, follow-ups, recovery), with
 * sent_by left null, which the client_email_timeline view shows as
 * "Automatic". Logging never blocks or fails a send.
 */

type Kind =
  | "welcome"
  | "payment_confirmed"
  | "report_ready"
  | "abandon_1"
  | "abandon_2"
  | "abandon_final"
  | "consultation_booked"
  | "consultation_reminder"
  | "other";

export async function logClientEmail(input: {
  leadId: string | null | undefined;
  toEmail: string;
  subject: string;
  body: string;
  kind: Kind;
  templateKey?: string | null;
  resendId?: string | null;
  error?: string | null;
}): Promise<void> {
  if (!input.leadId) return;
  try {
    const { error } = await createAdminSupabaseClient()
      .from("studio_emails")
      .insert({
        lead_id: input.leadId,
        to_email: input.toEmail,
        subject: input.subject,
        body: input.body,
        kind: input.kind,
        template_key: input.templateKey ?? input.kind,
        resend_id: input.resendId ?? null,
        status: input.error ? "failed" : "sent",
        error: input.error ?? null,
      });
    if (error) console.error("[logClientEmail]", error.message);
  } catch (err) {
    console.error("[logClientEmail]", err);
  }
}
