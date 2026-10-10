"use server";

import { revalidatePath } from "next/cache";

import { periodFor } from "@/lib/practitioners/payouts";
import { requireStudioMember } from "@/lib/studio/member";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

/**
 * Payout runs — HANDOVER-52 §4.6. Super admin only, checked here: the
 * functions run with the service role, so the button is not the control.
 */

export type PayoutActionResult = { ok: true; message: string } | { ok: false; error: string };

async function superAdmin() {
  const { user, member } = await requireStudioMember();
  if (!user || !member?.isSuperAdmin) return null;
  return user.id;
}

function revalidate() {
  revalidatePath("/studio/payouts");
  revalidatePath("/studio/practice");
}

export async function approvePayoutRun(month: string): Promise<PayoutActionResult> {
  const by = await superAdmin();
  if (!by) return { ok: false, error: "Only a super admin can approve payouts." };
  const period = periodFor(month);
  if (period.month !== month) return { ok: false, error: "Choose a month." };
  const { data, error } = await createAdminSupabaseClient().rpc("create_payout_run", { p_start: period.start, p_end: period.end, p_by: by });
  if (error) return { ok: false, error: error.message };
  revalidate();
  return data
    ? { ok: true, message: `Approved for ${data} ${data === 1 ? "practitioner" : "practitioners"}. Mark each paid once the transfer is made.` }
    : { ok: true, message: "Nothing payable to approve." };
}

export async function markPayoutPaid(input: { id: string; reference: string }): Promise<PayoutActionResult> {
  const by = await superAdmin();
  if (!by) return { ok: false, error: "Only a super admin can mark payouts paid." };
  const reference = input.reference.trim();
  if (reference.length < 3) return { ok: false, error: "Enter the transfer reference." };
  const { data, error } = await createAdminSupabaseClient().rpc("mark_payout_paid", { p_payout: input.id, p_reference: reference.slice(0, 120), p_by: by });
  if (error) return { ok: false, error: error.message };
  if (!data) return { ok: false, error: "This payout is not waiting to be paid." };
  revalidate();
  return { ok: true, message: "Marked paid." };
}

export async function cancelPayout(id: string): Promise<PayoutActionResult> {
  const by = await superAdmin();
  if (!by) return { ok: false, error: "Only a super admin can cancel payouts." };
  const { data, error } = await createAdminSupabaseClient().rpc("cancel_payout", { p_payout: id });
  if (error) return { ok: false, error: error.message };
  if (!data) return { ok: false, error: "Only an approved, unpaid payout can be cancelled." };
  revalidate();
  return { ok: true, message: "Cancelled. Its consultations are back in To approve." };
}
