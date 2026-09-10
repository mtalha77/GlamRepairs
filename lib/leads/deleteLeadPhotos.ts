import { getPhotosBucket } from "@/lib/leads/uploadAssessmentPhotos";

/**
 * HANDOVER-19 §1 — the one place photographs are deleted.
 *
 * ── The rule ─────────────────────────────────────────────────────────────
 * Deleting from the database does not delete the photograph. Clearing
 * `photo_paths` and setting `photos_deleted_at` makes the images invisible
 * to the app while the files sit in Storage forever — and because the record
 * pointing at them is gone, nobody ever finds out.
 *
 * So the order is fixed and not negotiable:
 *   1. read the paths
 *   2. DELETE the objects through the Storage API
 *   3. ONLY on success, update the row
 *
 * If step 2 fails this returns `ok: false` and writes nothing. A row that
 * claims photographs are deleted when they are not is strictly worse than no
 * deletion at all, because it removes the last chance of anyone noticing.
 *
 * ── Why this file exists ─────────────────────────────────────────────────
 * The cron already did this correctly, inline. Adding a studio button, a
 * bulk action and a privacy-request path would have meant four copies of a
 * sequence where getting the order wrong is silent and unrecoverable. There
 * is now one implementation and every caller goes through it.
 */

/**
 * Why the photographs went. `client_request` is a legal obligation that may
 * have to be evidenced later; `report_complete` is routine hygiene. Same
 * action, different weight, so the reason is required rather than inferred.
 */
export type PhotoDeletionReason =
  | "report_complete"
  | "client_request"
  | "test_data"
  | "expired"
  | "other";

export const PHOTO_DELETION_REASON_LABEL: Record<PhotoDeletionReason, string> = {
  report_complete: "Assessment delivered, no longer needed",
  client_request: "The client asked",
  test_data: "Internal test data",
  expired: "Past the 30-day retention window",
  other: "Other",
};

/** The reasons a person picks in the studio. `expired` is the cron's own. */
export const MANUAL_PHOTO_DELETION_REASONS: PhotoDeletionReason[] = [
  "report_complete",
  "client_request",
  "test_data",
  "other",
];

export function isPhotoDeletionReason(
  value: string,
): value is PhotoDeletionReason {
  return value in PHOTO_DELETION_REASON_LABEL;
}

export type DeletePhotosResult =
  | { ok: true; leadId: string; filesDeleted: number }
  | { ok: false; leadId: string; stage: "storage" | "row"; message: string };

type Credentials = { base: string; key: string };

function getCredentials(): Credentials | null {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!base || !key) return null;
  return { base, key };
}

function serviceHeaders(key: string) {
  return {
    Authorization: `Bearer ${key}`,
    apikey: key,
    "Content-Type": "application/json",
  };
}

/**
 * Delete one lead's photographs: Storage first, row second, row only on
 * success.
 *
 * `paths` is passed in rather than re-read so the caller can show the client
 * an exact count in a confirmation dialog and then delete precisely what was
 * confirmed. Pass an empty array and it will still stamp the row — a lead
 * with no files is already in the desired state, and refusing would leave it
 * permanently unmarked.
 */
