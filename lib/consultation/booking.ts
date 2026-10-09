import "server-only";

import { CONSULTATION_TZ, formatSlot } from "@/lib/consultation/format";
import { createBridge, deleteBridge } from "@/lib/consultation/ringcentral";
import {
  getConsultationSettings,
  leadFactsById,
  repickUrl,
  slotForLead,
} from "@/lib/consultation/slots";
import { sendConsultationEmail } from "@/lib/email/sendConsultationEmail";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

/**
 * Turning a held slot into an appointment — HANDOVER-50 §6.
 *
 * Runs when payment is verified (studio) and when a paid client picks a new
 * time from a re-pick link. Every outcome is visible to someone:
 *
 *   booked          appointment row, confirmation email, room link if
 *                   RingCentral answered; if it did not, the studio is told
 *                   to paste a link in, and the booking stands regardless.
 *   lost            the hold lapsed and someone else took the time. The
 *                   client is emailed to choose again and the studio is
 *                   told. Never silence: this is the case that would
 *                   otherwise leave someone paid with no appointment.
 *   no_time         the plan includes a call but no time was chosen.
 *                   Emailed a link to choose; studio told.
 *   already_booked  a second verify click, or a race with one. Nothing done.
 */

export type BookingOutcome =
  | { kind: "booked"; appointmentId: string; startsAt: string; linkMissing: boolean }
  | { kind: "lost" | "no_time"; emailed: boolean }
  | { kind: "already_booked" | "not_applicable" | "test_lead" }
  | { kind: "error"; message: string };

/** One notification per super admin, so it lands in Ayma's bell. */
export async function notifyStudio(input: { title: string; body: string; leadId: string | null; href: string }) {
  const supabase = createAdminSupabaseClient();
  const { data: admins } = await supabase
    .from("studio_members")
    .select("user_id")
    .or("is_super_admin.eq.true,role.eq.owner");
  const rows = (admins ?? []).map((a) => ({
    recipient_id: a.user_id,
    type: "consultation_alert" as const,
    title: input.title,
    body: input.body,
    href: input.href,
    lead_id: input.leadId,
  }));
  if (rows.length === 0) return;
  const { error } = await supabase.from("studio_notifications").insert(rows);
  if (error) console.error("[notifyStudio]", error.message);
}

