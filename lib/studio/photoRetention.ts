import { createServerSupabaseClient } from "@/lib/supabase/server";

/**
 * HANDOVER-19 — the photo retention screen's data layer.
 *
 * Reads `public.studio_photo_status`, which classifies every lead's
 * photographs and already excludes archived leads (`deleted_at is null`).
 * The classification lives in the view rather than here so the studio screen
 * and any SQL Talha runs by hand can never disagree about what "overdue"
 * means.
 */

export type PhotoState =
  | "overdue"
  | "in_use"
  | "safe_to_delete"
  | "deleted"
  | "none";

export const PHOTO_STATE_LABEL: Record<PhotoState, string> = {
  overdue: "Overdue",
  in_use: "In use",
  safe_to_delete: "Safe to delete",
  deleted: "Deleted",
  none: "No photos",
};

export const PHOTO_STATE_DESCRIPTION: Record<PhotoState, string> = {
  overdue: "Past the 30-day retention date and still in storage.",
  in_use: "Report not sent yet, still inside the retention window.",
  safe_to_delete: "The report has been sent, so the photographs are no longer needed.",
  deleted: "Already removed from storage.",
  none: "This client sent no photographs.",
};

/** Render order: the problem first, the resolved states last. */
export const PHOTO_STATE_ORDER: PhotoState[] = [
  "overdue",
  "safe_to_delete",
  "in_use",
  "deleted",
  "none",
];

export function isPhotoState(value: string): value is PhotoState {
  return value in PHOTO_STATE_LABEL;
}

export type PhotoStatusRow = {
  leadId: string;
  displayRef: string;
  fullName: string | null;
  planName: string | null;
  isTest: boolean;
  photoCount: number;
  createdAt: string;
  photosExpireAt: string | null;
  photosDeletedAt: string | null;
  photosDeletionReason: string | null;
  /** Negative means overdue by that many days. */
  daysUntilAutoDelete: number | null;
  reportSentAt: string | null;
  photoState: PhotoState;
};

const COLUMNS =
  "lead_id, display_ref, full_name, plan_name, is_test, photo_count, created_at, " +
  "photos_expire_at, photos_deleted_at, photos_deletion_reason, " +
  "days_until_auto_delete, report_sent_at, photo_state";

type Row = {
  lead_id: string;
  display_ref: string;
  full_name: string | null;
  plan_name: string | null;
  is_test: boolean;
  photo_count: number;
  created_at: string;
  photos_expire_at: string | null;
  photos_deleted_at: string | null;
  photos_deletion_reason: string | null;
  days_until_auto_delete: number | null;
  report_sent_at: string | null;
  photo_state: string;
};

function mapRow(row: Row): PhotoStatusRow {
  return {
    leadId: row.lead_id,
    displayRef: row.display_ref,
    fullName: row.full_name,
    planName: row.plan_name,
    isTest: row.is_test,
    photoCount: row.photo_count ?? 0,
    createdAt: row.created_at,
    photosExpireAt: row.photos_expire_at,
    photosDeletedAt: row.photos_deleted_at,
    photosDeletionReason: row.photos_deletion_reason,
    daysUntilAutoDelete: row.days_until_auto_delete,
    reportSentAt: row.report_sent_at,
    photoState: isPhotoState(row.photo_state) ? row.photo_state : "none",
  };
}

export async function listPhotoStatus(state?: PhotoState) {
  const supabase = await createServerSupabaseClient();
  let query = supabase
    .from("studio_photo_status")
    // Most overdue first — the thing needing action is at the top.
    .select(COLUMNS)
    .order("photos_expire_at", { ascending: true, nullsFirst: false });

  if (state) {
    query = query.eq("photo_state", state);
  }

  const { data, error } = await query;
  if (error) {
    console.error("[listPhotoStatus]", error.message);
    return [];
  }
  return ((data ?? []) as Row[]).map(mapRow);
}

export type PhotoStateCounts = Record<PhotoState, { leads: number; photos: number }>;

/**
 * Counts per state, for the filter tabs. Fetched unfiltered so the tabs show
 * totals rather than only what the current filter matches — the point of the
 * screen is that the overdue number is visible before you click anything.
 */
export async function getPhotoStateCounts(): Promise<PhotoStateCounts> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("studio_photo_status")
    .select("photo_state, photo_count");

  const empty = Object.fromEntries(
    PHOTO_STATE_ORDER.map((state) => [state, { leads: 0, photos: 0 }]),
  ) as PhotoStateCounts;

  if (error) {
    console.error("[getPhotoStateCounts]", error.message);
    return empty;
  }

  for (const row of (data ?? []) as { photo_state: string; photo_count: number }[]) {
    if (!isPhotoState(row.photo_state)) continue;
    empty[row.photo_state].leads += 1;
    empty[row.photo_state].photos += row.photo_count ?? 0;
  }
  return empty;
}
