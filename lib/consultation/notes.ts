import "server-only";

import type { StudioMember } from "@/lib/studio/member";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

/**
 * Consultation notes — HANDOVER-52 §2.4, §2.5, §2.8, §4.5.
 *
 * The note is the record of the consultation: retained, never purged. A
 * super admin can read any note; a practitioner only the notes for her own
 * consultations. Reads go through the service role, which bypasses RLS,
 * so every read is written to consultation_access_log here, by the
 * application, or "who has read this record" has no answer.
 */

export const NOTE_MIN = { presenting: 20, observed: 20, guidance: 40, escalationReason: 11 } as const;

export type NoteAccess = {
  appointment: {
    id: string;
    startsAt: string;
    status: string;
    outcome: string | null;
    practitionerId: string;
    leadId: string | null;
  };
  /** Shown to the reader; a practitioner sees a reference, not the name. */
  clientLabel: string;
  canSeeCustomer: boolean;
  /** Worked out here, at request time: notes are written once the call has started. */
  started: boolean;
};

export async function practitionerIdFor(userId: string): Promise<string | null> {
  const { data } = await createAdminSupabaseClient()
    .from("practitioner_profiles")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();
  return data?.id ?? null;
}

/** Null when the member may not see this consultation. */
export async function noteAccess(member: StudioMember, appointmentId: string): Promise<NoteAccess | null> {
  const supabase = createAdminSupabaseClient();
  const { data: appt } = await supabase
    .from("appointments")
    .select("id, starts_at, status, outcome, practitioner_id, lead_id")
    .eq("id", appointmentId)
    .maybeSingle();
  if (!appt) return null;

  if (!member.isSuperAdmin) {
    const own = await practitionerIdFor(member.userId);
    if (!own || own !== appt.practitioner_id) return null;
  }

  let clientLabel = `Client ${appt.id.slice(0, 4).toUpperCase()}`;
  if (member.isSuperAdmin && appt.lead_id) {
    const { data: lead } = await supabase.from("leads").select("full_name").eq("id", appt.lead_id).maybeSingle();
    clientLabel = lead?.full_name?.trim() || clientLabel;
  }

  return {
    appointment: {
      id: appt.id,
      startsAt: appt.starts_at,
      status: appt.status,
      outcome: appt.outcome,
      practitionerId: appt.practitioner_id,
      leadId: appt.lead_id,
    },
    clientLabel,
    canSeeCustomer: member.isSuperAdmin,
    started: new Date(appt.starts_at).getTime() <= Date.now(),
  };
}

/** Reads the note and logs the read. */
export async function readNote(appointmentId: string, readerId: string) {
  const supabase = createAdminSupabaseClient();
  const { data: note } = await supabase.from("consultation_notes").select("*").eq("appointment_id", appointmentId).maybeSingle();
  if (note) {
    const { error } = await supabase
      .from("consultation_access_log")
      .insert({ appointment_id: appointmentId, user_id: readerId, action: "view_note" });
    if (error) console.error("[readNote] access log", error.message);
  }
  return note;
}
