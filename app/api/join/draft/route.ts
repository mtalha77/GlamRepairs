import { randomUUID } from "node:crypto";

import { NextResponse } from "next/server";

import { sendPractitionerEmail } from "@/lib/email/sendPractitionerEmail";
import { DOCS_BUCKET } from "@/lib/practitioners/applications";
import {
  ALLOWED_MIME,
  DOCUMENT_KINDS,
  extensionFor,
  loadDraft,
  lookupInvite,
  MAX_BYTES,
  MAX_FILES,
  parsePayout,
  parseQualification,
  parseWhoYouAre,
  PHOTO_MIME,
} from "@/lib/practitioners/join";
import type { PractitionerDocumentKind } from "@/lib/supabase/database.types";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

/**
 * The five-step application, saved after every step — HANDOVER-52 §4.1.
 *
 * The invite token is the credential for every action: it was emailed to
 * one person, and it stops working the moment the application is
 * submitted. Nothing is stored before the terms box is ticked at step 1,
 * and files go straight to the private bucket through one-time signed
 * URLs, never through our functions.
 */
export const dynamic = "force-dynamic";

type Body = Record<string, unknown> & { token?: unknown; action?: unknown };

const fail = (error: string, status = 422) => NextResponse.json({ ok: false, error }, { status });

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as Body | null;
  if (!body) return fail("Invalid request.", 400);
  const invite = await lookupInvite(typeof body.token === "string" ? body.token : null);
  if (!invite) return fail("This invitation link is no longer valid. Ask us for a new one.", 410);

  const admin = createAdminSupabaseClient();
  const now = new Date().toISOString();
  const action = body.action;

  // Step 1 creates the draft; everything else needs one.
  if (action === "who") {
    if (body.terms !== true) return fail("Please agree to the terms to continue.");
    const who = parseWhoYouAre(body);
    if ("error" in who) return fail(who.error);
    if (invite.applicationId) {
      const { error } = await admin
        .from("practitioner_applications")
        .update({ full_name: who.fullName, phone: who.phone, city: who.city, updated_at: now })
        .eq("id", invite.applicationId);
      if (error) return fail("Something went wrong saving this step.", 500);
      await advance(invite.applicationId, 2);
      return NextResponse.json({ ok: true });
    }
    const { data: app, error } = await admin
      .from("practitioner_applications")
      .insert({
        full_name: who.fullName,
        email: invite.email,
        phone: who.phone,
        city: who.city,
        kind: invite.kind,
        qualification: "",
        source: "invite",
        invite_id: invite.inviteId,
        agreed_to_terms: true,
        agreed_at: now,
        current_step: 2,
      })
      .select("id")
      .single();
    if (error || !app) {
      if (error?.message.includes("one_open_per_email")) return fail("We already have an open application from this email address.", 409);
      console.error("[api/join/draft] create", error?.message);
      return fail("Something went wrong saving this step.", 500);
    }
    await admin.from("practitioner_invites").update({ application_id: app.id }).eq("id", invite.inviteId);
    return NextResponse.json({ ok: true });
  }

  const applicationId = invite.applicationId;
  if (!applicationId) return fail("Please start with step 1.", 409);

  if (action === "qualification") {
    const q = parseQualification(body, invite.kind);
    if ("error" in q) return fail(q.error);
    const { error } = await admin
      .from("practitioner_applications")
      .update({
        qualification: q.qualification,
        qualification_year: q.qualificationYear,
        institution: q.institution,
        years_experience: q.years,
        clinics: q.clinics || null,
        about: q.about,
        portfolio_url: q.portfolioUrl,
        reg_body: q.regBody,
        reg_no: q.regNo,
        updated_at: now,
      })
      .eq("id", applicationId);
    if (error) return fail("Something went wrong saving this step.", 500);
    await advance(applicationId, 3);
    return NextResponse.json({ ok: true });
  }

  if (action === "upload") {
    const kind = String(body.kind ?? "") as PractitionerDocumentKind;
    const type = String(body.type ?? "");
    const size = Number(body.size);
    const name = String(body.name ?? "").slice(0, 200);
    if (!DOCUMENT_KINDS.includes(kind)) return fail("Choose what this file is.");
    const allowed: readonly string[] = kind === "photo" ? PHOTO_MIME : ALLOWED_MIME;
    if (!allowed.includes(type)) return fail(kind === "photo" ? "The photograph must be a JPG, PNG or WebP." : "Only PDF, JPG, PNG or WebP files.");
    if (!(size > 0) || size > MAX_BYTES) return fail("Files must be under 10 MB.");
    const { count } = await admin
      .from("practitioner_documents")
      .select("id", { count: "exact", head: true })
      .eq("application_id", applicationId)
      .is("deleted_at", null)
      .neq("kind", "photo");
    if (kind !== "photo" && (count ?? 0) >= MAX_FILES) return fail(`Attach at most ${MAX_FILES} documents. Remove one first.`);
    const path = `applications/${applicationId}/${randomUUID()}.${extensionFor(type)}`;
    const { data: signed, error } = await admin.storage.from(DOCS_BUCKET).createSignedUploadUrl(path);
    if (error || !signed) return fail("Could not prepare the upload. Please try again.", 500);
    return NextResponse.json({ ok: true, path, uploadToken: signed.token, kind, name });
  }

  if (action === "record") {
    // Only a file that is really in this application's folder is recorded.
    const path = String(body.path ?? "");
    const kind = String(body.kind ?? "") as PractitionerDocumentKind;
    const folder = `applications/${applicationId}`;
    if (!path.startsWith(`${folder}/`) || !DOCUMENT_KINDS.includes(kind)) return fail("Invalid request.", 400);
    const { data: listing } = await admin.storage.from(DOCS_BUCKET).list(folder, { limit: 100 });
    const object = (listing ?? []).find((o) => `${folder}/${o.name}` === path);
    if (!object) return fail("The upload did not arrive. Please try again.");
    const meta = object.metadata as { size?: number; mimetype?: string } | undefined;

    // A new photograph replaces the old one: object first, then the row.
    if (kind === "photo") {
      const { data: old } = await admin
        .from("practitioner_documents")
        .select("id, storage_path")
        .eq("application_id", applicationId)
        .eq("kind", "photo")
        .is("deleted_at", null);
      for (const o of old ?? []) await removeDocument(o.id, o.storage_path);
    }
    const { data: existing } = await admin.from("practitioner_documents").select("id").eq("storage_path", path).maybeSingle();
    if (!existing) {
      const { error } = await admin.from("practitioner_documents").insert({
        application_id: applicationId,
        kind,
        storage_path: path,
        original_name: String(body.name ?? "").slice(0, 200) || null,
        bytes: meta?.size ?? null,
        mime: meta?.mimetype ?? null,
      });
      if (error) return fail("The file arrived but could not be recorded.", 500);
    }
    const draft = await loadDraft(applicationId);
    return NextResponse.json({ ok: true, documents: draft?.documents ?? [] });
  }

  if (action === "remove") {
    const { data: doc } = await admin
      .from("practitioner_documents")
      .select("id, storage_path")
      .eq("id", String(body.documentId ?? ""))
      .eq("application_id", applicationId)
      .is("deleted_at", null)
      .maybeSingle();
    if (!doc) return fail("That file is not part of this application.", 404);
    if (!(await removeDocument(doc.id, doc.storage_path))) return fail("Could not remove the file. Please try again.", 500);
    const draft = await loadDraft(applicationId);
    return NextResponse.json({ ok: true, documents: draft?.documents ?? [] });
  }

  if (action === "documents") {
    const draft = await loadDraft(applicationId);
    if (!draft?.documents.some((d) => d.kind === "degree")) return fail("Please add your degree. It is the one document we need.");
    await advance(applicationId, 4);
    return NextResponse.json({ ok: true });
  }

  if (action === "photo") {
    const draft = await loadDraft(applicationId);
    if (!draft?.documents.some((d) => d.kind === "photo")) return fail("Please add your photograph.");
    await advance(applicationId, 5);
    return NextResponse.json({ ok: true });
  }

  if (action === "submit") {
    const payout = parsePayout(body);
    if ("error" in payout) return fail(payout.error);
    const draft = await loadDraft(applicationId);
    if (!draft) return fail("Invalid request.", 400);
    if (draft.qualification.length < 3) return fail("Please finish step 2 first.");
    if (!draft.documents.some((d) => d.kind === "degree")) return fail("Please add your degree at step 3 first.");
    if (!draft.documents.some((d) => d.kind === "photo")) return fail("Please add your photograph at step 4 first.");

    const { data: app, error } = await admin
      .from("practitioner_applications")
      .update({
        payout_bank: payout.bank,
        payout_account_title: payout.title,
        payout_reference: payout.reference || null,
        submitted_at: now,
        updated_at: now,
      })
      .eq("id", applicationId)
      .is("submitted_at", null)
      .select("id, full_name, email")
      .maybeSingle();
    if (error || !app) {
      console.error("[api/join/draft] submit", error?.message);
      return fail("Something went wrong submitting your application.", 500);
    }

    const { data: admins } = await admin.from("studio_members").select("user_id").eq("is_super_admin", true);
    if (admins?.length) {
      await admin.from("studio_notifications").insert(
        admins.map((a) => ({
          recipient_id: a.user_id,
          type: "practitioner_application" as const,
          title: "New practitioner application",
          body: `${app.full_name} has applied, with ${draft.documents.length} ${draft.documents.length === 1 ? "file" : "files"}.`,
          href: `/studio/applications/${applicationId}`,
          lead_id: null,
        })),
      );
    }
    await sendPractitionerEmail({ kind: "received", toEmail: app.email, name: app.full_name });
    return NextResponse.json({ ok: true });
  }

  return fail("Invalid request.", 400);
}

/** Moves the saved step forward, never back. */
async function advance(applicationId: string, step: number) {
  const admin = createAdminSupabaseClient();
  await admin.from("practitioner_applications").update({ current_step: step }).eq("id", applicationId).lt("current_step", step);
}

/** Storage object first, then the row, so a row never points at nothing. */
async function removeDocument(id: string, storagePath: string): Promise<boolean> {
  const admin = createAdminSupabaseClient();
  const { error } = await admin.storage.from(DOCS_BUCKET).remove([storagePath]);
  if (error) return false;
  const { error: rowError } = await admin.from("practitioner_documents").delete().eq("id", id);
  return !rowError;
}
