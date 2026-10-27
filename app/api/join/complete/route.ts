import { NextResponse } from "next/server";

import { DOCS_BUCKET, OPEN_STATUSES } from "@/lib/practitioners/applications";
import { DOCUMENT_KINDS, verifyApplicationSignature } from "@/lib/practitioners/join";
import type { PractitionerDocumentKind } from "@/lib/supabase/database.types";
import { scanApplicationDocument } from "@/lib/practitioners/docScan";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { hashIp, recordUploadAttempt } from "@/lib/uploads/scans";

/**
 * Record the files that actually arrived, for an applicant revising a
 * submitted application (/join/edit). New applications use /api/join/draft.
 *
 * Only paths under this application's folder are accepted, and each is
 * checked against the bucket listing, so a document row can never point
 * at a file that is not there (or at someone else's).
 */
export const dynamic = "force-dynamic";

type Uploaded = { path: string; kind: string; name: string };

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { applicationId?: string; key?: string; files?: Uploaded[] } | null;
  const applicationId = body?.applicationId ?? "";
  if (!applicationId || !body?.key || !verifyApplicationSignature(applicationId, body.key)) {
    return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 403 });
  }

  const admin = createAdminSupabaseClient();
  const { data: app } = await admin
    .from("practitioner_applications")
    .select("id, full_name, email, status")
    .eq("id", applicationId)
    .maybeSingle();
  if (!app || !OPEN_STATUSES.includes(app.status)) return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 403 });

  const folder = `applications/${applicationId}`;
  const { data: listing } = await admin.storage.from(DOCS_BUCKET).list(folder, { limit: 100 });
  const present = new Map((listing ?? []).map((o) => [`${folder}/${o.name}`, o]));

  const { data: already } = await admin.from("practitioner_documents").select("storage_path").eq("application_id", applicationId);
  const recorded = new Set((already ?? []).map((d) => d.storage_path));

  const candidates = (body.files ?? [])
    .filter((f) => f.path.startsWith(`${folder}/`) && present.has(f.path) && !recorded.has(f.path))
    .filter((f) => DOCUMENT_KINDS.includes(f.kind as PractitionerDocumentKind));

  // HANDOVER-59 — every file is read back and checked before it is recorded.
  // A rejected one is removed and left out; the rest still go through.
  const rows = [];
  const rejected: string[] = [];
  const ipHash = hashIp(request);
  for (const f of candidates) {
    const meta = present.get(f.path)?.metadata as { size?: number; mimetype?: string } | undefined;
    const scan = await scanApplicationDocument({
      path: f.path,
      kind: f.kind,
      applicationId,
      declaredMime: meta?.mimetype ?? null,
    });
    await recordUploadAttempt({
      ipHash,
      applicationId,
      bucket: DOCS_BUCKET,
      bytes: meta?.size ?? 0,
      accepted: scan.ok,
      reason: scan.ok ? null : "rejected by scan",
    });
    if (!scan.ok) {
      rejected.push(`${f.name.slice(0, 80)}: ${scan.error}`);
      continue;
    }
    rows.push({
      application_id: applicationId,
      kind: f.kind as PractitionerDocumentKind,
      storage_path: f.path,
      original_name: f.name.slice(0, 200),
      bytes: meta?.size ?? null,
      mime: scan.mime,
    });
  }

  if (rows.length) {
    const { error } = await admin.from("practitioner_documents").insert(rows);
    if (error) {
      console.error("[api/join/complete]", error.message);
      return NextResponse.json({ ok: false, error: "Your application is saved, but the documents could not be recorded." }, { status: 500 });
    }
  }

  if (rejected.length) {
    return NextResponse.json({
      ok: false,
      error: `Your changes are saved, but we could not accept ${rejected.length === 1 ? "one file" : `${rejected.length} files`}. ${rejected.join(" ")}`,
    });
  }
  return NextResponse.json({ ok: true, documents: rows.length });
}
