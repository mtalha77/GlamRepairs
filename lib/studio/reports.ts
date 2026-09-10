import { createServerSupabaseClient } from "@/lib/supabase/server";

export type StudioReport = {
  id: string;
  leadId: string;
  createdBy: string;
  authorName: string;
  noticed: string;
  morningRoutine: string;
  nightRoutine: string;
  avoidItems: string;
  extraNotes: string | null;
  /**
   * HANDOVER-16 Part 2 a/b/d. Null on every report sent before these
   * existed — the PDF omits the section rather than inventing one, so an
   * old report still downloads exactly as it was sent.
   */
  startHere: string | null;
  timeline: string | null;
  goodSigns: string | null;
  warningSigns: string | null;
  sentAt: string | null;
  createdAt: string;
};

export async function listCustomerReports(leadId: string) {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("studio_reports")
    .select(
      "id, lead_id, created_by, author_name, noticed, morning_routine, night_routine, avoid_items, extra_notes, start_here, timeline, good_signs, warning_signs, sent_at, created_at",
    )
    .eq("lead_id", leadId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[listCustomerReports]", error.message);
    return [];
  }

  return (data ?? []).map(
    (row) =>
      ({
        id: row.id,
        leadId: row.lead_id,
        createdBy: row.created_by,
        authorName: row.author_name,
        noticed: row.noticed,
        morningRoutine: row.morning_routine,
        nightRoutine: row.night_routine,
        avoidItems: row.avoid_items,
        extraNotes: row.extra_notes,
        startHere: row.start_here,
        timeline: row.timeline,
        goodSigns: row.good_signs,
        warningSigns: row.warning_signs,
        sentAt: row.sent_at,
        createdAt: row.created_at,
      }) satisfies StudioReport,
  );
}

export async function getCustomerReport(leadId: string, reportId: string) {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("studio_reports")
    .select(
      "id, lead_id, created_by, author_name, noticed, morning_routine, night_routine, avoid_items, extra_notes, start_here, timeline, good_signs, warning_signs, sent_at, created_at",
    )
    .eq("lead_id", leadId)
    .eq("id", reportId)
    .maybeSingle();

  if (error) {
    console.error("[getCustomerReport]", error.message);
    return null;
  }

  if (!data) return null;

  return {
    id: data.id,
    leadId: data.lead_id,
    createdBy: data.created_by,
    authorName: data.author_name,
    noticed: data.noticed,
    morningRoutine: data.morning_routine,
    nightRoutine: data.night_routine,
    avoidItems: data.avoid_items,
    extraNotes: data.extra_notes,
    startHere: data.start_here,
    timeline: data.timeline,
    goodSigns: data.good_signs,
    warningSigns: data.warning_signs,
    sentAt: data.sent_at,
    createdAt: data.created_at,
  } satisfies StudioReport;
}

/**
 * How many reports this practitioner has written, across all clients.
 *
 * HANDOVER-16 Part 6 uses it for one thing: the guidelines panel opens by
 * default until five reports have been sent. A head-only count, so it costs
 * nothing to run on every customer page.
 */
export async function countReportsByAuthor(userId: string) {
  const supabase = await createServerSupabaseClient();
  const { count, error } = await supabase
    .from("studio_reports")
    .select("id", { count: "exact", head: true })
    .eq("created_by", userId);

  if (error) {
    console.error("[countReportsByAuthor]", error.message);
    // Zero means "show the guidelines" — the safe direction to fail in.
    return 0;
  }

  return count ?? 0;
}

/**
 * HANDOVER-20 Part 1 — the previous reports written for the same person.
 *
 * "Continuity is the whole value of a repeat assessment — 'last time we
 * started you on niacinamide, how did that go?' is worth more than any new
 * questionnaire." That only works if the practitioner can see what was said
 * last time without hunting for the earlier lead, so this is fetched onto
 * the case she is already looking at.
 *
 * Joined through `leads.person_key` rather than by name or email: the
 * database resolves identity phone-first precisely because people mistype
 * their own email, and re-deriving that here would find fewer matches than
 * the banner beside it claims exist.
 */
export async function listPreviousReportsForPerson(
  personKey: string | null,
  excludeLeadId: string,
): Promise<StudioReport[]> {
  if (!personKey) return [];

  const supabase = await createServerSupabaseClient();

  const { data: siblings, error: siblingError } = await supabase
    .from("leads")
    .select("id")
    .eq("person_key", personKey)
    .neq("id", excludeLeadId)
    .is("deleted_at", null);

  if (siblingError) {
    console.error("[listPreviousReportsForPerson] leads", siblingError.message);
    return [];
  }

  const leadIds = (siblings ?? []).map((row) => row.id);
  if (leadIds.length === 0) return [];

  const { data, error } = await supabase
    .from("studio_reports")
    .select(
      "id, lead_id, created_by, author_name, noticed, morning_routine, night_routine, avoid_items, extra_notes, start_here, timeline, good_signs, warning_signs, sent_at, created_at",
    )
    .in("lead_id", leadIds)
    // Only reports that actually reached the client. A draft that was never
    // sent is not what they were told last time.
    .not("sent_at", "is", null)
    .order("sent_at", { ascending: false });

  if (error) {
    console.error("[listPreviousReportsForPerson] reports", error.message);
    return [];
  }

  return (data ?? []).map(
    (row) =>
      ({
        id: row.id,
        leadId: row.lead_id,
        createdBy: row.created_by,
        authorName: row.author_name,
        noticed: row.noticed,
        morningRoutine: row.morning_routine,
        nightRoutine: row.night_routine,
        avoidItems: row.avoid_items,
        extraNotes: row.extra_notes,
        startHere: row.start_here,
        timeline: row.timeline,
        goodSigns: row.good_signs,
        warningSigns: row.warning_signs,
        sentAt: row.sent_at,
        createdAt: row.created_at,
      }) satisfies StudioReport,
  );
}
