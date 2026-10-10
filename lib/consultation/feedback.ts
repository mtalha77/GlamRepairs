import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

import { createAdminSupabaseClient } from "@/lib/supabase/admin";

/**
 * Client feedback after a consultation — HANDOVER-52 §3.6.
 *
 * Emailed once, an hour or more after the call, as a link signed per
 * appointment so it cannot be pointed at someone else's. One answer per
 * consultation. `publishable` defaults to false: a comment goes on the site
 * only when the client has ticked that it may.
 */

function key(): string {
  const k = process.env.CONSULTATION_LINK_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!k) throw new Error("No key available to sign feedback links.");
  return k;
}

export function signFeedback(appointmentId: string): string {
  return createHmac("sha256", key()).update(`feedback:${appointmentId}`).digest("base64url");
}

export function verifyFeedback(appointmentId: string, signature: string): boolean {
  if (!/^[0-9a-f-]{36}$/i.test(appointmentId) || !signature) return false;
  const expected = Buffer.from(signFeedback(appointmentId));
  const given = Buffer.from(signature);
  return expected.length === given.length && timingSafeEqual(expected, given);
}

export function feedbackUrl(appBase: string, appointmentId: string): string {
  return `${appBase.replace(/\/$/, "")}/consultation/feedback?a=${appointmentId}&k=${signFeedback(appointmentId)}`;
}

/** What the form needs to show, or null when there is nothing to rate. */
export async function feedbackTarget(appointmentId: string) {
  const supabase = createAdminSupabaseClient();
  const { data: appt } = await supabase
    .from("appointments")
    .select("id, starts_at, ends_at, status, practitioner_id")
    .eq("id", appointmentId)
    .maybeSingle();
  if (!appt || appt.status === "cancelled" || appt.status === "no_show") return null;
  if (new Date(appt.ends_at).getTime() > Date.now()) return null;
  const [{ data: profile }, { data: existing }] = await Promise.all([
    supabase.from("practitioner_profiles").select("full_name").eq("id", appt.practitioner_id).maybeSingle(),
    supabase.from("consultation_feedback").select("appointment_id").eq("appointment_id", appointmentId).maybeSingle(),
  ]);
  return { startsAt: appt.starts_at, practitionerName: profile?.full_name ?? "your practitioner", answered: Boolean(existing) };
}

/** Ratings over the last 90 days, for the studio (§3.6: poor ratings behind fine notes). */
export async function feedbackSummary(): Promise<Map<string, { count: number; averageRating: number; averageHeard: number | null }>> {
  const supabase = createAdminSupabaseClient();
  const since = new Date(Date.now() - 90 * 86_400_000).toISOString();
  const { data } = await supabase.from("consultation_feedback").select("appointment_id, rating, felt_heard").gte("created_at", since);
  const ids = (data ?? []).map((f) => f.appointment_id);
  const { data: appts } = ids.length ? await supabase.from("appointments").select("id, practitioner_id").in("id", ids) : { data: [] };
  const owner = new Map((appts ?? []).map((a) => [a.id, a.practitioner_id]));
  const acc = new Map<string, { n: number; rating: number; heard: number; heardN: number }>();
  for (const f of data ?? []) {
    const pid = owner.get(f.appointment_id);
    if (!pid) continue;
    const a = acc.get(pid) ?? { n: 0, rating: 0, heard: 0, heardN: 0 };
    a.n += 1;
    a.rating += f.rating;
    if (f.felt_heard) {
      a.heard += f.felt_heard;
      a.heardN += 1;
    }
    acc.set(pid, a);
  }
  return new Map(
    [...acc].map(([pid, a]) => [pid, { count: a.n, averageRating: a.rating / a.n, averageHeard: a.heardN ? a.heard / a.heardN : null }]),
  );
}