export async function deletePhotosForLead(options: {
  leadId: string;
  paths: string[];
  reason: PhotoDeletionReason;
  /** Studio user who pressed the button. Null for the automatic sweep. */
  deletedBy: string | null;
  /** Free text when reason is "other". Stored alongside the reason code. */
  note?: string | null;
}): Promise<DeletePhotosResult> {
  const { leadId, reason, deletedBy } = options;
  const credentials = getCredentials();
  if (!credentials) {
    return {
      ok: false,
      leadId,
      stage: "storage",
      message: "Supabase is not configured.",
    };
  }
  const { base, key } = credentials;
  const paths = options.paths.filter(Boolean);

  // ── Step 2: the files. Nothing is written to the row until this returns ok.
  if (paths.length > 0) {
    let response: Response;
    try {
      response = await fetch(`${base}/storage/v1/object/${getPhotosBucket()}`, {
        method: "DELETE",
        headers: serviceHeaders(key),
        /**
         * `{ prefixes: [...] }`, NOT a bare array.
         *
         * This is what the Storage API's delete-objects endpoint expects —
         * confirmed against @supabase/storage-js, whose `.remove(paths)`
         * posts `{ prefixes: paths }`. Sending the array on its own returns
         * 400 and deletes nothing.
         *
         * This was the real reason the nightly sweep never removed a single
         * photograph: the bare-array body shipped in the original
         * cleanupExpiredPhotos, so every run failed at exactly this call,
         * logged, and moved on. `photos_deleted_at` was null on all 36 rows
         * not because the job was not running but because it could not
         * succeed. Do not "simplify" this back to JSON.stringify(paths).
         */
        body: JSON.stringify({ prefixes: paths }),
      });
    } catch (error) {
      return {
        ok: false,
        leadId,
        stage: "storage",
        message: error instanceof Error ? error.message : "Storage request failed.",
      };
    }

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      console.error(
        `[deletePhotosForLead] storage delete failed for ${leadId}:`,
        response.status,
        detail,
      );
      return {
        ok: false,
        leadId,
        stage: "storage",
        // The status alone is not diagnosable — a 400 here took a
        // production run to trace. Carry a slice of the body through.
        message:
          `Storage delete failed (${response.status}${detail ? `: ${detail.slice(0, 160)}` : ""}). ` +
          "The photographs are still there, so the record has not been changed.",
      };
    }
  }

  // ── Step 3: the row, now that the files are provably gone.
  const reasonValue = options.note?.trim()
    ? `${reason}: ${options.note.trim()}`
    : reason;

  const patch = await fetch(
    `${base}/rest/v1/leads?id=eq.${encodeURIComponent(leadId)}`,
    {
      method: "PATCH",
      headers: { ...serviceHeaders(key), Prefer: "return=minimal" },
      body: JSON.stringify({
        image_urls: [],
        photo_paths: [],
        photos_deleted_at: new Date().toISOString(),
        photos_deleted_by: deletedBy,
        photos_deletion_reason: reasonValue,
        updated_at: new Date().toISOString(),
      }),
    },
  );

  if (!patch.ok) {
    const detail = await patch.text().catch(() => "");
    console.error(
      `[deletePhotosForLead] row patch failed for ${leadId}:`,
      patch.status,
      detail,
    );
    // The files are gone but the row still points at them. That is the safe
    // direction to fail in — the next sweep re-runs this lead, the storage
    // delete no-ops, and the row gets stamped then.
    return {
      ok: false,
      leadId,
      stage: "row",
      message: `The photographs were deleted but the record could not be updated (${patch.status}). It will be corrected on the next run.`,
    };
  }

  return { ok: true, leadId, filesDeleted: paths.length };
}

type LeadPhotoRow = { id: string; photo_paths: string[] | null };

/** Read the current paths for a set of leads, service-role. */
export async function readPhotoPaths(
  leadIds: string[],
): Promise<Map<string, string[]>> {
  const result = new Map<string, string[]>();
  const credentials = getCredentials();
  if (!credentials || leadIds.length === 0) return result;

  const list = leadIds.map((id) => `"${id}"`).join(",");
  const response = await fetch(
    `${credentials.base}/rest/v1/leads?select=id,photo_paths&id=in.(${encodeURIComponent(list)})`,
    { headers: serviceHeaders(credentials.key), cache: "no-store" },
  );

  if (!response.ok) {
    console.error("[readPhotoPaths]", response.status);
    return result;
  }

  for (const row of (await response.json()) as LeadPhotoRow[]) {
    result.set(row.id, (row.photo_paths ?? []).filter(Boolean));
  }
  return result;
}

/**
 * Turn a stored reason into something readable on the lead page.
 *
 * The column holds either a bare code ("report_complete") or a code with a
 * free-text note appended ("other: duplicate upload"), so this has to handle
 * both — and fall back to showing the raw value rather than hiding a reason
 * it does not recognise. Old rows written before these codes existed would
 * otherwise silently display nothing.
 */
export function describePhotoDeletionReason(stored: string): string {
  const [code, ...rest] = stored.split(":");
  const note = rest.join(":").trim();
  const key = code.trim();
  if (!isPhotoDeletionReason(key)) return stored;
  const label = PHOTO_DELETION_REASON_LABEL[key].toLowerCase();
  return note ? `${label} (${note})` : label;
}
