import "server-only";

import { clientSignInUrl, CONFIRMATION_LINK_DAYS } from "@/lib/clients/signIn";
import { logClientEmail } from "@/lib/email/logClientEmail";
import { sendTemplateEmail } from "@/lib/email/sendTemplateEmail";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

/**
 * The payment_confirmed email, with the client's sign-in link. HANDOVER-60
 * Part 7.2: the account exists by now (a trigger creates it when the lead's
 * payment is verified), so the confirmation can carry the way in.
 *
 * Sent once, on the change to verified. Never for a test lead: those get no
 * account. Never blocks or undoes the verification that called it.
 */
export async function sendPaymentConfirmedEmail(leadId: string, booking: string): Promise<void> {
  try {
    const admin = createAdminSupabaseClient();
    const [{ data: lead }, { data: account }] = await Promise.all([
      admin.from("leads").select("id, email, full_name, is_test").eq("id", leadId).maybeSingle(),
      admin.from("client_accounts").select("id").eq("lead_id", leadId).is("deleted_at", null).maybeSingle(),
    ]);
    if (!lead?.email || lead.is_test || !account) return;

    const url = clientSignInUrl(account.id, CONFIRMATION_LINK_DAYS * 86_400_000);
    const consultation =
      booking === "booked" || booking === "booked_no_link"
        ? "Your video consultation is booked. The time and joining details are in a separate email."
        : "";
    const sent = await sendTemplateEmail({
      key: "payment_confirmed",
      leadId,
      toEmail: lead.email,
      fullName: lead.full_name,
      vars: { consultation_line: consultation },
      appendMarkdown: `**Your account**\n\nYour assessment, your photographs and your report, when it is ready, are in one place: [sign in here](${url}). The link works once, for ${CONFIRMATION_LINK_DAYS} days. After that, ask for a new one at glamrepairs.com/account.`,
    });
    if (!sent.ok) {
      console.error("[sendPaymentConfirmedEmail]", sent.message);
      return;
    }
    await admin
      .from("client_accounts")
      .update({ invited_at: new Date().toISOString(), last_link_sent_at: new Date().toISOString() })
      .eq("id", account.id);
    await logClientEmail({
      leadId,
      toEmail: lead.email,
      subject: sent.subject,
      // The link is a credential, so the record keeps the wording only.
      body: sent.text.split(url).join("[sign-in link]"),
      kind: "payment_confirmed",
      templateKey: "payment_confirmed",
      resendId: sent.resendId,
    });
  } catch (err) {
    console.error("[sendPaymentConfirmedEmail]", (err as Error).message);
  }
}
