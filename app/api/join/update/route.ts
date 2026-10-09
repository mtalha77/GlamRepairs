import { randomUUID } from "node:crypto";

import { NextResponse } from "next/server";

import { DOCS_BUCKET, OPEN_STATUSES } from "@/lib/practitioners/applications";
import {
  ALLOWED_MIME,
  DOCUMENT_KINDS,
  extensionFor,
  MAX_BYTES,
  MAX_FILES,
  parseFields,
  signApplication,
  verifyApplicationEdit,
} from "@/lib/practitioners/join";
import type { PractitionerDocumentKind } from "@/lib/supabase/database.types";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

/**
 * An applicant updating their application after "request changes" —
 * HANDOVER-52 §4.2. Authorised by the signed link from the email; only an
 * open application can be changed. New documents follow the same path as
 * the first submission: signed upload URLs, recorded by /api/join/complete.
 */
export const dynamic = "force-dynamic";

type FileMeta = { kind: string; name: string; size: number; type: string };

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const applicationId = typeof body?.applicationId === "string" ? body.applicationId : "";
  const editKey = typeof body?.editKey === "string" ? body.editKey : "";
  if (!body || !applicationId || !verifyApplicationEdit(applicationId, editKey)) {
    return NextResponse.json({ ok: false, error: "This link is not valid." }, { status: 403 });
  }
  if (body.terms !== true) {
    return NextResponse.json({ ok: false, error: "Please agree to the terms to continue." }, { status: 422 });
  }

  const admin = createAdminSupabaseClient();
  const { data: app } = await admin
    .from("practitioner_applications")
    .select("id, kind, status, full_name")
    .eq("id", applicationId)
    .is("deleted_at", null)
    .maybeSingle();
  if (!app || !OPEN_STATUSES.includes(app.status)) {
    return NextResponse.json({ ok: false, error: "This application can no longer be changed." }, { status: 410 });
  }

  const fields = parseFields(body, app.kind);
  if ("error" in fields) return NextResponse.json({ ok: false, error: fields.error }, { status: 422 });

  const files = (Array.isArray(body.files) ? body.files : []) as FileMeta[];
  if (files.length > MAX_FILES) return NextResponse.json({ ok: false, error: `Attach at most ${MAX_FILES} files.` }, { status: 422 });
  for (const f of files) {
    if (!DOCUMENT_KINDS.includes(f.kind as PractitionerDocumentKind)) {
      return NextResponse.json({ ok: false, error: "Choose what each file is." }, { status: 422 });
    }
    if (!(ALLOWED_MIME as readonly string[]).includes(f.type) || !(f.size > 0) || f.size > MAX_BYTES) {
      return NextResponse.json({ ok: false, error: `${f.name}: PDF, JPG, PNG or WebP under 10 MB.` }, { status: 422 });
    }
  }

  const now = new Date().toISOString();
  const { error } = await admin
    .from("practitioner_applications")
    .update({
      full_name: fields.fullName,
      phone: fields.phone || null,
      city: fields.city || null,
      qualification: fields.qualification,
      years_experience: fields.years,
      clinics: fields.clinics || null,
      about: fields.about,
      portfolio_url: fields.portfolioUrl,
      reg_body: fields.regBody,
      reg_no: fields.regNo,
      updated_at: now,
    })
    .eq("id", applicationId);
  if (error) {
    console.error("[api/join/update]", error.message);
    return NextResponse.json({ ok: false, error: "Something went wrong saving your changes." }, { status: 500 });
  }

  await admin
    .from("practitioner_revision_requests")
    .update({ resolved_at: now, resolution_note: "Updated by the applicant" })
    .eq("application_id", applicationId)
    .is("resolved_at", null);

  const { data: admins } = await admin.from("studio_members").select("user_id").eq("is_super_admin", true);
  if (admins?.length) {
    await admin.from("studio_notifications").insert(
      admins.map((a) => ({
        recipient_id: a.user_id,
        type: "practitioner_application" as const,
        title: "Application updated",
        body: `${fields.fullName} has made the changes you asked for.`,
        href: `/studio/applications/${applicationId}`,
        lead_id: null,
      })),
    );
  }

  const uploads = [];
  for (const f of files) {
    const path = `applications/${applicationId}/${randomUUID()}.${extensionFor(f.type)}`;
    const { data: signed, error: signError } = await admin.storage.from(DOCS_BUCKET).createSignedUploadUrl(path);
    if (signError || !signed) {
      return NextResponse.json({ ok: false, error: "Your changes are saved, but the upload could not be prepared." }, { status: 500 });
    }
    uploads.push({ path, token: signed.token, kind: f.kind, name: f.name.slice(0, 200) });
  }

  return NextResponse.json({ ok: true, applicationId, key: signApplication(applicationId), uploads });
}
