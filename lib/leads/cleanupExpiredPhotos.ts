import { deletePhotosForLead } from "@/lib/leads/deleteLeadPhotos";

type ExpiredLead = {
  id: string;
  photo_paths: string[] | null;
};

export type CleanupResult = {
  leadsProcessed: number;
  filesDeleted: number;
  /** Leads whose deletion failed. Non-empty means the sweep did not finish. */
  failures: { leadId: string; stage: string; message: string }[];
  /** Set when the sweep could not even list candidates. */
  error?: string;
};

/**
 * The automatic sweep: delete Storage photos for leads past
 * `photos_expire_at`. Lead rows stay; only the images go.
 *
 * ── HANDOVER-19 §3 ───────────────────────────────────────────────────────
 * This function's query was verified against production and is correct — it
 * selects exactly the 23 leads / 94 photographs that are overdue. Nothing
 * has ever been deleted (`photos_deleted_at` is null on all 36 rows), and
 * the oldest lead is 14 days past a *daily* schedule, so the failure is that
 * the route is not being invoked successfully, not that this logic is wrong.
 * See app/api/cron/cleanup-photos/route.ts for the fix.
 *
 * The per-lead deletion now goes through `deletePhotosForLead` so the cron,
 * the studio button and the bulk action cannot drift on the one thing that
 * matters: files first, row only on success.
 */
export async function cleanupExpiredPhotos(): Promise<CleanupResult> {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!base || !key) {
    return {
      leadsProcessed: 0,
      filesDeleted: 0,
      failures: [],
      error: "Supabase is not configured.",
    };
  }

  const query =
    `${base}/rest/v1/leads` +
    `?select=id,photo_paths` +
    `&photos_deleted_at=is.null` +
    `&photos_expire_at=lt.${encodeURIComponent(new Date().toISOString())}` +
    `&photo_paths=neq.{}` +
    `&limit=50`;

  const listResponse = await fetch(query, {
    headers: { Authorization: `Bearer ${key}`, apikey: key },
    cache: "no-store",
  });

  if (!listResponse.ok) {
    const detail = await listResponse.text().catch(() => "");
    console.error(
      "[cleanupExpiredPhotos] List failed:",
      listResponse.status,
      detail,
    );
    return {
      leadsProcessed: 0,
      filesDeleted: 0,
      failures: [],
      error: `Could not list expired leads (${listResponse.status}).`,
    };
  }

  const leads = (await listResponse.json()) as ExpiredLead[];
  let filesDeleted = 0;
  const failures: CleanupResult["failures"] = [];

  for (const lead of leads) {
    const result = await deletePhotosForLead({
      leadId: lead.id,
      paths: lead.photo_paths ?? [],
      // The sweep is not a person's decision, so it gets its own reason
      // rather than borrowing one of the studio's.
      reason: "expired",
      deletedBy: null,
    });

    if (result.ok) {
      filesDeleted += result.filesDeleted;
    } else {
      failures.push({
        leadId: result.leadId,
        stage: result.stage,
        message: result.message,
      });
    }
  }

  return { leadsProcessed: leads.length, filesDeleted, failures };
}
