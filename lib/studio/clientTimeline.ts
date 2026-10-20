import "server-only";

import { createAdminSupabaseClient } from "@/lib/supabase/admin";

/**
 * One client's whole history, newest first — Talha, 20 October 2026:
 * "Client history should be saved like everything, what email
 * communication is done, when they were provided consultation, their
 * report and everything so I can check in the future."
 *
 * Nothing new is stored here: every event already lives in its own table
 * (and stays there; archiving a client never deletes them). This reads them
 * all and puts them on one line. Service role reads, so the caller must
 * already have checked the viewer may see this client.
 */

export type TimelineKind = "form" | "payment" | "assign" | "email" | "report" | "review" | "consultation" | "note" | "feedback" | "followup" | "contact" | "photos" | "archive";

export type TimelineEvent = { at: string; kind: TimelineKind; title: string; detail?: string };

function rupees(minor: number | null, currency: string | null) {
  if (minor === null) return "";
  return currency && currency !== "PKR" ? `${currency} ${(minor / 100).toFixed(2)}` : `Rs ${Math.round(minor / 100).toLocaleString("en-PK")}`;
}

export async function clientTimeline(leadId: string, opts: { includeContactEdits: boolean }): Promise<TimelineEvent[]> {
  const admin = createAdminSupabaseClient();
  const { data: lead } = await admin
    .from("leads")
    .select("created_at, funnel_complete, plan_name, assigned_at, assigned_to, payment_verified_at, payment_verified_by, photos_deleted_at, photos_deletion_reason, deleted_at, deletion_reason")
    .eq("id", leadId)
    .maybeSingle();
  if (!lead) return [];

  const [members, payments, emails, reports, reviews, appts, followups, edits] = await Promise.all([
    admin.from("studio_members").select("user_id, display_name"),
    admin.from("payments").select("amount_minor, currency, method, status, received_at, verified_at, created_at, is_test").eq("lead_id", leadId),
    admin.from("studio_emails").select("created_at, subject, sent_by, status, to_email").eq("lead_id", leadId),
    admin.from("studio_reports").select("created_at, sent_at, author_name").eq("lead_id", leadId),
    admin.from("studio_reviews").select("created_at, author_name, decision").eq("lead_id", leadId),
    admin.from("appointments").select("id, created_at, starts_at, status, outcome, practitioner_id").eq("lead_id", leadId),
    admin.from("client_followups").select("sequence, due_at, status, email_sent_at, whatsapp_sent_at, completed_at, notes").eq("lead_id", leadId),
    opts.includeContactEdits
      ? admin.from("lead_contact_edits").select("field, old_value, new_value, edited_by, edited_at").eq("lead_id", leadId)
      : Promise.resolve({ data: [] as { field: string; old_value: string | null; new_value: string | null; edited_by: string | null; edited_at: string }[] }),
  ]);
  const name = new Map((members.data ?? []).map((m) => [m.user_id, m.display_name]));
  const who = (id: string | null | undefined) => (id ? (name.get(id) ?? "a former team member") : "automatically");

  const apptIds = (appts.data ?? []).map((a) => a.id);
  const practitionerIds = [...new Set((appts.data ?? []).map((a) => a.practitioner_id))];
  const [notes, feedback, practitioners] = await Promise.all([
    apptIds.length ? admin.from("consultation_notes").select("appointment_id, submitted_at, escalated").in("appointment_id", apptIds) : Promise.resolve({ data: [] }),
    apptIds.length ? admin.from("consultation_feedback").select("appointment_id, rating, comment, created_at").in("appointment_id", apptIds) : Promise.resolve({ data: [] }),
    practitionerIds.length ? admin.from("practitioner_profiles").select("id, full_name").in("id", practitionerIds) : Promise.resolve({ data: [] }),
  ]);
  const practitioner = new Map((practitioners.data ?? []).map((p) => [p.id, p.full_name]));

  const events: TimelineEvent[] = [];
  const push = (at: string | null | undefined, kind: TimelineKind, title: string, detail?: string) => {
    if (at) events.push({ at, kind, title, detail });
  };

  push(lead.created_at, "form", lead.funnel_complete ? "Assessment form sent" : "Assessment form started", lead.plan_name ?? undefined);
  push(lead.payment_verified_at, "payment", "Payment verified", `by ${who(lead.payment_verified_by)}`);
  for (const p of payments.data ?? []) {
    if (p.is_test) continue;
    push(p.received_at ?? p.created_at, "payment", `Payment ${p.status}`, [rupees(p.amount_minor, p.currency), p.method].filter(Boolean).join(", "));
  }
  if (lead.assigned_to) push(lead.assigned_at, "assign", `Assigned to ${who(lead.assigned_to)}`);
  for (const e of emails.data ?? []) {
    push(e.created_at, "email", `Email: ${e.subject}`, `${e.sent_by ? `sent by ${who(e.sent_by)}` : "automatic"} to ${e.to_email}${e.status === "failed" ? ", failed" : ""}`);
  }
  for (const r of reports.data ?? []) {
    push(r.created_at, "report", "Report drafted", r.author_name ? `by ${r.author_name}` : undefined);
    push(r.sent_at, "report", "Report sent to the client", r.author_name ? `signed ${r.author_name}` : undefined);
  }
  for (const r of reviews.data ?? []) push(r.created_at, "review", "Photo review", [r.author_name, r.decision].filter(Boolean).join(", "));
  for (const a of appts.data ?? []) {
    const by = practitioner.get(a.practitioner_id) ?? "practitioner";
    push(a.created_at, "consultation", "Consultation booked", `with ${by}`);
    if (a.status !== "cancelled" || a.outcome) {
      push(a.starts_at, "consultation", "Consultation", `with ${by}${a.outcome ? `, ${a.outcome.replace(/_/g, " ")}` : a.status === "scheduled" ? "" : `, ${a.status}`}`);
    } else {
      push(a.starts_at, "consultation", "Consultation cancelled", `with ${by}`);
    }
  }
  for (const n of notes.data ?? []) push(n.submitted_at, "note", "Consultation note written", n.escalated ? "escalated to a doctor" : undefined);
  for (const f of feedback.data ?? []) push(f.created_at, "feedback", `Feedback: ${f.rating} of 5`, f.comment ?? undefined);
  for (const f of followups.data ?? []) {
    const label = f.sequence === 1 ? "15 day" : "30 day";
    push(f.email_sent_at, "followup", `${label} follow-up email sent`);
    push(f.whatsapp_sent_at, "followup", `${label} follow-up sent on WhatsApp`);
    if (f.status !== "pending") push(f.completed_at, "followup", `${label} follow-up ${f.status === "done" ? "done" : "skipped"}`, f.notes ?? undefined);
  }
  for (const e of edits.data ?? []) {
    push(e.edited_at, "contact", `${e.field === "full_name" ? "Name" : e.field === "email" ? "Email" : "Phone"} changed`, `${e.old_value ?? "none"} to ${e.new_value ?? "none"}, by ${who(e.edited_by)}`);
  }
  push(lead.photos_deleted_at, "photos", "Photographs deleted", lead.photos_deletion_reason ?? undefined);
  push(lead.deleted_at, "archive", "Archived", lead.deletion_reason ?? undefined);

  return events.sort((x, y) => y.at.localeCompare(x.at));
}
