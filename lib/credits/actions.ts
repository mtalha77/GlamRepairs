"use server";

import { revalidatePath } from "next/cache";

import { isCreditReason, normaliseCreditEmail } from "@/lib/credits/credits";
import { confirmLeadPayment } from "@/lib/payments/confirmLeadPayment";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { requireStudioMember } from "@/lib/studio/member";

/**
 * Holding a fee as credit, and paying with it (13 November 2026). The
 * permission is checked here, on every call: the service role skips RLS.
 * Holding credit is a super admin decision; paying with it is whoever may
 * verify payments, the same people who confirm a bank transfer.
 */

export type CreditResult = { ok: true; message: string } | { ok: false; error: string };

export async function holdFeeAsCredit(input: { leadId: string; reason: string; amount: number; note: string }): Promise<CreditResult> {
  const { member } = await requireStudioMember();
  if (!member) return { ok: false, error: "Not signed in." };
  if (!member.isSuperAdmin) return { ok: false, error: "Only a super admin can hold a fee as credit." };
  if (!isCreditReason(input.reason)) return { ok: false, error: "Choose a reason." };
  const amount = Math.round(Number(input.amount) * 100) / 100;
  if (!Number.isFinite(amount) || amount <= 0 || amount > 1_000_000) return { ok: false, error: "Enter an amount above zero." };

  const db = createAdminSupabaseClient();
  const { data: lead } = await db.from("leads").select("id, email, currency").eq("id", input.leadId).maybeSingle();
  if (!lead) return { ok: false, error: "No such client." };
  const email = normaliseCreditEmail(lead.email);
  if (!email) return { ok: false, error: "This client has no email address, so there is nothing to hold credit against." };
  if (!lead.currency) return { ok: false, error: "This assessment has no currency." };

  const { error } = await db.from("client_credits" as never).insert({
    email,
    amount,
    currency: lead.currency,
    reason: input.reason,
    source_lead_id: lead.id,
    note: input.note.trim().slice(0, 500) || null,
    created_by: member.userId,
  } as never);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/studio/customers/${lead.id}`);
  return { ok: true, message: `${lead.currency} ${amount} held as credit for ${email}. It pays any future assessment in ${lead.currency}.` };
}

export async function payWithCredit(leadId: string): Promise<CreditResult> {
  const { member } = await requireStudioMember();
  if (!member) return { ok: false, error: "Not signed in." };
  if (!member.canVerifyPayment) return { ok: false, error: "You cannot confirm payments." };

  const db = createAdminSupabaseClient();
  const { data: reason, error } = await db.rpc("apply_client_credit" as never, { p_lead: leadId, p_actor: member.userId } as never);
  if (error) return { ok: false, error: error.message };
  if (reason) return { ok: false, error: String(reason) };

  // The credit is spent; from here it is an ordinary confirmed payment.
  const result = await confirmLeadPayment(leadId, { actorId: member.userId, method: "credit" });
  revalidatePath(`/studio/customers/${leadId}`);
  revalidatePath("/studio/customers");
  if (!result.ok) return { ok: false, error: "The credit was used but confirming the payment failed. Press Verify payment to finish." };
  return { ok: true, message: "Paid from credit. The client has the payment confirmation email." };
}
