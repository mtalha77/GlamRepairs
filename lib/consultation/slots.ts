import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

import type { PublicSlot } from "@/lib/consultation/format";
import { saveFunnelProgress } from "@/lib/leads/insertLead";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

/**
 * Consultation slots — HANDOVER-50.
 *
 * Everything here runs with the service role, because the booking
 * functions (hold_slot, confirm_slot, ...) are executable by nobody else:
 * when anon could call them, anyone with the public key could book without
 * paying. Clients never name a lead id. The funnel identifies itself by its
 * session id, which is what the lead row is keyed on from the first step;
 * a re-pick after payment identifies itself with a signed link.
 *
 * A slot moves open → held (on pick, for `hold_minutes`) → booked (when
 * payment is verified). An abandoned hold lapses back to open on its own.
 */

export type ConsultationSettings = {
  leadTimeHours: number;
  horizonDays: number;
  holdMinutes: number;
  rescheduleHours: number;
  guidelinesMarkdown: string;
};

const DEFAULT_SETTINGS: ConsultationSettings = {
  leadTimeHours: 24,
  horizonDays: 21,
  holdMinutes: 120,
  rescheduleHours: 12,
  guidelinesMarkdown: "",
};

export async function getConsultationSettings(): Promise<ConsultationSettings> {
  const { data, error } = await createAdminSupabaseClient()
    .from("consultation_settings")
    .select("lead_time_hours, horizon_days, hold_minutes, reschedule_hours, guidelines_markdown")
    .eq("id", 1)
    .maybeSingle();
  if (error || !data) {
    if (error) console.error("[consultation settings]", error.message);
    return DEFAULT_SETTINGS;
  }
  return {
    leadTimeHours: data.lead_time_hours,
    horizonDays: data.horizon_days,
    holdMinutes: data.hold_minutes,
    rescheduleHours: data.reschedule_hours,
    guidelinesMarkdown: data.guidelines_markdown,
  };
}

/**
 * Open slots a client may pick: past the lead time, inside the horizon.
 * Expired holds are released first (§4.4) so the grid never shows a time as
 * taken by someone who walked away an hour ago.
 */
export async function listBookableSlots(settings?: ConsultationSettings): Promise<PublicSlot[]> {
  const s = settings ?? (await getConsultationSettings());
  const supabase = createAdminSupabaseClient();
  await supabase.rpc("release_expired_holds");
  const from = new Date(Date.now() + s.leadTimeHours * 3_600_000).toISOString();
  const to = new Date(Date.now() + s.horizonDays * 86_400_000).toISOString();
  const { data, error } = await supabase
    .from("availability_slots")
    .select("id, starts_at, ends_at")
    .eq("status", "open")
    .gte("starts_at", from)
    .lte("starts_at", to)
    .order("starts_at")
    .limit(1000);
  if (error) {
    console.error("[listBookableSlots]", error.message);
    return [];
  }
  // With more than one practitioner the same time can be open twice. The
  // client chooses a time, not a person (HANDOVER-52 §2.2), so show each
  // time once and spread the bookings by picking one of them at random.
  const byStart = new Map<string, { id: string; starts_at: string; ends_at: string }[]>();
  for (const r of data ?? []) byStart.set(r.starts_at, [...(byStart.get(r.starts_at) ?? []), r]);
  return [...byStart.values()].map((same) => {
    const r = same[Math.floor(Math.random() * same.length)];
    return { id: r.id, startsAt: r.starts_at, endsAt: r.ends_at };
  });
}

export type LeadSlot = {
  slotId: string;
  startsAt: string;
  endsAt: string;
  status: "held" | "booked";
  heldUntil: string | null;
};

/** The slot this lead currently holds or has booked, if any. */
export async function slotForLead(leadId: string): Promise<LeadSlot | null> {
  const supabase = createAdminSupabaseClient();
  await supabase.rpc("release_expired_holds");
  const { data } = await supabase
    .from("availability_slots")
    .select("id, starts_at, ends_at, status, held_until")
    .eq("lead_id", leadId)
    .in("status", ["held", "booked"])
    .order("starts_at")
    .limit(1)
    .maybeSingle();
  if (!data) return null;
  return {
    slotId: data.id,
    startsAt: data.starts_at,
    endsAt: data.ends_at,
    status: data.status as "held" | "booked",
    heldUntil: data.held_until,
  };
}

type LeadFacts = {
  id: string;
  isTest: boolean;
  deleted: boolean;
  includesVideoCall: boolean;
  paymentStatus: string | null;
};

