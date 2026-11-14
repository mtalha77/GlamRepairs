"use server";

import { revalidatePath } from "next/cache";

import { currentClientAccount } from "@/lib/clients/signIn";
import { pendingAssessmentFor } from "@/lib/credits/client";
import { confirmLeadPayment } from "@/lib/payments/confirmLeadPayment";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export type ClientCreditResult = { ok: true; message: string } | { ok: false; error: string };

/**
 * The client pays their pending assessment from their own credit. The
 * account comes from the session and the assessment is found from the
 * account's email here, so the browser names nothing it could forge.
 * apply_client_credit() re-checks the balance under a lock.
 */
export async function payPendingWithCredit(): Promise<ClientCreditResult> {
  const account = await currentClientAccount();
  if (!account) return { ok: false, error: "Please sign in again." };
  const pending = await pendingAssessmentFor(account.email);
  if (!pending) return { ok: false, error: "There is no assessment waiting for payment." };

  const { data: reason, error } = await createAdminSupabaseClient().rpc(
    "apply_client_credit" as never,
    { p_lead: pending.id, p_actor: null } as never,
  );
  if (error) return { ok: false, error: "Something went wrong. Please message us and we will sort it out." };
  if (reason) return { ok: false, error: String(reason) };

  const result = await confirmLeadPayment(pending.id, { actorId: null, method: "credit" });
  revalidatePath("/account");
  if (!result.ok) return { ok: false, error: "Your credit was used, but confirming the payment needs a hand from us. We have been told." };
  return { ok: true, message: "Paid from your credit. Your assessment is now with your practitioner, and a confirmation email is on its way." };
}
