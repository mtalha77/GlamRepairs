import "server-only";

import { getConsultationSettings, type ConsultationSettings } from "@/lib/consultation/slots";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

/**
 * Studio → Consultations, the read side — HANDOVER-50 §3.
 *
 * Read with the service role after the page has checked membership, so one
 * query can join appointments to lead names without a policy per table.
 * `host_url` is deliberately never selected: it is Ayma's own room link and
 * has no business in a page any team member can open.
 */

export type WeeklyWindow = {
  weekday: number;
  startsTime: string;
  endsTime: string;
  slotMinutes: number;
  strideMinutes: number;
  active: boolean;
};

export type Blackout = { id: string; startsAt: string; endsAt: string; reason: string | null };

export type StudioAppointment = {
  id: string;
  practitionerId: string;
  leadId: string | null;
  clientName: string;
  phoneDigits: string | null;
  email: string | null;
  startsAt: string;
  endsAt: string;
  status: "scheduled" | "completed" | "cancelled" | "no_show";
  joinUrl: string | null;
  hasBridge: boolean;
  notes: string | null;
  reminder24hAt: string | null;
  reminder1hAt: string | null;
  /** Worked out on the server, at render time. */
  ended: boolean;
  hasNote: boolean;
};

export type HeldSlotRow = { slotId: string; startsAt: string; heldUntil: string | null; clientName: string; leadId: string | null };

export type NoteDue = { appointmentId: string; startsAt: string; clientLabel: string; heldMinor: number | null };

export type ConsultationAdminData = {
  /** Consultations that ended without a note; the fee stays held until one is written. */
  notesDue: NoteDue[];
  /** Escalations to a doctor in the last 90 days (HANDOVER-52 §2.5). */
  escalations90d: number;
  practitioner: { id: string; fullName: string; timezone: string } | null;
  windows: WeeklyWindow[];
  blackouts: Blackout[];
  settings: ConsultationSettings;
  appointments: StudioAppointment[];
  holds: HeldSlotRow[];
  openNext7: number;
  openInHorizon: number;
  defaultSlotMinutes: number;
};

/** The one practitioner taking calls. Ayma today; the first approved row. */
export async function getConsultingPractitioner() {
  const { data } = await createAdminSupabaseClient()
    .from("practitioner_profiles")
    .select("id, full_name, timezone")
    .eq("status", "approved")
    .order("created_at")
    .limit(1)
    .maybeSingle();
  return data ? { id: data.id, fullName: data.full_name, timezone: data.timezone } : null;
}

function digitsOnly(phone: string | null | undefined): string | null {
  const d = phone?.replace(/[^\d]/g, "") ?? "";
  if (!d) return null;
  // A local 03xx number becomes 923xx, which is what wa.me needs.
  if (d.startsWith("03") && d.length === 11) return `92${d.slice(1)}`;
  return d;
}

/**
 * `practitionerId` scopes the view to one practitioner's own consultations
 * and hides client contact details: a practitioner reads the photographs,
 * she does not need the client's name or phone number (HANDOVER-52 §4.4).
 */