async function leadFacts(where: { sessionId?: string; leadId?: string }): Promise<LeadFacts | null> {
  const supabase = createAdminSupabaseClient();
  let query = supabase
    .from("leads")
    .select("id, is_test, deleted_at, selected_plan, includes_video_call, payment_status")
    .limit(1);
  query = where.leadId ? query.eq("id", where.leadId) : query.eq("session_id", where.sessionId ?? "");
  const { data } = await query.maybeSingle();
  if (!data) return null;
  // The lead's own flag is set by a trigger from the plan; the plan table
  // is the fallback for a row written before that trigger existed.
  let includesVideoCall = Boolean(data.includes_video_call);
  if (!includesVideoCall && data.selected_plan) {
    const { data: plan } = await supabase
      .from("plan_settings")
      .select("includes_video_call")
      .eq("plan_key", data.selected_plan)
      .maybeSingle();
    includesVideoCall = Boolean(plan?.includes_video_call);
  }
  return {
    id: data.id,
    isTest: Boolean(data.is_test),
    deleted: Boolean(data.deleted_at),
    includesVideoCall,
    paymentStatus: data.payment_status,
  };
}

export type HoldResult =
  | { ok: true; slot: LeadSlot }
  | { ok: false; reason: "taken" | "not_eligible" | "test_lead" | "no_lead" | "error"; message: string };

const TAKEN = "That time was just taken, please choose another.";

async function holdForLead(lead: LeadFacts, slotId: string): Promise<HoldResult> {
  if (lead.deleted || !lead.includesVideoCall) {
    return { ok: false, reason: "not_eligible", message: "Your plan does not include a video consultation." };
  }
  // §9 — test leads cannot book: a test on production would otherwise take
  // a real client's time.
  if (lead.isTest) {
    return { ok: false, reason: "test_lead", message: "Test submissions cannot hold a consultation time." };
  }
  const settings = await getConsultationSettings();
  const { data: token, error } = await createAdminSupabaseClient().rpc("hold_slot", {
    p_slot: slotId,
    p_lead: lead.id,
    p_minutes: settings.holdMinutes,
  });
  if (error) {
    console.error("[hold_slot]", error.message);
    return { ok: false, reason: "error", message: "Something went wrong holding that time. Please try again." };
  }
  // null is how the database says someone else got there first.
  if (!token) return { ok: false, reason: "taken", message: TAKEN };
  const slot = await slotForLead(lead.id);
  return slot ? { ok: true, slot } : { ok: false, reason: "taken", message: TAKEN };
}

/**
 * Hold a slot for the funnel session. The lead row normally exists from the
 * first step (progress is saved as the client goes); if it does not yet,
 * the minimum is written now so the hold has something to belong to.
 */
export async function holdForSession(input: {
  sessionId: string;
  slotId: string;
  fullName?: string;
  email?: string;
  selectedPlan?: string | null;
}): Promise<HoldResult> {
  let lead = await leadFacts({ sessionId: input.sessionId });
  if (!lead) {
    await saveFunnelProgress({
      sessionId: input.sessionId,
      fullName: input.fullName ?? "",
      email: input.email ?? "",
      phone: "",
      selectedPlan: input.selectedPlan ?? null,
    });
    lead = await leadFacts({ sessionId: input.sessionId });
  }
  if (!lead) return { ok: false, reason: "no_lead", message: "Please go back a step and try again." };
  return holdForLead(lead, input.slotId);
}

export async function slotForSession(sessionId: string): Promise<{ eligible: boolean; slot: LeadSlot | null }> {
  const lead = await leadFacts({ sessionId });
  if (!lead) return { eligible: false, slot: null };
  return { eligible: lead.includesVideoCall && !lead.isTest, slot: await slotForLead(lead.id) };
}

/**
 * Submission re-arms the hold (§1): the payment window runs from when the
 * client is shown the bank details, not from when they picked mid-funnel.
 * A hold that already lapsed is not revived.
 */
export async function extendHoldOnSubmit(leadId: string): Promise<string | null> {
  const settings = await getConsultationSettings();
  const { data, error } = await createAdminSupabaseClient().rpc("extend_hold", {
    p_lead: leadId,
    p_minutes: settings.holdMinutes,
  });
  if (error) console.error("[extend_hold]", error.message);
  return (data as string | null) ?? null;
}

// ── Signed re-pick links ────────────────────────────────────────────────
// A client whose time was lost after paying is emailed a link to choose
// again (§1, the row that "will happen"). The link carries the lead id and
// an HMAC of it, so it cannot be forged or pointed at someone else's lead.

function linkKey(): string {
  const key = process.env.CONSULTATION_LINK_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("No key available to sign consultation links.");
  return key;
}

export function signLead(leadId: string): string {
  return createHmac("sha256", linkKey()).update(`consultation:${leadId}`).digest("base64url");
}

export function verifyLeadSignature(leadId: string, signature: string): boolean {
  const expected = Buffer.from(signLead(leadId));
  const given = Buffer.from(signature);
  return expected.length === given.length && timingSafeEqual(expected, given);
}

export function repickUrl(appBase: string, leadId: string): string {
  return `${appBase.replace(/\/$/, "")}/consultation/pick?l=${leadId}&s=${signLead(leadId)}`;
}

export async function leadFactsById(leadId: string) {
  return leadFacts({ leadId });
}

export async function holdForLeadId(leadId: string, slotId: string): Promise<HoldResult> {
  const lead = await leadFacts({ leadId });
  if (!lead) return { ok: false, reason: "no_lead", message: "We could not find your booking." };
  return holdForLead(lead, slotId);
}
