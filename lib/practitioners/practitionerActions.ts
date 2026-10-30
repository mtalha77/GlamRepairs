"use server";

import { revalidatePath } from "next/cache";

import { notifyStudio } from "@/lib/consultation/booking";
import { formatSlot } from "@/lib/consultation/format";
import { notifyPractitionerOfBooking } from "@/lib/consultation/practitionerNotices";
import { repickUrl } from "@/lib/consultation/slots";
import { sendConsultationEmail } from "@/lib/email/sendConsultationEmail";
import { getPublicAppUrl } from "@/lib/leads/photoShortLink";
import { defaultPractitionerId, ownPractitionerProfile } from "@/lib/practitioners/roster";
import { requireStudioMember } from "@/lib/studio/member";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { isValidTimeZone } from "@/lib/consultation/format";
import { timezonesFor } from "@/lib/countries/timezones";

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
  countryCode: string;
  timezone: string;
}): Promise<PractitionerActionResult> {
  const g = await superAdmin();
  if ("error" in g) return { ok: false, error: g.error as string };
  if (!Number.isInteger(input.maxPerDay) || input.maxPerDay < 1 || input.maxPerDay > 20) {
    return { ok: false, error: "Daily cap must be between 1 and 20." };
  }
  if (!Number.isInteger(input.maxPerWeek) || input.maxPerWeek < input.maxPerDay) {
    return { ok: false, error: "Weekly cap must be at least the daily cap." };
  }
  // Country only, never city (it is what the directory shows). The timezone
  // is what their availability is generated in, so it must be real.
  const countryCode = input.countryCode.trim().toUpperCase();
  if (countryCode && !/^[A-Z]{2}$/.test(countryCode)) {
    return { ok: false, error: "Country must be a two-letter code, for example NG or PK." };
  }
  if (!isValidTimeZone(input.timezone.trim())) {
    return { ok: false, error: "That timezone is not recognised. Use a name like Africa/Lagos or Asia/Karachi." };
  }
  const zones = timezonesFor(countryCode);
  if (zones.length && !zones.includes(input.timezone.trim())) {
    return { ok: false, error: "Choose a timezone in the practitioner's own country." };
  }
  const countryName = countryCode ? new Intl.DisplayNames(["en"], { type: "region" }).of(countryCode) ?? countryCode : null;
  const { error } = await createAdminSupabaseClient()
    .from("practitioner_profiles")
    .update({
      profile_photo_verified: input.profilePhotoVerified,
      payout_method: input.payoutMethod.trim() || null,
      payout_detail_ref: input.payoutDetailRef.trim() || null,
      max_per_day: input.maxPerDay,
      max_per_week: input.maxPerWeek,
      country_code: countryCode || null,
      country_name: countryName,
      timezone: input.timezone.trim(),
      edited_by: g.userId,
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
/** The currency a practitioner is paid in: their country's real price, else PKR. */
async function practitionerCurrency(practitionerId: string): Promise<{ currency: string; minorUnits: number }> {
  const admin = createAdminSupabaseClient();
  const { data: profile } = await admin.from("practitioner_profiles").select("country_code").eq("id", practitionerId).maybeSingle();
  if (profile?.country_code) {
    const { data: price } = await admin
      .from("country_pricing")
      .select("currency, minor_units, note")
      .eq("country_code", profile.country_code)
      .eq("plan_key", "transform")
      .eq("active", true)
      .maybeSingle();
    if (price && !(price.note ?? "").startsWith("Placeholder")) return { currency: price.currency, minorUnits: price.minor_units };
  }
  return { currency: "PKR", minorUnits: 2 };
}

export async function setPractitionerRate(input: {
  id: string;
  practitionerAmount: number;
  platformAmount: number;
  note: string;
}): Promise<PractitionerActionResult> {
  const g = await superAdmin();
  if ("error" in g) return { ok: false, error: g.error as string };
  const admin = createAdminSupabaseClient();
  // Talha, 29 October 2026: a practitioner's rate is in their own country's
  // currency (the one their country is priced in), else rupees.
  const { currency, minorUnits } = await practitionerCurrency(input.id);
  const scale = 10 ** minorUnits;
  const prac = Math.round(input.practitionerAmount * scale);
  const plat = Math.round(input.platformAmount * scale);
  if (!Number.isFinite(prac) || !Number.isFinite(plat) || prac < 0 || plat < 0 || prac + plat <= 0) {
    return { ok: false, error: `Enter the two amounts in ${currency}.` };
  }
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
    currency,
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
    .update({ status: "approved", approved_at: now, approved_by: g.userId, accepting_clients: true, can_review: true, edited_by: g.userId, updated_at: now })
    .eq("id", id);
  if (error) {
    const m = error.message;
    if (m.includes("verified degree")) return { ok: false, error: "Verify their degree document first." };
    if (m.includes("photograph")) return { ok: false, error: "Tick the photograph as checked first." };
    if (m.includes("payout method")) return { ok: false, error: "Record a payout method first." };
    if (m.includes("approved_needs_detail")) return { ok: false, error: "They need a photograph and a bio of more than 80 characters." };
    if (m.includes("public_needs_consent")) return { ok: false, error: "They have not agreed to their profile being shown yet. They switch it on in My practice." };
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
    .update({ status: "suspended", suspended_at: now, suspended_reason: input.reason.trim(), accepting_clients: false, can_review: false, edited_by: g.userId, updated_at: now })
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
  // The new practitioner hears about it the same way as a fresh booking.
  await createAdminSupabaseClient().from("appointments").update({ practitioner_notified_at: null }).eq("id", input.appointmentId);
  await notifyPractitionerOfBooking(input.appointmentId).catch((err) => console.error("[reassign] practitioner notice", err));
  return { ok: true, message: "Reassigned. The video link is unchanged." };
}

// ── The practitioner herself ────────────────────────────────────────────

function bioProblem(text: string): string | null {
  if (text.length <= 80) return "Write a little more: the bio needs more than 80 characters.";
  if (text.length > 1200) return "Keep it under 1,200 characters.";
  return null;
}

async function saveBio(profileId: string, slug: string | null, text: string, by: string): Promise<PractitionerActionResult> {
  const { error } = await createAdminSupabaseClient()
    .from("practitioner_profiles")
    .update({ bio: text, edited_by: by, updated_at: new Date().toISOString() })
    .eq("id", profileId);
  if (error) return { ok: false, error: error.message };
  revalidate();
  if (slug) revalidatePath(`/practitioners/${slug}`);
  return { ok: true, message: "Bio saved." };
}

export async function updateOwnBio(bio: string): Promise<PractitionerActionResult> {
  const g = await self();
  if ("error" in g) return { ok: false, error: g.error as string };
  const text = bio.trim();
  const problem = bioProblem(text);
  if (problem) return { ok: false, error: problem };
  return saveBio(g.profile.id, g.profile.slug, text, g.userId);
}

/** The studio writing a practitioner's bio for them (Talha, 30 October 2026). */
export async function updatePractitionerBio(input: { id: string; bio: string }): Promise<PractitionerActionResult> {
  const g = await superAdmin();
  if ("error" in g) return { ok: false, error: g.error as string };
  const text = input.bio.trim();
  const problem = bioProblem(text);
  if (problem) return { ok: false, error: problem };
  const { data: p } = await createAdminSupabaseClient().from("practitioner_profiles").select("slug").eq("id", input.id).maybeSingle();
  if (!p) return { ok: false, error: "Practitioner not found." };
  return saveBio(input.id, p.slug, text, g.userId);
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
      leadId: appt.lead_id,
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
  const { data: leaving } = await admin.from("practitioner_profiles").select("user_id").eq("id", profileId).maybeSingle();
  if (leaving?.user_id) {
    const { data: seat } = await admin.from("studio_members").select("is_super_admin").eq("user_id", leaving.user_id).maybeSingle();
    if (seat?.is_super_admin) return { ok: false, error: "A super admin cannot be offboarded here. Remove super admin first." };
  }
  const to = await defaultPractitionerId(profileId);
  if (!to) return { ok: false, error: "There is nobody to hand the bookings to." };
  const { data, error } = await admin.rpc("offboard_practitioner", { p_profile: profileId, p_to: to, p_by: by, p_reason: reason });
  if (error) return { ok: false, error: error.message };

  // Talha, 20 October 2026: a practitioner who leaves has no access to
  // anything. Her clients go back to the unassigned list for Ayma, the
  // studio seat goes, and the sign-in is blocked. The profile, notes and
  // earnings stay, for the record and the final payout.
  if (leaving?.user_id) {
    await admin.from("leads").update({ assigned_to: null }).eq("assigned_to", leaving.user_id);
    await admin.from("studio_members").delete().eq("user_id", leaving.user_id);
    const { error: banError } = await admin.auth.admin.updateUserById(leaving.user_id, { ban_duration: "876000h" });
    if (banError) console.error("[offboard] block sign-in", banError.message);
  }

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

// ── Her own hours, limit, time off and public profile ──────────────────

const DATE = /^\d{4}-\d{2}-\d{2}$/;
/** Midnight Pakistan time (no daylight saving) at the start of a date. */
const pktMidnight = (date: string) => new Date(`${date}T00:00:00+05:00`);

async function refreshOpenSlots() {
  const { error } = await createAdminSupabaseClient().rpc("refresh_open_slots", { p_days: 60 });
  if (error) console.error("[refresh_open_slots]", error.message);
}

/** The most consultations she will take in a day (§3.4). Her own call, within the platform's ceiling. */
export async function setOwnDailyLimit(limit: number): Promise<PractitionerActionResult> {
  const g = await self();
  if ("error" in g) return { ok: false, error: g.error as string };
  if (!Number.isInteger(limit) || limit < 1 || limit > 15) return { ok: false, error: "Choose between 1 and 15 a day." };
  const { error } = await createAdminSupabaseClient()
    .from("practitioner_profiles")
    .update({ max_per_day: limit, edited_by: g.userId, updated_at: new Date().toISOString() })
    .eq("id", g.profile.id);
  if (error) return { ok: false, error: error.message };
  await refreshOpenSlots();
  revalidate();
  return { ok: true, message: `Saved. No more than ${limit} ${limit === 1 ? "consultation" : "consultations"} will be offered on any one day.` };
}

/**
 * Days off, whole Pakistan days. Refused while she has bookings inside
 * them: those are handed on first with "I can't attend", so nothing booked
 * is ever silently left without a practitioner.
 */
export async function addOwnTimeOff(input: { from: string; to: string; reason: string }): Promise<PractitionerActionResult> {
  const g = await self();
  if ("error" in g) return { ok: false, error: g.error as string };
  if (!DATE.test(input.from) || !DATE.test(input.to)) return { ok: false, error: "Choose the first and last day." };
  const startsAt = pktMidnight(input.from);
  const endsAt = new Date(pktMidnight(input.to).getTime() + 86_400_000);
  if (endsAt <= startsAt) return { ok: false, error: "The last day cannot be before the first." };
  if (endsAt.getTime() - startsAt.getTime() > 120 * 86_400_000) return { ok: false, error: "Block at most 120 days at a time." };

  const admin = createAdminSupabaseClient();
  const { count } = await admin
    .from("appointments")
    .select("id", { count: "exact", head: true })
    .eq("practitioner_id", g.profile.id)
    .eq("status", "scheduled")
    .lt("starts_at", endsAt.toISOString())
    .gt("ends_at", startsAt.toISOString());
  if (count) {
    return {
      ok: false,
      error: `You have ${count} booked ${count === 1 ? "consultation" : "consultations"} in those days. Use "I can't attend" on ${count === 1 ? "it" : "each one"} first, then block the days.`,
    };
  }
  const { error } = await admin.from("practitioner_blackouts").insert({
    practitioner_id: g.profile.id,
    starts_at: startsAt.toISOString(),
    ends_at: endsAt.toISOString(),
    reason: input.reason.trim().slice(0, 200) || null,
  });
  if (error) return { ok: false, error: error.message };
  await refreshOpenSlots();
  revalidate();
  return { ok: true, message: "Blocked. No times are offered on those days." };
}

export async function removeOwnTimeOff(id: string): Promise<PractitionerActionResult> {
  const g = await self();
  if ("error" in g) return { ok: false, error: g.error as string };
  const { data, error } = await createAdminSupabaseClient()
    .from("practitioner_blackouts")
    .delete()
    .eq("id", id)
    .eq("practitioner_id", g.profile.id)
    .select("id");
  if (error) return { ok: false, error: error.message };
  if (!data?.length) return { ok: false, error: "That time off is not yours to remove." };
  await refreshOpenSlots();
  revalidate();
  return { ok: true, message: "Removed. Those days are offered again." };
}

const PUBLIC_CONSENT_VERSION = "practice-2026-10";

/**
 * What appears about her on the site, and her agreement to it. Nothing is
 * shown until she agrees; while she is taking clients the profile has to
 * stay visible (the database enforces it), so withdrawing means pausing.
 */
export async function saveOwnPublicProfile(input: {
  city: string;
  yearsExperience: string;
  specialisms: string;
  languages: string;
  consent: boolean;
}): Promise<PractitionerActionResult> {
  const g = await self();
  if ("error" in g) return { ok: false, error: g.error as string };
  const list = (v: string) =>
    [...new Set(v.split(",").map((x) => x.trim()).filter(Boolean))].slice(0, 8).map((x) => x.slice(0, 40));
  const years = input.yearsExperience.trim() === "" ? null : Number(input.yearsExperience);
  if (years !== null && (!Number.isInteger(years) || years < 0 || years > 60)) return { ok: false, error: "Years of experience must be a whole number." };

  const p = g.profile;
  const taking = p.status === "approved" && p.accepting_clients;
  if (!input.consent && taking) {
    return { ok: false, error: "While you are taking clients your profile stays visible. To hide it, ask the studio to pause you first." };
  }
  const now = new Date().toISOString();
  const { error } = await createAdminSupabaseClient()
    .from("practitioner_profiles")
    .update({
      edited_by: g.userId,
      city: input.city.trim().slice(0, 80) || null,
      years_experience: years,
      specialisms: list(input.specialisms),
      languages: list(input.languages),
      ...(input.consent
        ? p.public_consent_at
          ? {}
          : { public_consent_at: now, public_consent_version: PUBLIC_CONSENT_VERSION }
        : { public_consent_at: null, public_consent_version: null }),
      updated_at: now,
    })
    .eq("id", p.id);
  if (error) return { ok: false, error: error.message };
  revalidate();
  revalidatePath(`/authors/${p.slug}`);
  return { ok: true, message: input.consent ? "Saved. This is what clients see about you." : "Saved. Nothing about you is shown on the site." };
}
