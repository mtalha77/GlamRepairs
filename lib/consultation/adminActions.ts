"use server";

import { revalidatePath } from "next/cache";

import { getConsultingPractitioner } from "@/lib/consultation/admin";
import { callMinutes } from "@/lib/consultation/booking";
import { formatSlot } from "@/lib/consultation/format";
import { createBridge } from "@/lib/consultation/ringcentral";
import { getConsultationSettings } from "@/lib/consultation/slots";
import { sendConsultationEmail } from "@/lib/email/sendConsultationEmail";
import { requireStudioMember } from "@/lib/studio/member";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import type { AppointmentOutcome } from "@/lib/supabase/database.types";
import { createServerSupabaseClient } from "@/lib/supabase/server";

/**
 * Studio → Consultations, the write side — HANDOVER-50 §3.
 *
 * Super admin only, checked here in every action and again by RLS on the
 * tables (writes go through the signed-in client, not the service role).
 * The one service-role call is `refresh_open_slots`, which nobody but the
 * service role may execute: it rebuilds the open grid from the weekly
 * pattern, and is run after anything that changes what is open.
 */

export type ConsultationActionResult =
  | { ok: true; message?: string }
  | { ok: false; error: string }
  | { ok: false; needsConfirm: true; affected: { startsAt: string; status: string; clientName: string }[] };

const PATH = "/studio/consultations";

async function guard() {
  const { user, member } = await requireStudioMember();
  if (!user || !member) return { error: "Not signed in." } as const;
  if (!member.isSuperAdmin) return { error: "Only a super admin can change consultations." } as const;
  return { user, member } as const;
}

async function refreshSlots(): Promise<number | null> {
  const settings = await getConsultationSettings();
  const { data, error } = await createAdminSupabaseClient().rpc("refresh_open_slots", {
    p_days: Math.max(28, settings.horizonDays + 1),
  });
  if (error) {
    console.error("[refresh_open_slots]", error.message);
    return null;
  }
  return (data as number | null) ?? 0;
}

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
const toMinutes = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));

export type WeeklyWindowInput = {
  weekday: number;
  startsTime: string;
  endsTime: string;
  slotMinutes: number;
  strideMinutes: number;
};

/**
 * Replace the weekly pattern. New rows go in before the old ones come out,
 * so a failed save leaves the previous pattern standing rather than none.
 */
export async function saveWeeklyAvailability(windows: WeeklyWindowInput[]): Promise<ConsultationActionResult> {
  const g = await guard();
  if ("error" in g) return { ok: false, error: g.error as string };
  const practitioner = await getConsultingPractitioner();
  if (!practitioner) return { ok: false, error: "No approved practitioner profile exists." };

  if (windows.length > 50) return { ok: false, error: "That is more windows than a week can hold." };
  for (const w of windows) {
    if (!Number.isInteger(w.weekday) || w.weekday < 0 || w.weekday > 6) return { ok: false, error: "Unknown day." };
    if (!TIME.test(w.startsTime) || !TIME.test(w.endsTime)) return { ok: false, error: "Times must be HH:MM." };
    if (toMinutes(w.endsTime) <= toMinutes(w.startsTime)) {
      return { ok: false, error: `A window ends before it starts (${w.startsTime}–${w.endsTime}).` };
    }
    if (!Number.isInteger(w.slotMinutes) || w.slotMinutes < 5 || w.slotMinutes > 120) {
      return { ok: false, error: "Call length must be between 5 and 120 minutes." };
    }
    if (!Number.isInteger(w.strideMinutes) || w.strideMinutes < w.slotMinutes || w.strideMinutes > 240) {
      return { ok: false, error: "The gap between call starts cannot be shorter than the call." };
    }
    if (toMinutes(w.endsTime) - toMinutes(w.startsTime) < w.slotMinutes) {
      return { ok: false, error: `${w.startsTime}–${w.endsTime} is too short for one call.` };
    }
  }
  // Overlapping windows on one day would generate overlapping slots, which
  // the database refuses one by one; say so plainly instead.
  for (let day = 0; day < 7; day++) {
    const list = windows.filter((w) => w.weekday === day).sort((a, b) => a.startsTime.localeCompare(b.startsTime));
    for (let i = 1; i < list.length; i++) {
      if (toMinutes(list[i].startsTime) < toMinutes(list[i - 1].endsTime)) {
        return { ok: false, error: "Two windows on the same day overlap." };
      }
    }
  }

  const supabase = await createServerSupabaseClient();
  const { data: old, error: readError } = await supabase
    .from("practitioner_availability")
    .select("id")
    .eq("practitioner_id", practitioner.id);
  if (readError) return { ok: false, error: readError.message };

  if (windows.length) {
    const { error } = await supabase.from("practitioner_availability").insert(
      windows.map((w) => ({
        practitioner_id: practitioner.id,
        weekday: w.weekday,
        starts_time: w.startsTime,
        ends_time: w.endsTime,
        slot_minutes: w.slotMinutes,
        stride_minutes: w.strideMinutes,
        active: true,
      })),
    );
    if (error) return { ok: false, error: error.message };
  }
  const oldIds = (old ?? []).map((r) => r.id);
  if (oldIds.length) {
    const { error } = await supabase.from("practitioner_availability").delete().in("id", oldIds);
    if (error) return { ok: false, error: `Saved, but the old pattern could not be removed: ${error.message}` };
  }

  const made = await refreshSlots();
  revalidatePath(PATH);
  return {
    ok: true,
    message:
      made === null
        ? "Saved. The open times could not be rebuilt just now; they will be on the next hourly run."
        : `Saved. ${made} open ${made === 1 ? "time" : "times"} now on the calendar. Times already held or booked were kept.`,
  };
}

