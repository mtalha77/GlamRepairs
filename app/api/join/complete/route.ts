import { NextResponse } from "next/server";

import { sendPractitionerEmail } from "@/lib/email/sendPractitionerEmail";
import { DOCS_BUCKET, OPEN_STATUSES } from "@/lib/practitioners/applications";
import { DOCUMENT_KINDS, verifyApplicationSignature } from "@/lib/practitioners/join";
import type { PractitionerDocumentKind } from "@/lib/supabase/database.types";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

/**
 * Step 2 of submitting /join: record the files that actually arrived.
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

  const rows = (body.files ?? [])
    .filter((f) => f.path.startsWith(`${folder}/`) && present.has(f.path) && !recorded.has(f.path))
    .filter((f) => DOCUMENT_KINDS.includes(f.kind as PractitionerDocumentKind))
    .map((f) => {
      const meta = present.get(f.path)?.metadata as { size?: number; mimetype?: string } | undefined;
      return {
        application_id: applicationId,
        kind: f.kind as PractitionerDocumentKind,
        storage_path: f.path,
        original_name: f.name.slice(0, 200),
        bytes: meta?.size ?? null,
        mime: meta?.mimetype ?? null,
      };
    });

  if (rows.length) {
    const { error } = await admin.from("practitioner_documents").insert(rows);
    if (error) {
      console.error("[api/join/complete]", error.message);
      return NextResponse.json({ ok: false, error: "Your application is saved, but the documents could not be recorded." }, { status: 500 });
    }
  }

  // First completion only: tell the studio and the applicant.
  if (recorded.size === 0) {
    const { data: admins } = await admin.from("studio_members").select("user_id").eq("is_super_admin", true);
    if (admins?.length) {
      await admin.from("studio_notifications").insert(
        admins.map((a) => ({
          recipient_id: a.user_id,
          type: "practitioner_application" as const,
          title: "New practitioner application",
          body: `${app.full_name} has applied, with ${rows.length} ${rows.length === 1 ? "document" : "documents"}.`,
          href: `/studio/applications/${applicationId}`,
          lead_id: null,
        })),
      );
    }
    await sendPractitionerEmail({ kind: "received", toEmail: app.email, name: app.full_name });
  }

  return NextResponse.json({ ok: true, documents: rows.length });
}
