import "server-only";

import { DOCS_BUCKET } from "@/lib/practitioners/applications";
import { ALLOWED_MIME, MAX_BYTES, PHOTO_MIME } from "@/lib/practitioners/join";
import { inspectUpload, rejectionMessage } from "@/lib/uploads/inspect";
import { recordScan } from "@/lib/uploads/scans";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

/**
 * Inspect a practitioner document that the browser uploaded straight to
 * storage (HANDOVER-59 Part 1.2: a malicious PDF attacks whoever opens it).
 *
 * The server never saw the bytes on the way in, so it reads them back now,
 * before the document is recorded. Rejected files are removed from storage
 * first and the scan row written second, so a failed removal leaves nothing
 * marked as safe.
 */
export async function scanApplicationDocument(input: {
  path: string;
  kind: string;
  applicationId: string;
  declaredMime: string | null;
}): Promise<{ ok: true; mime: string } | { ok: false; error: string }> {
  const admin = createAdminSupabaseClient();
  const { data: blob, error } = await admin.storage.from(DOCS_BUCKET).download(input.path);
  if (error || !blob) return { ok: false, error: "The upload did not arrive. Please try again." };

  const inspection = inspectUpload({
    bytes: new Uint8Array(await blob.arrayBuffer()),
    declaredMime: input.declaredMime,
    allowed: input.kind === "photo" ? PHOTO_MIME : ALLOWED_MIME,
    maxBytes: MAX_BYTES,
  });

  if (inspection.status === "rejected") {
    const { error: removeError } = await admin.storage.from(DOCS_BUCKET).remove([input.path]);
    if (removeError) console.error("[scanApplicationDocument] remove", input.path, removeError.message);
    await recordScan({
      bucket: DOCS_BUCKET,
      path: input.path,
      declaredMime: input.declaredMime,
      inspection,
      applicationId: input.applicationId,
      removed: !removeError,
    });
    return { ok: false, error: rejectionMessage(inspection) };
  }

  await recordScan({
    bucket: DOCS_BUCKET,
    path: input.path,
    declaredMime: input.declaredMime,
    inspection,
    applicationId: input.applicationId,
  });
  return { ok: true, mime: inspection.detectedMime ?? input.declaredMime ?? "application/octet-stream" };
}