/** PKT has no daylight saving, so a fixed +05:00 is exact. */
function pktToIso(local: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(local)) return null;
  const d = new Date(`${local}:00+05:00`);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

/**
 * Block out time. Held and booked slots inside the range are not touched:
 * those are people, and moving them is a conversation. They are listed
 * first, and the block is only saved once Ayma confirms she has seen them.
 */
export async function addBlackout(input: {
  startsLocal: string;
  endsLocal: string;
  reason: string;
  confirmed: boolean;
}): Promise<ConsultationActionResult> {
  const g = await guard();
  if ("error" in g) return { ok: false, error: g.error as string };
  const practitioner = await getConsultingPractitioner();
  if (!practitioner) return { ok: false, error: "No approved practitioner profile exists." };

  const startsAt = pktToIso(input.startsLocal);
  const endsAt = pktToIso(input.endsLocal);
  if (!startsAt || !endsAt) return { ok: false, error: "Choose a start and an end." };
  if (endsAt <= startsAt) return { ok: false, error: "The end must be after the start." };

  const admin = createAdminSupabaseClient();
  const { data: clash } = await admin
    .from("availability_slots")
    .select("starts_at, status, lead_id")
    .eq("practitioner_id", practitioner.id)
    .in("status", ["held", "booked"])
    .lt("starts_at", endsAt)
    .gt("ends_at", startsAt)
    .order("starts_at");

  if ((clash ?? []).length && !input.confirmed) {
    const ids = [...new Set((clash ?? []).map((c) => c.lead_id).filter((x): x is string => Boolean(x)))];
    const { data: leads } = ids.length ? await admin.from("leads").select("id, full_name").in("id", ids) : { data: [] };
    const names = new Map((leads ?? []).map((l) => [l.id, l.full_name?.trim() || "Client"]));
    return {
      ok: false,
      needsConfirm: true,
      affected: (clash ?? []).map((c) => ({
        startsAt: c.starts_at,
        status: c.status,
        clientName: (c.lead_id && names.get(c.lead_id)) || "Client",
      })),
    };
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.from("practitioner_blackouts").insert({
    practitioner_id: practitioner.id,
    starts_at: startsAt,
    ends_at: endsAt,
    reason: input.reason.trim().slice(0, 200) || null,
  });
  if (error) return { ok: false, error: error.message };

  await refreshSlots();
  revalidatePath(PATH);
  return {
    ok: true,
    message: (clash ?? []).length
      ? `Blocked. ${clash!.length} existing ${clash!.length === 1 ? "booking stays" : "bookings stay"} in place; contact ${clash!.length === 1 ? "that client" : "those clients"} to move them.`
      : "Blocked. Those times are no longer offered.",
  };
}

export async function removeBlackout(id: string): Promise<ConsultationActionResult> {
  const g = await guard();
  if ("error" in g) return { ok: false, error: g.error as string };
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.from("practitioner_blackouts").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  await refreshSlots();
  revalidatePath(PATH);
  return { ok: true, message: "Removed. Those times are offered again." };
}

export async function saveConsultationSettings(input: {
  leadTimeHours: number;
  horizonDays: number;
  holdMinutes: number;
  rescheduleHours: number;
  guidelinesMarkdown: string;
}): Promise<ConsultationActionResult> {
  const g = await guard();
  if ("error" in g) return { ok: false, error: g.error as string };
  const int = (n: number, lo: number, hi: number) => Number.isInteger(n) && n >= lo && n <= hi;
  if (!int(input.leadTimeHours, 0, 168)) return { ok: false, error: "Notice must be 0 to 168 hours." };
  if (!int(input.horizonDays, 1, 60)) return { ok: false, error: "Booking window must be 1 to 60 days." };
  if (!int(input.holdMinutes, 15, 1440)) return { ok: false, error: "Hold must be 15 to 1440 minutes." };
  if (!int(input.rescheduleHours, 0, 168)) return { ok: false, error: "Reschedule notice must be 0 to 168 hours." };
  if (input.guidelinesMarkdown.length > 6000) return { ok: false, error: "Guidelines are too long (6,000 characters)." };

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase
    .from("consultation_settings")
    .update({
      lead_time_hours: input.leadTimeHours,
      horizon_days: input.horizonDays,
      hold_minutes: input.holdMinutes,
      reschedule_hours: input.rescheduleHours,
      guidelines_markdown: input.guidelinesMarkdown.trim(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", 1);
  if (error) return { ok: false, error: error.message };
  await refreshSlots();
  revalidatePath(PATH);
  return { ok: true, message: "Settings saved." };
}

/**
 * Paste a video link by hand: the RingCentral fallback (§7). When the
 * client was told "your link will follow", ticking `notify` sends it.
 */
export async function setAppointmentLink(input: {
  id: string;
  joinUrl: string;
  notify: boolean;
}): Promise<ConsultationActionResult> {
  const g = await guard();
  if ("error" in g) return { ok: false, error: g.error as string };
  const url = input.joinUrl.trim();
  if (url) {
    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      return { ok: false, error: "That is not a valid link." };
    }
    if (parsed.protocol !== "https:") return { ok: false, error: "The link must start with https://" };
  }

  const supabase = await createServerSupabaseClient();
  const { data: appt, error } = await supabase
    .from("appointments")
    .update({ join_url: url || null, updated_at: new Date().toISOString() })
    .eq("id", input.id)
    .select("lead_id, starts_at")
    .single();
  if (error || !appt) return { ok: false, error: error?.message ?? "Appointment not found." };

  if (!url || !input.notify) {
    revalidatePath(PATH);
    return { ok: true, message: "Link saved." };
  }

  const admin = createAdminSupabaseClient();
  const { data: lead } = appt.lead_id
    ? await admin.from("leads").select("full_name, email").eq("id", appt.lead_id).maybeSingle()
    : { data: null };
  const settings = await getConsultationSettings();
  const sent = await sendConsultationEmail({
    kind: "confirmed",
    toEmail: lead?.email ?? null,
    name: lead?.full_name ?? null,
    startsAt: appt.starts_at,
    joinUrl: url,
    minutes: await callMinutes(appt.lead_id),
    guidelinesMarkdown: settings.guidelinesMarkdown,
  });
  revalidatePath(PATH);
  return sent.ok
    ? { ok: true, message: `Link saved and emailed for ${formatSlot(appt.starts_at)}.` }
    : { ok: true, message: `Link saved, but the email failed (${sent.message}). Send it on WhatsApp.` };
}

/**
 * Record how a consultation went — HANDOVER-52 §2.3.
 *
 * Always through settle_appointment, the single settlement path: it sets
 * the status, creates the earning when someone is paid (attended, client
 * no-show, late client cancellation), and gives the slot back to the
 * calendar when nobody is charged. Settling twice is refused by the
 * database. The hourly job deletes the room either way.
 */
export async function settleAppointment(input: {
  id: string;
  outcome: AppointmentOutcome;
  note: string;
}): Promise<ConsultationActionResult> {
  const g = await guard();
  if ("error" in g) return { ok: false, error: g.error as string };
  if (!OUTCOMES.includes(input.outcome)) return { ok: false, error: "Unknown outcome." };

  const { data: earningId, error } = await createAdminSupabaseClient().rpc("settle_appointment", {
    p_appt: input.id,
    p_outcome: input.outcome,
    p_by: g.user.id,
    p_note: input.note.trim() || null,
  });
  if (error) {
    if (error.message.includes("already settled")) return { ok: false, error: "This consultation is already settled." };
    return { ok: false, error: error.message };
  }

  revalidatePath(PATH);
  return {
    ok: true,
    message: earningId
      ? "Saved. The practitioner's fee is recorded; it becomes payable once the consultation note is written."
      : "Saved. Nobody is charged, and the time is open again if it is still ahead.",
  };
}

const OUTCOMES: AppointmentOutcome[] = [
  "attended",
  "client_no_show",
  "cancelled_by_client",
  "cancelled_by_practitioner",
  "practitioner_no_show",
  "technical_failure",
];

/**
 * Create the RingCentral room for an appointment booked without one (the
 * room could not be made at booking time). Emails the client the link
 * when `notify` is set, as they were told it would follow.
 */
export async function createVideoRoom(input: { id: string; notify: boolean }): Promise<ConsultationActionResult> {
  const g = await guard();
  if ("error" in g) return { ok: false, error: g.error as string };

  const admin = createAdminSupabaseClient();
  const { data: appt } = await admin
    .from("appointments")
    .select("lead_id, starts_at, status, join_url, provider_ref")
    .eq("id", input.id)
    .maybeSingle();
  if (!appt) return { ok: false, error: "Appointment not found." };
  if (appt.status !== "scheduled") return { ok: false, error: "Only a scheduled consultation can get a room." };
  if (appt.provider_ref) return { ok: false, error: "This consultation already has a RingCentral room." };

  const bridge = await createBridge("Skin assessment call");
  if (!bridge) {
    return { ok: false, error: "RingCentral did not create a room. Try again shortly, or paste a link by hand." };
  }

  const { error } = await admin
    .from("appointments")
    .update({
      join_url: bridge.joinUrl,
      provider_ref: bridge.bridgeId,
      notes: bridge.password ? `Meeting password: ${bridge.password}` : null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.id)
    .is("provider_ref", null);
  if (error) return { ok: false, error: error.message };

  if (!input.notify) {
    revalidatePath(PATH);
    return { ok: true, message: "Room created." };
  }
  const { data: lead } = appt.lead_id
    ? await admin.from("leads").select("full_name, email").eq("id", appt.lead_id).maybeSingle()
    : { data: null };
  const settings = await getConsultationSettings();
  const sent = await sendConsultationEmail({
    kind: "confirmed",
    toEmail: lead?.email ?? null,
    name: lead?.full_name ?? null,
    startsAt: appt.starts_at,
    joinUrl: bridge.joinUrl,
    password: bridge.password,
    minutes: await callMinutes(appt.lead_id),
    guidelinesMarkdown: settings.guidelinesMarkdown,
  });
  revalidatePath(PATH);
  return sent.ok
    ? { ok: true, message: `Room created and the link emailed for ${formatSlot(appt.starts_at)}.` }
    : { ok: true, message: `Room created, but the email failed (${sent.message}). Send the link on WhatsApp.` };
}
