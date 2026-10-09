import { randomUUID } from "node:crypto";

import { NextResponse } from "next/server";

import {
  ALLOWED_MIME,
  DOCUMENT_KINDS,
  extensionFor,
  lookupInvite,
  MAX_BYTES,
  MAX_FILES,
  parseFields,
  signApplication,
} from "@/lib/practitioners/join";
import { DOCS_BUCKET } from "@/lib/practitioners/applications";
import type { PractitionerDocumentKind } from "@/lib/supabase/database.types";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

/**
 * Step 1 of submitting /join — HANDOVER-51 §4.1.
 *
 * Checks the invite and the terms box, saves the application, and only
 * then hands out one signed upload URL per declared file. The browser
 * uploads straight to the private bucket and calls /api/join/complete.
 */
export const dynamic = "force-dynamic";

type FileMeta = { kind: string; name: string; size: number; type: string };

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 400 });

  const invite = await lookupInvite(typeof body.token === "string" ? body.token : null);
  if (!invite) {
    return NextResponse.json(
      { ok: false, error: "This invitation link is no longer valid. Ask us for a new one." },
      { status: 410 },
    );
  }

  // §4.1: nothing is stored, and no upload is allowed, before consent.
  if (body.terms !== true) {
    return NextResponse.json({ ok: false, error: "Please agree to the terms to continue." }, { status: 422 });
  }

  const fields = parseFields(body, invite.kind);
  if ("error" in fields) return NextResponse.json({ ok: false, error: fields.error }, { status: 422 });

  const files = (Array.isArray(body.files) ? body.files : []) as FileMeta[];
  if (files.length === 0) {
    return NextResponse.json({ ok: false, error: "Please attach at least your degree." }, { status: 422 });
  }
  if (files.length > MAX_FILES) {
    return NextResponse.json({ ok: false, error: `Attach at most ${MAX_FILES} files.` }, { status: 422 });
  }
  for (const f of files) {
    if (!DOCUMENT_KINDS.includes(f.kind as PractitionerDocumentKind)) {
      return NextResponse.json({ ok: false, error: "Choose what each file is." }, { status: 422 });
    }
    if (!(ALLOWED_MIME as readonly string[]).includes(f.type)) {
      return NextResponse.json({ ok: false, error: `${f.name}: only PDF, JPG, PNG or WebP files.` }, { status: 422 });
    }
    if (!(f.size > 0) || f.size > MAX_BYTES) {
      return NextResponse.json({ ok: false, error: `${f.name}: files must be under 10 MB.` }, { status: 422 });
    }
  }

  const admin = createAdminSupabaseClient();
  const now = new Date().toISOString();
  const { data: app, error } = await admin
    .from("practitioner_applications")
    .insert({
      full_name: fields.fullName,
      email: invite.email,
      phone: fields.phone || null,
      city: fields.city || null,
      kind: invite.kind,
      qualification: fields.qualification,
      years_experience: fields.years,
      clinics: fields.clinics || null,
      about: fields.about,
      portfolio_url: fields.portfolioUrl,
      reg_body: fields.regBody,
      reg_no: fields.regNo,
      source: "invite",
      invite_id: invite.inviteId,
      agreed_to_terms: true,
      agreed_at: now,
    })
    .select("id")
    .single();
  if (error || !app) {
    if (error?.message.includes("one_open_per_email")) {
      return NextResponse.json(
        { ok: false, error: "We already have an open application from this email address." },
        { status: 409 },
      );
    }
    console.error("[api/join]", error?.message);
    return NextResponse.json({ ok: false, error: "Something went wrong saving your application." }, { status: 500 });
  }

  await admin.from("practitioner_invites").update({ application_id: app.id }).eq("id", invite.inviteId);

  const uploads = [];
  for (const f of files) {
    const path = `applications/${app.id}/${randomUUID()}.${extensionFor(f.type)}`;
    const { data: signed, error: signError } = await admin.storage.from(DOCS_BUCKET).createSignedUploadUrl(path);
    if (signError || !signed) {
      console.error("[api/join] signed upload", signError?.message);
      return NextResponse.json({ ok: false, error: "Could not prepare the upload. Please try again." }, { status: 500 });
    }
    uploads.push({ path, token: signed.token, kind: f.kind, name: f.name.slice(0, 200) });
  }

  return NextResponse.json({ ok: true, applicationId: app.id, key: signApplication(app.id), uploads });
}
