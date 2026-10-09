"use server";

import { revalidatePath } from "next/cache";

import { NOTE_MIN, noteAccess } from "@/lib/consultation/notes";
import { requireStudioMember } from "@/lib/studio/member";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

/**
 * Submit a consultation note — HANDOVER-52 §2.4, §4.5.
 *
 * Submitting releases the practitioner's held fee (a database trigger
 * moves the earning from pending to payable). A note is written once;
 * there is no edit, because a record that can be rewritten after a
 * complaint is not a record. The same minimums as the database constraint
 * are checked here first so the practitioner sees a sentence, not an error.
 */

export type NoteActionResult = { ok: true; message: string } | { ok: false; error: string };

export async function submitConsultationNote(input: {
  appointmentId: string;
  presenting: string;
  observed: string;
  guidance: string;
  productsDiscussed: string;
  followUp: string;
  escalated: boolean;
  escalationReason: string;
  escalationAdvice: string;
}): Promise<NoteActionResult> {
  const { user, member } = await requireStudioMember();
  if (!user || !member) return { ok: false, error: "Not signed in." };
  const access = await noteAccess(member, input.appointmentId);
  if (!access) return { ok: false, error: "You cannot write a note for this consultation." };
  if (!access.started) {
    return { ok: false, error: "The note can be written once the consultation has started." };
  }

  const presenting = input.presenting.trim();
  const observed = input.observed.trim();
  const guidance = input.guidance.trim();
  if (presenting.length < NOTE_MIN.presenting) {
    return { ok: false, error: `"What they came with" needs at least ${NOTE_MIN.presenting} characters.` };
  }
  if (observed.length < NOTE_MIN.observed) {
    return { ok: false, error: `"What you observed" needs at least ${NOTE_MIN.observed} characters.` };
  }
  if (guidance.length < NOTE_MIN.guidance) {
    return { ok: false, error: `"Your guidance" needs at least ${NOTE_MIN.guidance} characters.` };
  }
  const reason = input.escalationReason.trim();
  if (input.escalated && reason.length < NOTE_MIN.escalationReason) {
    return { ok: false, error: "Say what you saw that should be looked at by a doctor." };
  }

  const supabase = createAdminSupabaseClient();
  const now = new Date().toISOString();
  const { error } = await supabase.from("consultation_notes").insert({
    appointment_id: access.appointment.id,
    practitioner_id: access.appointment.practitionerId,
    lead_id: access.appointment.leadId,
    presenting,
    observed,
    guidance,
    products_discussed: input.productsDiscussed.trim() || null,
    follow_up: input.followUp.trim() || null,
    escalated: input.escalated,
    escalation_reason: input.escalated ? reason : null,
    escalation_advice: input.escalated ? input.escalationAdvice.trim() || null : null,
    escalated_at: input.escalated ? now : null,
  });
  if (error) {
    if (error.code === "23505") return { ok: false, error: "A note has already been written for this consultation." };
    return { ok: false, error: error.message };
  }
  await supabase
    .from("consultation_access_log")
    .insert({ appointment_id: access.appointment.id, user_id: user.id, action: "edit_note" });

  revalidatePath("/studio/consultations");
  revalidatePath(`/studio/consultations/${access.appointment.id}/note`);
  return { ok: true, message: "Note saved. Any fee held for this consultation is now payable." };
}