export async function loadConsultationAdmin(scope?: { practitionerId: string }): Promise<ConsultationAdminData> {
  const supabase = createAdminSupabaseClient();
  await supabase.rpc("release_expired_holds");

  const [practitioner, settings] = await Promise.all([getConsultingPractitioner(), getConsultationSettings()]);
  const now = new Date();
  const in7 = new Date(now.getTime() + 7 * 86_400_000).toISOString();
  const leadFrom = new Date(now.getTime() + settings.leadTimeHours * 3_600_000).toISOString();
  const horizon = new Date(now.getTime() + settings.horizonDays * 86_400_000).toISOString();

  const pid = practitioner?.id ?? "00000000-0000-0000-0000-000000000000";
  const [windowsRes, blackoutsRes, apptRes, holdsRes, next7Res, horizonRes, planRes] = await Promise.all([
    supabase
      .from("practitioner_availability")
      .select("weekday, starts_time, ends_time, slot_minutes, stride_minutes, active")
      .eq("practitioner_id", pid)
      .order("weekday")
      .order("starts_time"),
    supabase
      .from("practitioner_blackouts")
      .select("id, starts_at, ends_at, reason")
      .eq("practitioner_id", pid)
      .gte("ends_at", now.toISOString())
      .order("starts_at"),
    supabase
      .from("appointments")
      .select(
        "id, practitioner_id, lead_id, starts_at, ends_at, status, join_url, provider_ref, notes, reminder_24h_at, reminder_1h_at",
      )
      .eq("status", "scheduled")
      .eq(scope ? "practitioner_id" : "status", scope ? scope.practitionerId : "scheduled")
      .gte("ends_at", new Date(now.getTime() - 7 * 86_400_000).toISOString())
      .order("starts_at")
      .limit(100),
    supabase
      .from("availability_slots")
      .select("id, starts_at, held_until, lead_id")
      .eq("status", "held")
      .order("starts_at")
      .limit(50),
    supabase
      .from("availability_slots")
      .select("id", { count: "exact", head: true })
      .eq("status", "open")
      .gte("starts_at", leadFrom)
      .lte("starts_at", in7),
    supabase
      .from("availability_slots")
      .select("id", { count: "exact", head: true })
      .eq("status", "open")
      .gte("starts_at", leadFrom)
      .lte("starts_at", horizon),
    supabase.from("plan_settings").select("video_minutes").eq("includes_video_call", true).limit(1).maybeSingle(),
  ]);

  const leadIds = [
    ...new Set(
      [...(apptRes.data ?? []).map((a) => a.lead_id), ...(holdsRes.data ?? []).map((h) => h.lead_id)].filter(
        (id): id is string => Boolean(id),
      ),
    ),
  ];
  const apptIds = (apptRes.data ?? []).map((a) => a.id);
  const { data: notes } = apptIds.length
    ? await supabase.from("consultation_notes").select("appointment_id").in("appointment_id", apptIds)
    : { data: [] };
  const noted = new Set((notes ?? []).map((n) => n.appointment_id));

  const { data: leads } = leadIds.length
    ? await supabase.from("leads").select("id, full_name, email, phone, phone_e164").in("id", leadIds)
    : { data: [] };
  const byId = new Map((leads ?? []).map((l) => [l.id, l]));

  // Notes outstanding: ended consultations (not ones cancelled with nobody
  // charged) from the last 60 days with no note yet.
  let dueQuery = supabase
    .from("appointments")
    .select("id, lead_id, starts_at, status, practitioner_id")
    .in("status", ["scheduled", "completed", "no_show"])
    .lt("ends_at", now.toISOString())
    .gte("ends_at", new Date(now.getTime() - 60 * 86_400_000).toISOString())
    .order("starts_at", { ascending: false })
    .limit(100);
  if (scope) dueQuery = dueQuery.eq("practitioner_id", scope.practitionerId);
  const { data: ended } = await dueQuery;
  const endedIds = (ended ?? []).map((a) => a.id);
  const [{ data: endedNotes }, { data: held }] = endedIds.length
    ? await Promise.all([
        supabase.from("consultation_notes").select("appointment_id").in("appointment_id", endedIds),
        supabase.from("practitioner_earnings").select("appointment_id, practitioner_minor").in("appointment_id", endedIds).eq("status", "pending"),
      ])
    : [{ data: [] }, { data: [] }];
  const missingLeads = [...new Set((ended ?? []).map((a) => a.lead_id).filter((id): id is string => Boolean(id) && !byId.has(id!)))];
  if (missingLeads.length && !scope) {
    const { data: more } = await supabase.from("leads").select("id, full_name, email, phone, phone_e164").in("id", missingLeads);
    for (const l of more ?? []) byId.set(l.id, l);
  }
  const hasNoteSet = new Set((endedNotes ?? []).map((n) => n.appointment_id));
  const heldBy = new Map((held ?? []).map((h) => [h.appointment_id, h.practitioner_minor]));
  const notesDue: NoteDue[] = (ended ?? [])
    .filter((a) => !hasNoteSet.has(a.id))
    .map((a) => ({
      appointmentId: a.id,
      startsAt: a.starts_at,
      clientLabel: scope ? `Client ${a.id.slice(0, 4).toUpperCase()}` : (a.lead_id && byId.get(a.lead_id)?.full_name?.trim()) || "Client",
      heldMinor: heldBy.get(a.id) ?? null,
    }));

  const { count: escalations90d } = await supabase
    .from("consultation_notes")
    .select("appointment_id", { count: "exact", head: true })
    .eq("escalated", true)
    .gte("escalated_at", new Date(now.getTime() - 90 * 86_400_000).toISOString());

  return {
    notesDue,
    escalations90d: escalations90d ?? 0,
    practitioner,
    windows: (windowsRes.data ?? []).map((w) => ({
      weekday: w.weekday,
      startsTime: w.starts_time.slice(0, 5),
      endsTime: w.ends_time.slice(0, 5),
      slotMinutes: w.slot_minutes,
      strideMinutes: w.stride_minutes,
      active: w.active,
    })),
    blackouts: (blackoutsRes.data ?? []).map((b) => ({ id: b.id, startsAt: b.starts_at, endsAt: b.ends_at, reason: b.reason })),
    settings,
    appointments: (apptRes.data ?? []).map((a) => {
      const lead = a.lead_id ? byId.get(a.lead_id) : undefined;
      return {
        id: a.id,
        practitionerId: a.practitioner_id,
        leadId: a.lead_id,
        clientName: scope ? `Client ${a.id.slice(0, 4).toUpperCase()}` : lead?.full_name?.trim() || "Client",
        phoneDigits: scope ? null : digitsOnly(lead?.phone_e164 ?? lead?.phone),
        email: scope ? null : (lead?.email ?? null),
        startsAt: a.starts_at,
        endsAt: a.ends_at,
        status: a.status,
        joinUrl: a.join_url,
        hasBridge: Boolean(a.provider_ref),
        notes: a.notes,
        reminder24hAt: a.reminder_24h_at,
        reminder1hAt: a.reminder_1h_at,
        ended: new Date(a.ends_at).getTime() < now.getTime(),
        hasNote: noted.has(a.id),
      };
    }),
    holds: (holdsRes.data ?? []).map((h) => ({
      slotId: h.id,
      startsAt: h.starts_at,
      heldUntil: h.held_until,
      leadId: h.lead_id,
      clientName: scope ? "Client" : (h.lead_id && byId.get(h.lead_id)?.full_name?.trim()) || "Client",
    })),
    openNext7: next7Res.count ?? 0,
    openInHorizon: horizonRes.count ?? 0,
    defaultSlotMinutes: planRes.data?.video_minutes ?? 15,
  };
}
