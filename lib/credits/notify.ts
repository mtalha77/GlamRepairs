import "server-only";

import { clientSignInUrl, CONFIRMATION_LINK_DAYS } from "@/lib/clients/signIn";
import { formatCredit } from "@/lib/credits/credits";
import { logClientEmail } from "@/lib/email/logClientEmail";
import { sendStudioCustomerEmail } from "@/lib/email/sendStudioCustomerEmail";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

/**
 * Tell the client their fee is held as credit, with the way to use it
 * (13 November 2026). The account is made sure of first, because the credit
 * is spent from the client's own signed-in page: that is how a client
 * proves the email is theirs. Never for a test lead. Never blocks or undoes
 * the credit that called it.
 */
export async function emailCreditHeld(input: { leadId: string; amount: number; currency: string }): Promise<void> {
  try {
    const admin = createAdminSupabaseClient();
    const { data: lead } = await admin.from("leads").select("id, email, full_name, is_test").eq("id", input.leadId).maybeSingle();
    if (!lead?.email || lead.is_test) return;
    const { data: accountId, error } = await admin.rpc("ensure_client_account" as never, { p_lead: lead.id } as never);
    if (error || !accountId) {
      console.error("[emailCreditHeld] account", error?.message);
      return;
    }
    const url = clientSignInUrl(String(accountId), CONFIRMATION_LINK_DAYS * 86_400_000);
    const amount = formatCredit(input.amount, input.currency);
    const subject = "Your fee is held as a credit";
    const body = [
      `We have held ${amount} as a credit for you. It does not expire, and it pays for a future assessment.`,
      "",
      "To use it, start a new assessment with this same email address. When you reach payment, sign in to your account and choose Pay with credit. Nothing else to transfer.",
      "",
      `Sign in here: ${url}`,
      `The link works once, for ${CONFIRMATION_LINK_DAYS} days. After that, ask for a new one at glamrepairs.com/account.`,
    ].join("\n");
    const sent = await sendStudioCustomerEmail({ toEmail: lead.email, customerName: lead.full_name, subject, body });
    await logClientEmail({
      leadId: lead.id,
      toEmail: lead.email,
      subject,
      // The link is a credential, so the record keeps the wording only.
      body: body.split(url).join("[sign-in link]"),
      kind: "other",
      templateKey: "credit_held",
      resendId: sent.ok ? sent.resendId : null,
      error: sent.ok ? null : sent.message,
    });
  } catch (err) {
    console.error("[emailCreditHeld]", (err as Error).message);
  }
}