export async function bookConsultationForLead(
  leadId: string,
  opts: { appBase: string; actorId?: string | null },
): Promise<BookingOutcome> {
  const supabase = createAdminSupabaseClient();
  const facts = await leadFactsById(leadId);
  if (!facts || facts.deleted || !facts.includesVideoCall) return { kind: "not_applicable" };
  if (facts.isTest) return { kind: "test_lead" };

  const { data: lead } = await supabase
    .from("leads")
    .select("id, full_name, email, client_account_id")
    .eq("id", leadId)
    .maybeSingle();
  if (!lead) return { kind: "not_applicable" };

  const { data: existing } = await supabase
    .from("appointments")
    .select("id")
    .eq("lead_id", leadId)
    .eq("status", "scheduled")
    .limit(1)
    .maybeSingle();
  if (existing) return { kind: "already_booked" };

  const customerHref = `/studio/customers/${leadId}`;
  const slot = await slotForLead(leadId);

  if (!slot) {
    const sent = await sendConsultationEmail({
      kind: "no_time",
      toEmail: lead.email,
      name: lead.full_name,
      pickUrl: repickUrl(opts.appBase, leadId),
    });
    await notifyStudio({
      title: "Paid, but no consultation time chosen",
      body: `${lead.full_name ?? "A client"} has paid for a plan with a video call and has not picked a time. ${sent.ok ? "They have been emailed a link to choose one." : `The email to choose a time failed (${sent.message}); please contact them.`}`,
      leadId,
      href: customerHref,
    });
    return { kind: "no_time", emailed: sent.ok };
  }

  // A slot this lead already holds as `booked` with no appointment yet means
  // another verify is mid-flight (or crashed between the two writes).
  const { data: confirmed, error: confirmError } =
    slot.status === "booked" ? { data: true, error: null } : await supabase.rpc("confirm_slot", { p_slot: slot.slotId, p_lead: leadId });
  if (confirmError) return { kind: "error", message: confirmError.message };

  if (!confirmed) {
    // Lost: the hold lapsed and the time went to someone else. Re-read
    // first, in case a concurrent verify booked it for this same lead.
    const again = await slotForLead(leadId);
    if (again?.status === "booked") return { kind: "already_booked" };
    const sent = await sendConsultationEmail({
      kind: "repick",
      toEmail: lead.email,
      name: lead.full_name,
      pickUrl: repickUrl(opts.appBase, leadId),
    });
    await notifyStudio({
      title: "Consultation time lost after payment",
      body: `${lead.full_name ?? "A client"} paid, but their time (${formatSlot(slot.startsAt)}) was taken after their hold lapsed. ${sent.ok ? "They have been emailed a link to choose again." : `The re-pick email failed (${sent.message}); please contact them.`}`,
      leadId,
      href: customerHref,
    });
    return { kind: "lost", emailed: sent.ok };
  }

  const { data: slotRow } = await supabase
    .from("availability_slots")
    .select("practitioner_id")
    .eq("id", slot.slotId)
    .maybeSingle();
  const practitionerId = slotRow?.practitioner_id;
  if (!practitionerId) return { kind: "error", message: "The slot has no practitioner." };

  // HANDOVER-52 §2.2 — the fee in force now is copied onto the appointment,
  // so a later rate change never reprices work already agreed, and
  // settle_appointment refuses an appointment without it.
  const { data: rates, error: rateError } = await supabase.rpc("rate_for", {
    p_practitioner: practitionerId,
    p_at: new Date().toISOString(),
  });
  const rate = rates?.[0];
  if (rateError || !rate) {
    await notifyStudio({
      title: "Consultation could not be booked",
      body: `The time was confirmed for ${lead.full_name ?? "a client"} but no fee could be found for the practitioner (${rateError?.message ?? "no rate"}). Please book it by hand.`,
      leadId,
      href: customerHref,
    });
    return { kind: "error", message: rateError?.message ?? "No rate for the practitioner." };
  }

  // §6 — never let a RingCentral outage block the booking.
  const bridge = await createBridge("Skin assessment call").catch(() => null);

  const { data: appt, error: apptError } = await supabase
    .from("appointments")
    .insert({
      lead_id: leadId,
      client_account_id: lead.client_account_id,
      practitioner_id: practitionerId,
      starts_at: slot.startsAt,
      ends_at: slot.endsAt,
      slot_id: slot.slotId,
      mode: "video",
      provider: "ringcentral",
      join_url: bridge?.joinUrl ?? null,
      provider_ref: bridge?.bridgeId ?? null,
      notes: bridge?.password ? `Meeting password: ${bridge.password}` : null,
      client_timezone: CONSULTATION_TZ,
      created_by: opts.actorId ?? null,
      practitioner_fee_minor: rate.practitioner_fee_minor,
      platform_fee_minor: rate.platform_fee_minor,
      fee_currency: rate.currency,
      rate_id: rate.rate_id,
    })
    .select("id")
    .single();

  if (apptError || !appt) {
    // The unique slot index or the overlap constraint said no: another
    // booking won. Do not leave an orphan room behind.
    if (bridge) await deleteBridge(bridge.bridgeId);
    const again = await supabase.from("appointments").select("id").eq("lead_id", leadId).eq("status", "scheduled").maybeSingle();
    if (again.data) return { kind: "already_booked" };
    await notifyStudio({
      title: "Consultation could not be booked",
      body: `The time was confirmed for ${lead.full_name ?? "a client"} but the appointment could not be saved (${apptError?.message ?? "unknown"}). Please book it by hand.`,
      leadId,
      href: customerHref,
    });
    return { kind: "error", message: apptError?.message ?? "Appointment insert failed." };
  }

  await supabase.from("availability_slots").update({ appointment_id: appt.id }).eq("id", slot.slotId);

  if (!bridge) {
    await notifyStudio({
      title: "Consultation booked: add a video link",
      body: `${lead.full_name ?? "A client"} is booked for ${formatSlot(slot.startsAt)}, but no RingCentral room could be created. Add a join link in Studio → Consultations; the client has been told it will follow.`,
      leadId,
      href: "/studio/consultations",
    });
  }

  const settings = await getConsultationSettings();
  const sent = await sendConsultationEmail({
    kind: "confirmed",
    toEmail: lead.email,
    name: lead.full_name,
    startsAt: slot.startsAt,
    joinUrl: bridge?.joinUrl ?? null,
    password: bridge?.password ?? null,
    minutes: await callMinutes(leadId),
    guidelinesMarkdown: settings.guidelinesMarkdown,
  });
  if (!sent.ok) {
    await notifyStudio({
      title: "Consultation confirmation email failed",
      body: `${lead.full_name ?? "A client"} is booked for ${formatSlot(slot.startsAt)}, but the confirmation email failed (${sent.message}). Please send them the time and link.`,
      leadId,
      href: "/studio/consultations",
    });
  }

  return { kind: "booked", appointmentId: appt.id, startsAt: slot.startsAt, linkMissing: !bridge };
}

/** Length of the call on this lead's plan, for the emails. */
export async function callMinutes(leadId: string | null): Promise<number> {
  if (!leadId) return 15;
  const supabase = createAdminSupabaseClient();
  const { data: lead } = await supabase.from("leads").select("selected_plan").eq("id", leadId).maybeSingle();
  if (!lead?.selected_plan) return 15;
  const { data: plan } = await supabase
    .from("plan_settings")
    .select("video_minutes")
    .eq("plan_key", lead.selected_plan)
    .maybeSingle();
  return plan?.video_minutes ?? 15;
}
