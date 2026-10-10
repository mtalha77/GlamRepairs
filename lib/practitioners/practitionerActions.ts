"use server";

import { revalidatePath } from "next/cache";

import { notifyStudio } from "@/lib/consultation/booking";
import { formatSlot } from "@/lib/consultation/format";
import { repickUrl } from "@/lib/consultation/slots";
import { sendConsultationEmail } from "@/lib/email/sendConsultationEmail";
import { getPublicAppUrl } from "@/lib/leads/photoShortLink";
import { defaultPractitionerId, ownPractitionerProfile } from "@/lib/practitioners/roster";
import { requireStudioMember } from "@/lib/studio/member";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

/**
 * Practitioner management — HANDOVER-52 §2.6, §3.3, §3.5, §4.3.
 *
 * Super-admin actions (verify, rates, caps, go live, suspend, offboard,
 * reassign) and a practitioner's own (bio, can't attend, leave) are
 * separated by the guard each one calls. Every write uses the service role,
 * so the check here is the control, not the button.
 */

export type PractitionerActionResult = { ok: true; message: string } | { ok: false; error: string };

async function superAdmin() {
  const { user, member } = await requireStudioMember();
  if (!user || !member) return { error: "Not signed in." } as const;
  if (!member.isSuperAdmin) return { error: "Only a super admin can do this." } as const;
  return { userId: user.id } as const;
}

async function self() {
  const { user, member } = await requireStudioMember();
  if (!user || !member) return { error: "Not signed in." } as const;
  const profile = await ownPractitionerProfile(user.id);
  if (!profile) return { error: "You do not have a practitioner profile." } as const;
  return { userId: user.id, profile } as const;
}

function revalidate() {
  revalidatePath("/studio/practitioners");
  revalidatePath("/studio/practice");
  revalidatePath("/studio/consultations");
}

// ── Super admin ─────────────────────────────────────────────────────────

