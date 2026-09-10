import { createServerSupabaseClient } from "@/lib/supabase/server";
import { REVIEW_DECISION_LABELS } from "@/lib/studio/constants";
import type { ReviewDecision } from "@/lib/supabase/database.types";

export type StudioLogKind = "customer" | "review" | "report" | "email";

export type StudioLog = {
  id: string;
  createdAt: string;
  kind: StudioLogKind;
  title: string;
  detail: string;
  href: string | null;
};

const KIND_LABELS: Record<StudioLogKind, string> = {
  customer: "Customer",
  review: "Review",
  report: "Report",
  email: "Email",
};

export function studioLogKindLabel(kind: StudioLogKind) {
  return KIND_LABELS[kind];
}

function customerName(
  names: Map<string, string>,
  leadId: string,
  fallback = "Customer",
) {
  return names.get(leadId) || fallback;
}

export async function listStudioLogs(limit = 100): Promise<StudioLog[]> {
  const supabase = await createServerSupabaseClient();
  const [leadsResult, reviewsResult, reportsResult, emailsResult] =
    await Promise.all([
      // Archived leads drop out of the activity log too (HANDOVER-18 §1).
      supabase
        .from("leads")
        .select("id, full_name, email, created_at")
        .is("deleted_at", null),
      supabase
        .from("studio_reviews")
        .select("id, lead_id, author_name, decision, created_at"),
      supabase
        .from("studio_reports")
        .select("id, lead_id, author_name, created_at"),
      supabase
        .from("studio_emails")
        .select("id, lead_id, to_email, subject, created_at"),
    ]);

  if (leadsResult.error) {
    console.error("[listStudioLogs] leads", leadsResult.error.message);
  }
  if (reviewsResult.error) {
    console.error("[listStudioLogs] reviews", reviewsResult.error.message);
  }
  if (reportsResult.error) {
    console.error("[listStudioLogs] reports", reportsResult.error.message);
  }
  if (emailsResult.error) {
    console.error("[listStudioLogs] emails", emailsResult.error.message);
  }

  const leads = leadsResult.data ?? [];
  const names = new Map(
    leads.map((lead) => [
      lead.id,
      lead.full_name?.trim() || lead.email?.trim() || "Unnamed customer",
    ]),
  );

  const logs: StudioLog[] = [];

  for (const lead of leads) {
    logs.push({
      id: `customer-${lead.id}`,
      createdAt: lead.created_at,
      kind: "customer",
      title: `${customerName(names, lead.id)} added`,
      detail: lead.email?.trim() || "No email",
      href: `/studio/customers/${lead.id}`,
    });
  }

  for (const row of reviewsResult.data ?? []) {
    const decision = REVIEW_DECISION_LABELS[row.decision as ReviewDecision];
    logs.push({
      id: `review-${row.id}`,
      createdAt: row.created_at,
      kind: "review",
      title: `${row.author_name} sent a photo review`,
      detail: `${customerName(names, row.lead_id)}${decision ? ` · ${decision}` : ""}`,
      href: `/studio/customers/${row.lead_id}`,
    });
  }

  for (const row of reportsResult.data ?? []) {
    logs.push({
      id: `report-${row.id}`,
      createdAt: row.created_at,
      kind: "report",
      title: `${row.author_name} sent a PDF report`,
      detail: customerName(names, row.lead_id),
      href: `/studio/customers/${row.lead_id}`,
    });
  }

  for (const row of emailsResult.data ?? []) {
    logs.push({
      id: `email-${row.id}`,
      createdAt: row.created_at,
      kind: "email",
      title: row.subject || "Email sent",
      detail: `${customerName(names, row.lead_id)} · ${row.to_email}`,
      href: `/studio/customers/${row.lead_id}`,
    });
  }

  return logs
    .sort(
      (left, right) =>
        new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
    )
    .slice(0, limit);
}
