import "server-only";

import { timezonesFor } from "@/lib/countries/timezones";
import { outreachConfig, outreachDb, SENDER_NAME } from "@/lib/outreach/config";
import { renderStep } from "@/lib/outreach/render";

/**
 * The outreach send queue (Handover 68 §4.3, 69 §3.4). Run hourly by
 * .github/workflows/outreach.yml.
 *
 * Nothing goes out unless all of this holds, checked here on every run and
 * not left to anyone watching a chart:
 *
 *   sending is not paused, and the rolling-100 bounce and complaint check
 *   passes (it pauses everything itself if not)
 *   the separate outreach account is configured and the business address set
 *   under the daily cap (rolling 24 hours) and the hourly cap
 *   the sequence is active (which the database allows only with no blanks)
 *   the address is validated, not suppressed, not a client, practitioner,
 *   applicant or studio member
 *   the recipient is in Pakistan, unless non-Pakistan sending is enabled
 *   it is a weekday, inside business hours, in the recipient's country
 *
 * Each send is claimed in outreach_sends before it goes; unique
 * (enrolment, step) means a second run can never send the same step again.
 */

type Settings = {
  daily_cap: number;
  hourly_cap: number;
  paused: boolean;
  paused_reason: string | null;
  non_pk_enabled: boolean;
  business_address: string | null;
  business_hours_start: number;
  business_hours_end: number;
};

type Due = {
  id: string;
  contact_id: string;
  sequence_id: string;
  current_step: number;
  created_at: string;
};

type Contact = { id: string; email: string; first_name: string | null; company: string | null; country_code: string | null; email_status: string };
type Sequence = { id: string; code: string; audience: "practitioner" | "brand"; active: boolean };
type Step = { sequence_id: string; step_no: number; delay_days: number; subject: string; body_md: string };

export type QueueRun = { sent: number; skipped: Record<string, number>; stopped: string | null; errors: string[] };

const DAY = 86_400_000;
/** Steps are never closer than this, even when a run was missed. */
const MIN_GAP_MS = 20 * 3_600_000;

function inBusinessHours(countryCode: string | null, s: Settings, now = new Date()): boolean {
  const zone = timezonesFor(countryCode)[0] ?? "Asia/Karachi";
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: zone, weekday: "short", hour: "numeric", hourCycle: "h23" }).formatToParts(now);
  const weekday = parts.find((p) => p.type === "weekday")?.value ?? "";
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? "0");
  if (weekday === "Sat" || weekday === "Sun") return false;
  return hour >= s.business_hours_start && hour < s.business_hours_end;
}