export async function updatePractitionerDetails(input: {
  id: string;
  profilePhotoVerified: boolean;
  payoutMethod: string;
  payoutDetailRef: string;
  maxPerDay: number;
  maxPerWeek: number;
}): Promise<PractitionerActionResult> {
  const g = await superAdmin();
  if ("error" in g) return { ok: false, error: g.error as string };
  if (!Number.isInteger(input.maxPerDay) || input.maxPerDay < 1 || input.maxPerDay > 20) {
    return { ok: false, error: "Daily cap must be between 1 and 20." };
  }
  if (!Number.isInteger(input.maxPerWeek) || input.maxPerWeek < input.maxPerDay) {
    return { ok: false, error: "Weekly cap must be at least the daily cap." };
  }
  const { error } = await createAdminSupabaseClient()
    .from("practitioner_profiles")
    .update({
      profile_photo_verified: input.profilePhotoVerified,
      payout_method: input.payoutMethod.trim() || null,
      payout_detail_ref: input.payoutDetailRef.trim() || null,
      max_per_day: input.maxPerDay,
      max_per_week: input.maxPerWeek,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.id);
  if (error) return { ok: false, error: error.message };
  revalidate();
  return { ok: true, message: "Saved." };
}

/**
 * A new rate from now on (§2.2). The current window is closed at this
 * instant and a new one opens, so consultations already booked keep the
 * fee they were booked at.
 */
export async function setPractitionerRate(input: {
  id: string;
  practitionerRupees: number;
  platformRupees: number;
  note: string;
}): Promise<PractitionerActionResult> {
  const g = await superAdmin();
  if ("error" in g) return { ok: false, error: g.error as string };
  const prac = Math.round(input.practitionerRupees * 100);
  const plat = Math.round(input.platformRupees * 100);
  if (!Number.isFinite(prac) || !Number.isFinite(plat) || prac < 0 || plat < 0 || prac + plat <= 0) {
    return { ok: false, error: "Enter the two amounts in rupees." };
  }
  const admin = createAdminSupabaseClient();
  const now = new Date().toISOString();
  const { error: closeError } = await admin
    .from("practitioner_rates")
    .update({ effective_to: now })
    .eq("practitioner_id", input.id)
    .is("effective_to", null);
  if (closeError) return { ok: false, error: closeError.message };
  const { error } = await admin.from("practitioner_rates").insert({
    practitioner_id: input.id,
    practitioner_fee_minor: prac,
    platform_fee_minor: plat,
    effective_from: now,
    note: input.note.trim() || null,
    set_by: g.userId,
  });
  if (error) return { ok: false, error: error.message };
  revalidate();
  return { ok: true, message: "New rate in force from now. Bookings already made keep their fee." };
}

/** Approve the profile: the database refuses without a verified degree, a checked photo and a payout method. */
export async function makePractitionerLive(id: string): Promise<PractitionerActionResult> {
  const g = await superAdmin();
  if ("error" in g) return { ok: false, error: g.error as string };
  const now = new Date().toISOString();
  const { error } = await createAdminSupabaseClient()
    .from("practitioner_profiles")
    .update({ status: "approved", approved_at: now, approved_by: g.userId, accepting_clients: true, can_review: true, updated_at: now })
    .eq("id", id);
  if (error) {
    const m = error.message;
    if (m.includes("verified degree")) return { ok: false, error: "Verify their degree document first." };
    if (m.includes("photograph")) return { ok: false, error: "Tick the photograph as checked first." };
    if (m.includes("payout method")) return { ok: false, error: "Record a payout method first." };
    if (m.includes("approved_needs_detail")) return { ok: false, error: "They need a photograph and a bio of more than 80 characters." };
    return { ok: false, error: m };
  }
  revalidate();
  return { ok: true, message: "Live. Their hours now produce bookable times." };
}

export async function suspendPractitioner(input: { id: string; reason: string }): Promise<PractitionerActionResult> {
  const g = await superAdmin();
  if ("error" in g) return { ok: false, error: g.error as string };
  if (input.reason.trim().length < 5) return { ok: false, error: "Give a reason." };
  const now = new Date().toISOString();
  const { error } = await createAdminSupabaseClient()
    .from("practitioner_profiles")
    .update({ status: "suspended", suspended_at: now, suspended_reason: input.reason.trim(), accepting_clients: false, can_review: false, updated_at: now })
    .eq("id", input.id);
  if (error) return { ok: false, error: error.message };
  revalidate();
  return { ok: true, message: "Suspended. No new times are offered; booked consultations stay until you reassign them." };
}

export async function offboardPractitionerAsAdmin(id: string): Promise<PractitionerActionResult> {
  const g = await superAdmin();
  if ("error" in g) return { ok: false, error: g.error as string };
  return offboard(id, g.userId, "Offboarded by a super admin");
}

export async function reassignAppointment(input: { appointmentId: string; toPractitionerId: string }): Promise<PractitionerActionResult> {
  const g = await superAdmin();
  if ("error" in g) return { ok: false, error: g.error as string };
  const { error } = await createAdminSupabaseClient().rpc("reassign_appointment", {
    p_appt: input.appointmentId,
    p_to: input.toPractitionerId,
    p_by: g.userId,
  });
  if (error) {
    if (error.message.includes("busy")) return { ok: false, error: "That practitioner already has a booking at that time." };
    return { ok: false, error: error.message };
  }
  revalidate();
  return { ok: true, message: "Reassigned. The video link is unchanged." };
}

// ── The practitioner herself ────────────────────────────────────────────

export async function updateOwnBio(bio: string): Promise<PractitionerActionResult> {
  const g = await self();
  if ("error" in g) return { ok: false, error: g.error as string };
  const text = bio.trim();
  if (text.length <= 80) return { ok: false, error: "Write a little more: the bio needs more than 80 characters." };
  if (text.length > 1200) return { ok: false, error: "Keep it under 1,200 characters." };
  const { error } = await createAdminSupabaseClient()
    .from("practitioner_profiles")
    .update({ bio: text, updated_at: new Date().toISOString() })
    .eq("id", g.profile.id);
  if (error) return { ok: false, error: error.message };
  revalidate();
  return { ok: true, message: "Bio saved." };
}

/**
 * "I can't make this one" (§3.5). Hands the consultation to Ayma if she is
 * free at that time; if not, cancels it (nobody is charged, the time is
 * released) and emails the client a link to choose another time, which
 * books at once because they have already paid.
 */
export async function cannotAttend(appointmentId: string): Promise<PractitionerActionResult> {
  const g = await self();
  if ("error" in g) return { ok: false, error: g.error as string };
  const admin = createAdminSupabaseClient();
  const { data: appt } = await admin
    .from("appointments")
    .select("id, practitioner_id, lead_id, starts_at, status")
    .eq("id", appointmentId)
    .maybeSingle();
  if (!appt || appt.practitioner_id !== g.profile.id) return { ok: false, error: "This is not one of your consultations." };
  if (appt.status !== "scheduled") return { ok: false, error: "This consultation is no longer scheduled." };

  const to = await defaultPractitionerId(g.profile.id);
  if (to) {
    const { error } = await admin.rpc("reassign_appointment", { p_appt: appt.id, p_to: to, p_by: g.userId });
    if (!error) {
      await notifyStudio({
        title: "Consultation handed over",
        body: `${g.profile.full_name} cannot attend ${formatSlot(appt.starts_at)}. It has been moved to you.`,
        leadId: appt.lead_id,
        href: "/studio/consultations",
      });
      revalidate();
      return { ok: true, message: "Thank you. This consultation has been handed to Ayma." };
    }
  }

  const { error: settleError } = await admin.rpc("settle_appointment", {
    p_appt: appt.id,
    p_outcome: "cancelled_by_practitioner",
    p_by: g.userId,
    p_note: "Practitioner could not attend",
  });
  if (settleError) return { ok: false, error: settleError.message };

  let emailed = false;
  if (appt.lead_id) {
    const { data: lead } = await admin.from("leads").select("full_name, email").eq("id", appt.lead_id).maybeSingle();
    const sent = await sendConsultationEmail({
      kind: "repick",
      toEmail: lead?.email ?? null,
      name: lead?.full_name ?? null,
      pickUrl: repickUrl(getPublicAppUrl(), appt.lead_id),
    });
    emailed = sent.ok;
  }
  await notifyStudio({
    title: "Consultation cancelled by the practitioner",
    body: `${g.profile.full_name} cannot attend ${formatSlot(appt.starts_at)} and nobody else was free. ${emailed ? "The client has been emailed a link to choose another time." : "Please contact the client to rebook."}`,
    leadId: appt.lead_id,
    href: appt.lead_id ? `/studio/customers/${appt.lead_id}` : "/studio/consultations",
  });
  revalidate();
  return { ok: true, message: "Cancelled. The client has been asked to choose another time, and the studio has been told." };
}

/** Leave GlamRepairs (Talha, 10 October 2026). Bookings go to Ayma. */
export async function leaveGlamRepairs(reason: string): Promise<PractitionerActionResult> {
  const g = await self();
  if ("error" in g) return { ok: false, error: g.error as string };
  return offboard(g.profile.id, g.userId, reason.trim() || "Left of their own accord");
}

async function offboard(profileId: string, by: string, reason: string): Promise<PractitionerActionResult> {
  const admin = createAdminSupabaseClient();
  const to = await defaultPractitionerId(profileId);
  if (!to) return { ok: false, error: "There is nobody to hand the bookings to." };
  const { data, error } = await admin.rpc("offboard_practitioner", { p_profile: profileId, p_to: to, p_by: by, p_reason: reason });
  if (error) return { ok: false, error: error.message };

  const { data: profile } = await admin.from("practitioner_profiles").select("full_name").eq("id", profileId).maybeSingle();
  const failed = data?.failed ?? [];
  await notifyStudio({
    title: failed.length ? "Practitioner left: bookings need assigning" : "Practitioner left",
    body:
      `${profile?.full_name ?? "A practitioner"} has left. ${data?.moved ?? 0} booked ${data?.moved === 1 ? "consultation was" : "consultations were"} moved to Ayma.` +
      (failed.length
        ? ` ${failed.length} clashed with her diary and still need someone: ${failed.map((f) => formatSlot(f.starts_at)).join("; ")}.`
        : ""),
    leadId: null,
    href: "/studio/consultations",
  });
  revalidate();
  return {
    ok: true,
    message: failed.length
      ? `Done. ${data?.moved ?? 0} moved to Ayma; ${failed.length} need assigning in Consultations.`
      : `Done. ${data?.moved ?? 0} booked ${data?.moved === 1 ? "consultation has" : "consultations have"} been moved to Ayma.`,
  };
}
