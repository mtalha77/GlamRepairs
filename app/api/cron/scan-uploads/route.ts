import { NextResponse } from "next/server";

import { getPhotosBucket } from "@/lib/leads/uploadAssessmentPhotos";
import { DOCS_BUCKET } from "@/lib/practitioners/applications";
import { ALLOWED_MIME, MAX_BYTES, PHOTO_MIME } from "@/lib/practitioners/join";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { inspectUpload } from "@/lib/uploads/inspect";
import { recordScan } from "@/lib/uploads/scans";

/**
 * Scan any stored file that has no upload_scans row. HANDOVER-59 Part 3.1.
 *
 * New uploads are scanned as they arrive. This catches everything else:
 * files stored before scanning existed, and any upload whose scan row
 * failed to write. Until a file has a clean row the studio will not show
 * it, so this is what makes older documents and photos visible again.
 *
 * A rejected file is removed from storage first; only then is its document
 * row marked deleted (CLAUDE.md 3.4). Called hourly by
 * .github/workflows/scan-uploads.yml. Safe to run twice.
 */
export const dynamic = "force-dynamic";
export const maxDuration = 120;

const BATCH = 40;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const hasSecret = Boolean(secret) && request.headers.get("authorization") === `Bearer ${secret}`;
  const isVercelCron = request.headers.get("x-vercel-cron") !== null;
  if (!hasSecret && !isVercelCron) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminSupabaseClient();
  const photosBucket = getPhotosBucket();

  const [{ data: docs }, { data: leads }, { data: scanned }] = await Promise.all([
    admin
      .from("practitioner_documents")
      .select("id, storage_path, kind, application_id, practitioner_id, mime")
      .is("deleted_at", null)
      .limit(500),
    admin
      .from("leads")
      .select("id, photo_paths")
      .is("photos_deleted_at", null)
      .not("photo_paths", "eq", "{}")
      .limit(500),
    admin.from("upload_scans").select("bucket, storage_path").limit(10000),
  ]);
  const known = new Set((scanned ?? []).map((s) => `${s.bucket}/${s.storage_path}`));

  type Job =
    | { kind: "doc"; id: string; path: string; docKind: string; applicationId: string | null; practitionerId: string | null; mime: string | null }
    | { kind: "photo"; leadId: string; path: string };
  const jobs: Job[] = [];
  for (const d of docs ?? []) {
    if (!known.has(`${DOCS_BUCKET}/${d.storage_path}`)) {
      jobs.push({ kind: "doc", id: d.id, path: d.storage_path, docKind: d.kind, applicationId: d.application_id, practitionerId: d.practitioner_id, mime: d.mime });
    }
  }
  for (const l of leads ?? []) {
    for (const path of l.photo_paths ?? []) {
      if (!known.has(`${photosBucket}/${path}`)) jobs.push({ kind: "photo", leadId: l.id, path });
    }
  }

  const result = { pending: jobs.length, clean: 0, rejected: 0, missing: 0, errors: 0 };
  for (const job of jobs.slice(0, BATCH)) {
    const bucket = job.kind === "doc" ? DOCS_BUCKET : photosBucket;
    const { data: blob, error } = await admin.storage.from(bucket).download(job.path);
    if (error || !blob) {
      // Already gone (expired or swept). Nothing to show, nothing to scan.
      result.missing += 1;
      continue;
    }
    const inspection = inspectUpload({
      bytes: new Uint8Array(await blob.arrayBuffer()),
      // Files already accepted are judged on content alone: a real PNG an
      // applicant named .jpg is not worth deleting after they submitted.
      // New uploads are held to their declaration as well.
      declaredMime: null,
      allowed: job.kind === "doc" && job.docKind !== "photo" ? ALLOWED_MIME : PHOTO_MIME,
      maxBytes: job.kind === "doc" ? MAX_BYTES : 5 * 1024 * 1024,
    });

    let removed = false;
    if (inspection.status === "rejected") {
      const { error: removeError } = await admin.storage.from(bucket).remove([job.path]);
      removed = !removeError;
      if (removeError) {
        result.errors += 1;
        console.error("[cron/scan-uploads] remove", job.path, removeError.message);
      } else if (job.kind === "doc") {
        await admin.from("practitioner_documents").update({ deleted_at: new Date().toISOString() }).eq("id", job.id);
      }
      result.rejected += 1;
    } else {
      result.clean += 1;
    }

    await recordScan({
      bucket,
      path: job.path,
      declaredMime: job.kind === "doc" ? job.mime : inspection.detectedMime,
      inspection,
      leadId: job.kind === "photo" ? job.leadId : null,
      applicationId: job.kind === "doc" ? job.applicationId : null,
      practitionerId: job.kind === "doc" ? job.practitionerId : null,
      removed,
    });
  }

  return NextResponse.json({ ok: true, ...result, remaining: Math.max(0, jobs.length - BATCH) });
}

export const POST = GET;
