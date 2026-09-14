import { createPublicSupabaseClient } from "@/lib/supabase/publicClient";
import type { FunnelPlanId } from "@/lib/funnel/plans";

/**
 * `public.plan_settings` — what each plan actually includes.
 *
 * ── Why this table exists ────────────────────────────────────────────────
 * Photo limits, support durations and the video-call flag were typed into
 * components, which meant changing "Transform includes a 15-minute call" was
 * a deploy, and meant two components could disagree about the same plan.
 * Everything that states what a plan includes should read from here.
 *
 * ⚠️ `includes_video_call` being true for Transform does NOT mean the video
 * consultation may be advertised. HANDOVER-21 is explicit: do not advertise
 * it until practitioners exist and booking works. This module reports the
 * data; the decision to show it belongs to the caller.
 *
 * Reads go through the anon client so RLS applies, and failures degrade to
 * the fallbacks below rather than throwing into a Server Component — the
 * same convention as lib/pricing/regions.ts.
 */

export type PlanSettings = {
  planKey: FunnelPlanId;
  label: string;
  photosRequired: number;
  photosMax: number;
  includesVideoCall: boolean;
  videoMinutes: number | null;
  includesWhatsapp: boolean;
  supportDays: number | null;
  expertReview: boolean;
};

type PlanSettingsRow = {
  plan_key: string;
  label: string;
  photos_required: number;
  photos_max: number;
  includes_video_call: boolean;
  video_minutes: number | null;
  includes_whatsapp: boolean;
  support_days: number | null;
  expert_review: boolean;
};

/**
 * Used only when the database is unreachable. These mirror the live rows, so
 * a transient outage shows what everyone else already sees rather than an
 * invented or absent number.
 */
const FALLBACKS: Record<FunnelPlanId, PlanSettings> = {
  free: {
    planKey: "free",
    label: "Skin Starter",
    photosRequired: 0,
    photosMax: 0,
    includesVideoCall: false,
    videoMinutes: null,
    includesWhatsapp: false,
    supportDays: null,
    expertReview: false,
  },
  clarity: {
    planKey: "clarity",
    label: "Skin Clarity",
    photosRequired: 2,
    photosMax: 3,
    includesVideoCall: false,
    videoMinutes: null,
    includesWhatsapp: true,
    supportDays: 30,
    expertReview: true,
  },
  transform: {
    planKey: "transform",
    label: "Skin Transform",
    photosRequired: 3,
    photosMax: 6,
    includesVideoCall: true,
    videoMinutes: 15,
    includesWhatsapp: true,
    supportDays: 30,
    expertReview: true,
  },
};

function isPlanId(value: string): value is FunnelPlanId {
  return value === "free" || value === "clarity" || value === "transform";
}

function mapRow(row: PlanSettingsRow): PlanSettings | null {
  if (!isPlanId(row.plan_key)) return null;
  return {
    planKey: row.plan_key,
    label: row.label,
    photosRequired: row.photos_required,
    photosMax: row.photos_max,
    includesVideoCall: row.includes_video_call,
    videoMinutes: row.video_minutes,
    includesWhatsapp: row.includes_whatsapp,
    supportDays: row.support_days,
    expertReview: row.expert_review,
  };
}

/** Every plan, keyed by id. Missing rows fall back rather than disappearing. */
export async function getPlanSettings(): Promise<
  Record<FunnelPlanId, PlanSettings>
> {
  const supabase = createPublicSupabaseClient();
  const { data, error } = await supabase
    .from("plan_settings")
    .select(
      "plan_key, label, photos_required, photos_max, includes_video_call, video_minutes, includes_whatsapp, support_days, expert_review",
    );

  if (error || !data?.length) {
    if (error) console.error("[getPlanSettings]", error.message);
    return FALLBACKS;
  }

  const result = { ...FALLBACKS };
  for (const row of data as PlanSettingsRow[]) {
    const mapped = mapRow(row);
    if (mapped) result[mapped.planKey] = mapped;
  }
  return result;
}

/** "2–3 photos", or "3 photos" when the range is a single number. */
export function describePhotoCount(plan: PlanSettings): string {
  if (plan.photosMax === 0) return "No photographs";
  if (plan.photosRequired === plan.photosMax) {
    return `${plan.photosMax} photo${plan.photosMax === 1 ? "" : "s"}`;
  }
  return `${plan.photosRequired}–${plan.photosMax} photos`;
}
