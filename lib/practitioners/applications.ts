import "server-only";

import type { PractitionerApplicationStatus, PractitionerDocumentKind } from "@/lib/supabase/database.types";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

/**
 * Practitioner applications, the read side — HANDOVER-51 §4.2.
 *
 * Service role reads, after the page has checked the viewer is a super
 * admin. Applicant documents are only ever handed out as short-lived
 * signed URLs: the bucket is private and there is no public address.
 */

export const DOCS_BUCKET = "practitioner-docs";
const SIGNED_URL_SECONDS = 10 * 60;

export const OPEN_STATUSES: PractitionerApplicationStatus[] = ["new", "screening", "interview", "test_assessment"];

export const STATUS_LABEL: Record<PractitionerApplicationStatus, string> = {
  new: "New",
  screening: "Screening",
  interview: "Interview",
  test_assessment: "Test assessments",
  approved: "Approved",
  rejected: "Rejected",
  withdrawn: "Withdrawn",
};

export const DOCUMENT_KIND_LABEL: Record<PractitionerDocumentKind, string> = {
  degree: "Degree",
  certificate: "Certificate",
  attestation: "HEC attestation",
  registration: "Registration",
  id: "ID",
  other: "Other",
};

export async function listApplicationQueue() {
  const { data, error } = await createAdminSupabaseClient()
    .from("practitioner_application_queue")
    .select("*")
    .limit(200);
  if (error) console.error("[listApplicationQueue]", error.message);
  return data ?? [];
}

export async function listInvites() {
  const { data } = await createAdminSupabaseClient()
    .from("practitioner_invites")
    .select("id, created_at, email, kind, expires_at, accepted_at, application_id, revoked_at, note")
    .eq("is_test", false)
    .order("created_at", { ascending: false })
    .limit(50);
  return data ?? [];
}

export type ApplicationDocument = {
  id: string;
  kind: PractitionerDocumentKind;
  originalName: string | null;
  bytes: number | null;
  mime: string | null;
  verified: boolean;
  verifiedAt: string | null;
  purgeAfter: string | null;
  url: string | null;
};

export async function getApplication(id: string) {
  const supabase = createAdminSupabaseClient();
  const { data: app } = await supabase
    .from("practitioner_applications")
    .select("*")
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();
  if (!app) return null;

  // After approval the documents belong to the profile, not the application.
  const owner = app.profile_id
    ? supabase.from("practitioner_documents").select("*").eq("practitioner_id", app.profile_id)
    : supabase.from("practitioner_documents").select("*").eq("application_id", app.id);
  const { data: docs } = await owner.is("deleted_at", null).order("created_at");

  const documents: ApplicationDocument[] = await Promise.all(
    (docs ?? []).map(async (d) => {
      const { data: signed } = await supabase.storage.from(DOCS_BUCKET).createSignedUrl(d.storage_path, SIGNED_URL_SECONDS);
      return {
        id: d.id,
        kind: d.kind,
        originalName: d.original_name,
        bytes: d.bytes,
        mime: d.mime,
        verified: Boolean(d.verified),
        verifiedAt: d.verified_at,
        purgeAfter: d.purge_after,
        url: signed?.signedUrl ?? null,
      };
    }),
  );

  const { data: profile } = app.profile_id
    ? await supabase
        .from("practitioner_profiles")
        .select("id, slug, status, user_id, photo_url, bio")
        .eq("id", app.profile_id)
        .maybeSingle()
    : { data: null };

  const { data: revisions } = await supabase
    .from("practitioner_revision_requests")
    .select("id, fields, message, requested_at, resolved_at")
    .eq("application_id", app.id)
    .order("requested_at", { ascending: false });

  return { app, documents, profile, revisions: revisions ?? [] };
}

export async function countOpenApplications(): Promise<number> {
  const { count } = await createAdminSupabaseClient()
    .from("practitioner_applications")
    .select("id", { count: "exact", head: true })
    .in("status", OPEN_STATUSES)
    .is("deleted_at", null)
    .eq("is_test", false);
  return count ?? 0;
}
