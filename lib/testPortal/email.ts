import "server-only";

import { createAdminSupabaseClient } from "@/lib/supabase/admin";

/**
 * Handover 63 — a test session never emails anyone. The send is skipped and
 * logged against the test lead as `suppressed`, so a demo can still show
 * that the email would have gone, and to whom. The row is removed with the
 * lead by the purge (studio_emails cascades).
 */
export async function logSuppressedEmail(input: {
  leadId: string;
  toEmail: string;
  subject: string;
  kind: "welcome" | "payment_confirmed" | "report_ready" | "other";
  templateKey: string;
}) {
  const { error } = await createAdminSupabaseClient().from("studio_emails").insert({
    lead_id: input.leadId,
    to_email: input.toEmail || "(no address)",
    subject: input.subject,
    body: "Not sent: test portal session.",
    kind: input.kind,
    template_key: input.templateKey,
    status: "suppressed",
  });
  if (error) console.error("[testPortal/email]", error.message);
}