export async function runOutreachQueue(): Promise<QueueRun> {
  const run: QueueRun = { sent: 0, skipped: {}, stopped: null, errors: [] };
  const skip = (why: string) => (run.skipped[why] = (run.skipped[why] ?? 0) + 1);
  const db = outreachDb();

  const { data: settings } = await db.from("outreach_settings").select("*").eq("id", true).single();
  const s = settings as Settings | null;
  if (!s) return { ...run, stopped: "No outreach settings row." };
  if (s.paused) return { ...run, stopped: `Paused: ${s.paused_reason ?? "no reason recorded"}` };
  const { data: guard } = await db.rpc("outreach_guard_check");
  if (guard) return { ...run, stopped: `Paused: ${guard}` };
  const cfg = outreachConfig();
  if (!cfg.ok) return { ...run, stopped: cfg.reason };
  if (!s.business_address?.trim()) return { ...run, stopped: "No business address set in Studio > Outreach." };

  const now = Date.now();
  const [{ count: last24 }, { count: lastHour }] = await Promise.all([
    db.from("outreach_sends").select("id", { count: "exact", head: true }).gte("sent_at", new Date(now - DAY).toISOString()),
    db.from("outreach_sends").select("id", { count: "exact", head: true }).gte("sent_at", new Date(now - 3_600_000).toISOString()),
  ]);
  let budget = Math.min(s.daily_cap - (last24 ?? 0), s.hourly_cap - (lastHour ?? 0));
  if (budget <= 0) return { ...run, stopped: "Cap reached for now." };

  const { data: dueRows } = await db
    .from("outreach_enrolments")
    .select("id, contact_id, sequence_id, current_step, created_at")
    .eq("status", "active")
    .lte("next_send_at", new Date(now).toISOString())
    .order("next_send_at")
    .limit(Math.max(budget * 4, 20));
  const due = (dueRows ?? []) as Due[];
  if (!due.length) return run;

  const [{ data: contacts }, { data: sequences }, { data: steps }] = await Promise.all([
    db.from("outreach_contacts").select("id, email, first_name, company, country_code, email_status").in("id", due.map((d) => d.contact_id)),
    db.from("outreach_sequences").select("id, code, audience, active").in("id", [...new Set(due.map((d) => d.sequence_id))]),
    db.from("outreach_steps").select("sequence_id, step_no, delay_days, subject, body_md").in("sequence_id", [...new Set(due.map((d) => d.sequence_id))]),
  ]);
  const contactById = new Map(((contacts ?? []) as Contact[]).map((c) => [c.id, c]));
  const seqById = new Map(((sequences ?? []) as Sequence[]).map((q) => [q.id, q]));
  const stepsFor = (seqId: string) => ((steps ?? []) as Step[]).filter((x) => x.sequence_id === seqId).sort((a, b) => a.step_no - b.step_no);

  for (const e of due) {
    if (budget <= 0) break;
    const seq = seqById.get(e.sequence_id);
    const contact = contactById.get(e.contact_id);
    if (!seq || !contact) {
      skip("missing record");
      continue;
    }
    if (!seq.active) {
      skip("sequence not active");
      continue;
    }
    if (contact.email_status !== "valid") {
      skip("address not validated");
      continue;
    }
    if ((contact.country_code ?? "") !== "PK" && !s.non_pk_enabled) {
      skip("outside Pakistan (gated pending legal advice)");
      continue;
    }
    if (!inBusinessHours(contact.country_code, s)) {
      skip("outside business hours");
      continue;
    }
    const { data: blocked } = await db.rpc("outreach_block_reason", { p_email: contact.email, p_new_enrolment: false });
    if (blocked) {
      await db.from("outreach_enrolments").update({ status: "exited", exit_reason: String(blocked), next_send_at: null }).eq("id", e.id);
      skip("blocked");
      continue;
    }

    const all = stepsFor(seq.id);
    const step = all.find((x) => x.step_no === e.current_step + 1);
    if (!step) {
      await db.from("outreach_enrolments").update({ status: "complete", next_send_at: null }).eq("id", e.id);
      await db.from("outreach_contacts").update({ status: "complete" }).eq("id", contact.id).eq("status", "active");
      continue;
    }
    const rendered = renderStep({ step, contact, sequenceCode: seq.code, audience: seq.audience, businessAddress: s.business_address });
    if (!rendered.ok) {
      skip(rendered.reason);
      continue;
    }

    const { data: claim, error: claimError } = await db
      .from("outreach_sends")
      .insert({ enrolment_id: e.id, contact_id: contact.id, step_no: step.step_no, to_email: contact.email, subject: rendered.email.subject })
      .select("id")
      .single();
    if (claimError || !claim) {
      // Already sent by an earlier run: move the pointer past it.
      if (claimError?.code === "23505") await db.from("outreach_enrolments").update({ current_step: step.step_no }).eq("id", e.id);
      skip("already sent");
      continue;
    }

    const { data: sent, error } = await cfg.config.resend.emails.send({
      from: `${SENDER_NAME[seq.audience]} <${cfg.config.fromEmail}>`,
      to: [contact.email],
      subject: rendered.email.subject,
      html: rendered.email.html,
      text: rendered.email.text,
      headers: rendered.email.headers,
      ...(cfg.config.replyTo ? { replyTo: cfg.config.replyTo } : {}),
    });
    if (error || !sent?.id) {
      await db.from("outreach_sends").delete().eq("id", claim.id).is("provider_id", null);
      run.errors.push(`${contact.email}: ${error?.message ?? "no id returned"}`);
      continue;
    }
    await db.from("outreach_sends").update({ provider_id: sent.id }).eq("id", claim.id);

    const next = all.find((x) => x.step_no === step.step_no + 1);
    const nextAt = next ? Math.max(new Date(e.created_at).getTime() + next.delay_days * DAY, Date.now() + MIN_GAP_MS) : null;
    await db
      .from("outreach_enrolments")
      .update({
        current_step: step.step_no,
        status: next ? "active" : "complete",
        next_send_at: nextAt ? new Date(nextAt).toISOString() : null,
      })
      .eq("id", e.id);
    await db.from("outreach_contacts").update({ status: next ? "active" : "complete" }).eq("id", contact.id).in("status", ["new", "queued", "active"]);

    run.sent += 1;
    budget -= 1;
  }
  return run;
}
