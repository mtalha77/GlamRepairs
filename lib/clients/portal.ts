import "server-only";

import { leadDisplayRef } from "@/lib/leads/displayRef";
import { getPhotosBucket } from "@/lib/leads/uploadAssessmentPhotos";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { cleanPaths } from "@/lib/uploads/scans";

/**
 * What a signed-in client may see: their own client_portal row, their own
 * sent report, their own photographs. Read with the service role and
 * always filtered by the account the session resolved to, never by an id
 * from the URL alone. HANDOVER-60 Part 2.3.
 */

export async function getPortal(accountId: string) {
  const { data } = await createAdminSupabaseClient()
    .from("client_portal")
    .select("*")
    .eq("account_id", accountId)
    .maybeSingle();
  return data;
}

/** The latest SENT report on this client's lead. Drafts never reach a client. */
export async function getClientReport(leadId: string) {
  const { data } = await createAdminSupabaseClient()
    .from("studio_reports")
    .select(
      "id, author_name, noticed, morning_routine, night_routine, avoid_items, extra_notes, start_here, timeline, good_signs, warning_signs, sent_at, created_at",
    )
    .eq("lead_id", leadId)
    .not("sent_at", "is", null)
    .order("sent_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data;
}

export async function getClientLead(leadId: string) {
  const { data } = await createAdminSupabaseClient()
    .from("leads")
    .select("id, session_id, full_name, email, answers, plan_name, selected_plan, photo_paths, photos_deleted_at, photos_expire_at")
    .eq("id", leadId)
    .is("deleted_at", null)
    .maybeSingle();
  if (!data) return null;
  return { ...data, ref: leadDisplayRef(data.session_id) };
}

/** Photo paths the client may view: still stored, and scanned clean. */
export async function viewablePhotoPaths(lead: { photo_paths: string[] | null; photos_deleted_at: string | null }) {
  if (lead.photos_deleted_at || !lead.photo_paths?.length) return [];
  const clean = await cleanPaths(getPhotosBucket(), lead.photo_paths);
  return lead.photo_paths.filter((p) => clean.has(p));
}
