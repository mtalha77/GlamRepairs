import "server-only";

import { logClientEmail } from "@/lib/email/logClientEmail";
import { sendTemplateEmail } from "@/lib/email/sendTemplateEmail";
import { leadResumeUrl } from "@/lib/funnel/resumeLink";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

/**
 * The hourly client email job — Talha, 20 October 2026.
 *
 *   abandonment   "Auto email should be sent to the clients for follow ups
 *                 if they have not filled the form." Three emails on the
 *                 abandon_queue schedule (4 hours, 2 days, 7 days), each
 *                 with a link that restores their saved answers.
 *   follow-ups    "Clients should be sent 15 days and 30 days follow up msg
 *                 after their report with email and WA." The email goes
 *                 from here; the WhatsApp is sent by a person from Studio →
 *                 Follow-ups, from the business phone.
 *
 * Neither ever reaches back in time: the first nudge only goes within 48
 * hours of stopping (it says "earlier today"), later ones within 14 days,
 * and a follow-up email only within 7 days of falling due. Older items
 * stay visible in Studio for a person to judge.
 */

const HOUR = 3_600_000;

export type ClientEmailRun = { abandonSent: number; abandonSkipped: number; followupsSent: number; errors: string[] };

export async function runClientEmailJob(): Promise<ClientEmailRun> {
  const admin = createAdminSupabaseClient();
  const run: ClientEmailRun = { abandonSent: 0, abandonSkipped: 0, followupsSent: 0, errors: [] };

  // ── Abandoned assessments ────────────────────────────────────────────
  const { data: queue, error: queueError } = await admin.from("abandon_queue").select("*").limit(25);
  if (queueError) run.errors.push(`abandon_queue: ${queueError.message}`);
  for (const row of queue ?? []) {
    const fresh = row.next_kind === "abandon_1" ? row.hours_idle <= 48 : row.hours_idle <= 14 * 24;
    if (!fresh || !row.email.includes("@")) {
      run.abandonSkipped++;
      continue;
    }
    const sent = await sendTemplateEmail({
      key: row.next_kind,
      leadId: row.lead_id,
      toEmail: row.email,
      fullName: row.full_name,
      vars: { resume_url: leadResumeUrl(row.lead_id) },
    });
    if (!sent.ok) {
      run.errors.push(`${row.next_kind} ${row.lead_id}: ${sent.message}`);
      continue;
    }
    // Logs the email on the client's record and moves them to the next stage.
    const { error } = await admin.rpc("log_abandon_email", {
      p_lead: row.lead_id,
      p_kind: row.next_kind,
      p_to: row.email,
      p_subject: sent.subject,
      p_body: sent.text,
      p_resend_id: sent.resendId,
    });
    if (error) run.errors.push(`log_abandon_email ${row.lead_id}: ${error.message}`);
    else run.abandonSent++;
  }

  // ── 15 and 30 day follow-ups ─────────────────────────────────────────
  const now = Date.now();
  const { data: due, error: dueError } = await admin
    .from("client_followups")
    .select("id, lead_id, sequence, due_at")
    .eq("status", "pending")
    .is("email_sent_at", null)
    .lte("due_at", new Date(now).toISOString())
    .gte("due_at", new Date(now - 7 * 24 * HOUR).toISOString())
    .limit(50);
  if (dueError) run.errors.push(`client_followups: ${dueError.message}`);
  for (const f of due ?? []) {
    const { data: lead } = await admin
      .from("leads")
      .select("full_name, email, is_test, deleted_at, do_not_contact")
      .eq("id", f.lead_id)
      .maybeSingle();
    if (!lead?.email || lead.is_test || lead.deleted_at || lead.do_not_contact) continue;
    // Claim first, so a second run cannot send it too.
    const { data: claimed } = await admin
      .from("client_followups")
      .update({ email_sent_at: new Date().toISOString() })
      .eq("id", f.id)
      .is("email_sent_at", null)
      .select("id")
      .maybeSingle();
    if (!claimed) continue;
    const key = f.sequence === 1 ? "followup_15" : "followup_30";
    const sent = await sendTemplateEmail({ key, leadId: f.lead_id, toEmail: lead.email, fullName: lead.full_name });
    if (!sent.ok) {
      await admin.from("client_followups").update({ email_sent_at: null }).eq("id", f.id);
      run.errors.push(`${key} ${f.lead_id}: ${sent.message}`);
      continue;
    }
    await logClientEmail({
      leadId: f.lead_id,
      toEmail: lead.email,
      subject: sent.subject,
      body: sent.text,
      kind: "other",
      templateKey: key,
      resendId: sent.resendId,
    });
    run.followupsSent++;
  }

  return run;
}
