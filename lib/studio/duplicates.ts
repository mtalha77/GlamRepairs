import { createServerSupabaseClient } from "@/lib/supabase/server";

/**
 * HANDOVER-20 Part 1 — repeat submissions.
 *
 * ── The governing decision ───────────────────────────────────────────────
 * A repeat submission is not an error to be prevented. Someone coming back
 * in three months for a second assessment is the best customer this
 * business has, and blocking that costs revenue. So nothing here rejects a
 * submission and nothing auto-merges: the database classifies, and a person
 * decides.
 *
 * Identity is resolved by a database trigger into `leads.person_key`, phone
 * first because people mistype their own email far more often than their own
 * number. This module only reads the result.
 */

/** Set automatically by `lead_supersede_previous`. Never written from here. */
export type DuplicateReason =
  | "supersedes_abandoned_attempt"
  | "superseded_by_restart"
  | "likely_double_submit"
  | "returning_client"
  | "review_possible_duplicate";

export const DUPLICATE_REASON_LABEL: Record<DuplicateReason, string> = {
  supersedes_abandoned_attempt: "Restarted an unfinished attempt",
  superseded_by_restart: "Replaced by a later restart",
  likely_double_submit: "Likely accidental double submission",
  returning_client: "Returning client",
  review_possible_duplicate: "Possible duplicate",
};

/**
 * What the studio should actually do, per the handover's table. Shown next
 * to the label, because "returning_client" and "likely_double_submit" call
 * for opposite responses and the difference is the entire point.
 */
export const DUPLICATE_REASON_ACTION: Record<DuplicateReason, string> = {
  supersedes_abandoned_attempt:
    "Nothing to do — this is the real submission.",
  superseded_by_restart:
    "Hidden from active lists. The client restarted and finished elsewhere.",
  likely_double_submit:
    "Merge or dismiss one. Almost always an accidental resubmit.",
  returning_client:
    "Treat as a returning customer, not a duplicate. Open their previous report before writing.",
  review_possible_duplicate:
    "Ambiguous — between 1 and 30 days. Someone may legitimately want a second opinion.",
};

export function isDuplicateReason(value: string): value is DuplicateReason {
  return value in DUPLICATE_REASON_LABEL;
}

/** The two that need a human to look at them. */
export const REVIEWABLE_DUPLICATE_REASONS: DuplicateReason[] = [
  "likely_double_submit",
  "review_possible_duplicate",
];

export type PersonHistory = {
  personKey: string;
  submissions: number;
  completed: number;
  paid: number;
  firstSeen: string;
  lastSeen: string;
  latestName: string | null;
};

type HistoryRow = {
  person_key: string;
  submissions: number;
  completed: number;
  paid: number;
  first_seen: string;
  last_seen: string;
  latest_name: string | null;
};

/**
 * One person's submission history.
 *
 * ⚠️ `studio_person_history` filters `is_test = false`, so a test lead has no
 * history even when it has a `person_key`. That is correct for production and
 * confusing in testing — if the banner is missing on a seeded lead, this is
 * why, not a bug.
 */
export async function getPersonHistory(
  personKey: string | null,
): Promise<PersonHistory | null> {
  if (!personKey) return null;

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("studio_person_history")
    .select(
      "person_key, submissions, completed, paid, first_seen, last_seen, latest_name",
    )
    .eq("person_key", personKey)
    .maybeSingle();

  if (error) {
    console.error("[getPersonHistory]", error.message);
    return null;
  }
  if (!data) return null;

  const row = data as unknown as HistoryRow;
  return {
    personKey: row.person_key,
    submissions: row.submissions ?? 0,
    completed: row.completed ?? 0,
    paid: row.paid ?? 0,
    firstSeen: row.first_seen,
    lastSeen: row.last_seen,
    latestName: row.latest_name,
  };
}

export type SiblingSubmission = {
  id: string;
  sessionId: string;
  createdAt: string;
  submissionNo: number | null;
  duplicateReason: string | null;
  funnelComplete: boolean;
  paymentStatus: string;
  planName: string | null;
};

/**
 * The other submissions from the same person, newest first.
 *
 * Excludes the lead being viewed, and excludes archived rows — a dismissed
 * duplicate should not keep reappearing in the history of the one that was
 * kept.
 */
export async function listSiblingSubmissions(
  personKey: string | null,
  excludeLeadId: string,
): Promise<SiblingSubmission[]> {
  if (!personKey) return [];

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("leads")
    .select(
      "id, session_id, created_at, submission_no, duplicate_reason, funnel_complete, payment_status, plan_name",
    )
    .eq("person_key", personKey)
    .neq("id", excludeLeadId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[listSiblingSubmissions]", error.message);
    return [];
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    sessionId: row.session_id,
    createdAt: row.created_at,
    submissionNo: row.submission_no,
    duplicateReason: row.duplicate_reason,
    funnelComplete: Boolean(row.funnel_complete),
    paymentStatus: row.payment_status ?? "pending",
    planName: row.plan_name,
  }));
}

/**
 * The review queue: only the two ambiguous classifications.
 *
 * `supersedes_abandoned_attempt` and `returning_client` are deliberately
 * absent — the first needs no decision and the second is a customer, not a
 * problem. Putting either in a queue called "duplicates" would train whoever
 * works it to dismiss the wrong rows.
 */
export async function listDuplicatesForReview() {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("leads")
    .select(
      "id, session_id, full_name, email, created_at, submission_no, duplicate_reason, duplicate_of, person_key, funnel_complete, payment_status, plan_name, is_test",
    )
    .in("duplicate_reason", REVIEWABLE_DUPLICATE_REASONS)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[listDuplicatesForReview]", error.message);
    return [];
  }
  return data ?? [];
}
