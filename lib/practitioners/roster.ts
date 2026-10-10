import "server-only";

import type { WeeklyWindow } from "@/lib/consultation/admin";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

/**
 * Practitioners, the read side — HANDOVER-52 §3.3, §4.3, §4.4.
 */

export type PractitionerRow = {
  id: string;
  slug: string;
  fullName: string;
  title: string;
  credentials: string;
  status: string;
  photoUrl: string | null;
  bio: string;
  profilePhotoVerified: boolean;
  payoutMethod: string | null;
  payoutDetailRef: string | null;
  maxPerDay: number;
  maxPerWeek: number;
  hasAccount: boolean;
  hasVerifiedDegree: boolean;
  feeMinor: number;
  platformMinor: number;
  upcoming: number;
};

/**
 * Who takes over a leaving practitioner's bookings (Talha, 10 October
 * 2026: "given to Ayma"): the approved practitioner whose account is a
 * super admin, else the longest-standing approved one.
 */
export async function defaultPractitionerId(excluding?: string): Promise<string | null> {
  const supabase = createAdminSupabaseClient();
  const { data: profiles } = await supabase
    .from("practitioner_profiles")
    .select("id, user_id")
    .eq("status", "approved")
    .order("created_at");
  const candidates = (profiles ?? []).filter((p) => p.id !== excluding);
  if (!candidates.length) return null;
  const userIds = candidates.map((p) => p.user_id).filter((u): u is string => Boolean(u));
  const { data: admins } = userIds.length
    ? await supabase.from("studio_members").select("user_id").in("user_id", userIds).eq("is_super_admin", true)
    : { data: [] };
  const adminSet = new Set((admins ?? []).map((a) => a.user_id));
  return (candidates.find((p) => p.user_id && adminSet.has(p.user_id)) ?? candidates[0]).id;
}

export async function ownPractitionerProfile(userId: string) {
  const { data } = await createAdminSupabaseClient()
    .from("practitioner_profiles")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  return data;
}

export async function listPractitioners(): Promise<PractitionerRow[]> {
  const supabase = createAdminSupabaseClient();
  const { data: profiles } = await supabase
    .from("practitioner_profiles")
    .select("*")
    .neq("status", "rejected")
    .order("created_at");
  const rows = profiles ?? [];
  const ids = rows.map((p) => p.id);
  if (!ids.length) return [];

  const [{ data: degrees }, { data: upcoming }] = await Promise.all([
    supabase.from("practitioner_documents").select("practitioner_id").in("practitioner_id", ids).eq("kind", "degree").eq("verified", true).is("deleted_at", null),
    supabase.from("appointments").select("practitioner_id").in("practitioner_id", ids).eq("status", "scheduled").gt("starts_at", new Date().toISOString()),
  ]);
  const degreeSet = new Set((degrees ?? []).map((d) => d.practitioner_id));
  const upcomingCount = new Map<string, number>();
  for (const a of upcoming ?? []) upcomingCount.set(a.practitioner_id, (upcomingCount.get(a.practitioner_id) ?? 0) + 1);

  return Promise.all(
    rows.map(async (p) => {
      const { data: rate } = await supabase.rpc("rate_for", { p_practitioner: p.id, p_at: new Date().toISOString() });
      return {
        id: p.id,
        slug: p.slug,
        fullName: p.full_name,
        title: p.title,
        credentials: p.credentials,
        status: p.status,
        photoUrl: p.photo_url,
        bio: p.bio ?? "",
        profilePhotoVerified: p.profile_photo_verified,
        payoutMethod: p.payout_method,
        payoutDetailRef: p.payout_detail_ref,
        maxPerDay: p.max_per_day,
        maxPerWeek: p.max_per_week,
        hasAccount: Boolean(p.user_id),
        hasVerifiedDegree: degreeSet.has(p.id),
        feeMinor: rate?.[0]?.practitioner_fee_minor ?? 0,
        platformMinor: rate?.[0]?.platform_fee_minor ?? 0,
        upcoming: upcomingCount.get(p.id) ?? 0,
      };
    }),
  );
}

export type EarningsSummary = { payableMinor: number; heldMinor: number; paidThisMonthMinor: number };

export async function earningsSummary(practitionerId: string): Promise<EarningsSummary> {
  const supabase = createAdminSupabaseClient();
  const monthStart = new Date();
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);
  const { data } = await supabase
    .from("practitioner_earnings")
    .select("status, practitioner_minor, earned_at")
    .eq("practitioner_id", practitionerId)
    .neq("status", "void");
  let payableMinor = 0;
  let heldMinor = 0;
  let paidThisMonthMinor = 0;
  for (const e of data ?? []) {
    if (e.status === "payable") payableMinor += e.practitioner_minor;
    else if (e.status === "pending") heldMinor += e.practitioner_minor;
    else if (e.status === "paid" && e.earned_at >= monthStart.toISOString()) paidThisMonthMinor += e.practitioner_minor;
  }
  return { payableMinor, heldMinor, paidThisMonthMinor };
}

export function formatRupees(minor: number): string {
  return `Rs ${(minor / 100).toLocaleString("en-PK", { maximumFractionDigits: 0 })}`;
}

/** One practitioner's weekly hours, in the shape the hours editor takes. */
export async function weeklyWindowsFor(practitionerId: string): Promise<WeeklyWindow[]> {
  const { data } = await createAdminSupabaseClient()
    .from("practitioner_availability")
    .select("weekday, starts_time, ends_time, slot_minutes, stride_minutes, active")
    .eq("practitioner_id", practitionerId)
    .order("weekday")
    .order("starts_time");
  return (data ?? []).map((w) => ({
    weekday: w.weekday,
    startsTime: w.starts_time.slice(0, 5),
    endsTime: w.ends_time.slice(0, 5),
    slotMinutes: w.slot_minutes,
    strideMinutes: w.stride_minutes,
    active: w.active,
  }));
}

/** What still stands between a profile and going live (HANDOVER-52 §3.3). */
export function missingForLive(p: {
  photoUrl: string | null;
  profilePhotoVerified: boolean;
  bio: string;
  hasVerifiedDegree: boolean;
  payoutMethod: string | null;
}): string[] {
  const missing: string[] = [];
  if (!p.photoUrl) missing.push("A profile photograph");
  else if (!p.profilePhotoVerified) missing.push("The photograph checked by the studio");
  if (p.bio.trim().length <= 80) missing.push("A bio of more than 80 characters");
  if (!p.hasVerifiedDegree) missing.push("A verified degree");
  if (!p.payoutMethod) missing.push("A payout method");
  return missing;
}

export async function hasVerifiedDegree(practitionerId: string): Promise<boolean> {
  const { count } = await createAdminSupabaseClient()
    .from("practitioner_documents")
    .select("id", { count: "exact", head: true })
    .eq("practitioner_id", practitionerId)
    .eq("kind", "degree")
    .eq("verified", true)
    .is("deleted_at", null);
  return (count ?? 0) > 0;
}
