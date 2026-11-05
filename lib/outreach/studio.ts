import "server-only";

import { outreachConfig, outreachDb } from "@/lib/outreach/config";

/**
 * Reads for Studio > Outreach (Handover 69 §3.2). Reply rate is the number
 * that matters; open rate is shown small and labelled unreliable, because
 * Apple Mail Privacy Protection opens every email it receives.
 */

export type OutreachSettings = {
  daily_cap: number;
  hourly_cap: number;
  bounce_pause_pct: number;
  complaint_pause_pct: number;
  paused: boolean;
  paused_reason: string | null;
  paused_at: string | null;
  non_pk_enabled: boolean;
  business_address: string | null;
  business_hours_start: number;
  business_hours_end: number;
};

type SendRow = {
  id: string;
  enrolment_id: string;
  contact_id: string;
  step_no: number;
  sent_at: string;
  delivered_at: string | null;
  opened_at: string | null;
  bounced_at: string | null;
  complained_at: string | null;
};

export type Metrics = {
  sent7: number;
  sent30: number;
  delivered: number;
  bounced: number;
  complained: number;
  unsubscribed: number;
  replied: number;
  opened: number;
};

export type StepFunnel = { step_no: number; delay_days: number; subject: string; sent: number; delivered: number; bounced: number; replied: number; unsubscribed: number };
export type SequenceSummary = {
  id: string;
  code: string;
  name: string;
  audience: "practitioner" | "brand";
  active: boolean;
  blanks: string[];
  enrolled: number;
  activeEnrolments: number;
  steps: StepFunnel[];
};

export type ListSummary = {
  id: string;
  name: string;
  audience: "practitioner" | "brand";
  source_note: string | null;
  created_at: string;
  total: number;
  valid: number;
  unknown: number;
  replied: number;
  stopped: number;
};

const DAY = 86_400_000;
const pct = (n: number, d: number) => (d ? Math.round((n / d) * 1000) / 10 : 0);
export const rate = pct;

const BLANK_RE = /(\[[^\]\n]{1,120}\])(?!\()/g;
export const blanksIn = (text: string) => [...text.matchAll(BLANK_RE)].map((m) => m[1]);

export async function loadOutreachDashboard() {
  const db = outreachDb();
  const since30 = new Date(Date.now() - 30 * DAY).toISOString();
  const since7 = Date.now() - 7 * DAY;

  const [{ data: settings }, { data: sends }, { data: sequences }, { data: steps }, { data: enrolments }, { data: lists }, { data: contacts }, { data: suppressions }] =
    await Promise.all([
      db.from("outreach_settings").select("*").eq("id", true).single(),
      db.from("outreach_sends").select("id, enrolment_id, contact_id, step_no, sent_at, delivered_at, opened_at, bounced_at, complained_at").gte("sent_at", since30).limit(10_000),
      db.from("outreach_sequences").select("id, code, name, audience, active").order("audience"),
      db.from("outreach_steps").select("sequence_id, step_no, delay_days, subject, body_md").order("step_no"),
      db.from("outreach_enrolments").select("id, sequence_id, status").limit(20_000),
      db.from("outreach_lists").select("id, name, audience, source_note, created_at").order("created_at", { ascending: false }),
      db.from("outreach_contacts").select("id, list_id, status, email_status, replied_at, unsubscribed_at").limit(50_000),
      db.from("outreach_suppressions").select("email, reason, note, created_at").order("created_at", { ascending: false }).limit(20),
    ]);

  const sendRows = (sends ?? []) as SendRow[];
  const contactRows = (contacts ?? []) as { id: string; list_id: string; status: string; email_status: string; replied_at: string | null; unsubscribed_at: string | null }[];
  const contactById = new Map(contactRows.map((c) => [c.id, c]));
  const sentContacts = new Set(sendRows.map((s) => s.contact_id));
  const after = (stamp: string | null) => Boolean(stamp && stamp >= since30);

  const metrics: Metrics = {
    sent7: sendRows.filter((s) => new Date(s.sent_at).getTime() >= since7).length,
    sent30: sendRows.length,
    delivered: sendRows.filter((s) => s.delivered_at).length,
    bounced: sendRows.filter((s) => s.bounced_at).length,
    complained: sendRows.filter((s) => s.complained_at).length,
    opened: sendRows.filter((s) => s.opened_at).length,
    replied: [...sentContacts].filter((id) => after(contactById.get(id)?.replied_at ?? null)).length,
    unsubscribed: [...sentContacts].filter((id) => after(contactById.get(id)?.unsubscribed_at ?? null)).length,
  };

  // A reply or unsubscribe is credited to the last step that contact received before it.
  const { data: allSends } = await db.from("outreach_sends").select("enrolment_id, contact_id, step_no, sent_at, delivered_at, bounced_at").limit(20_000);
  const enrolmentSeq = new Map(((enrolments ?? []) as { id: string; sequence_id: string }[]).map((e) => [e.id, e.sequence_id]));
  const lastStepBefore = (contactId: string, seqId: string, at: string) =>
    ((allSends ?? []) as { enrolment_id: string; contact_id: string; step_no: number; sent_at: string }[])
      .filter((s) => s.contact_id === contactId && enrolmentSeq.get(s.enrolment_id) === seqId && s.sent_at <= at)
      .sort((a, b) => b.sent_at.localeCompare(a.sent_at))[0]?.step_no;

  const seqSummaries: SequenceSummary[] = ((sequences ?? []) as Omit<SequenceSummary, "blanks" | "enrolled" | "activeEnrolments" | "steps">[]).map((q) => {
    const qSteps = ((steps ?? []) as { sequence_id: string; step_no: number; delay_days: number; subject: string; body_md: string }[]).filter((s) => s.sequence_id === q.id);
    const qEnrol = ((enrolments ?? []) as { id: string; sequence_id: string; status: string }[]).filter((e) => e.sequence_id === q.id);
    const qSends = ((allSends ?? []) as { enrolment_id: string; contact_id: string; step_no: number; delivered_at: string | null; bounced_at: string | null }[]).filter(
      (s) => enrolmentSeq.get(s.enrolment_id) === q.id,
    );
    const qContacts = new Set(qSends.map((s) => s.contact_id));
    const credit = (field: "replied_at" | "unsubscribed_at") => {
      const byStep = new Map<number, number>();
      for (const id of qContacts) {
        const at = contactById.get(id)?.[field];
        if (!at) continue;
        const step = lastStepBefore(id, q.id, at);
        if (step) byStep.set(step, (byStep.get(step) ?? 0) + 1);
      }
      return byStep;
    };
    const replies = credit("replied_at");
    const unsubs = credit("unsubscribed_at");
    return {
      ...q,
      blanks: [...new Set(qSteps.flatMap((s) => blanksIn(`${s.subject}\n${s.body_md}`)))],
      enrolled: qEnrol.length,
      activeEnrolments: qEnrol.filter((e) => e.status === "active").length,
      steps: qSteps.map((s) => {
        const x = qSends.filter((y) => y.step_no === s.step_no);
        return {
          step_no: s.step_no,
          delay_days: s.delay_days,
          subject: s.subject,
          sent: x.length,
          delivered: x.filter((y) => y.delivered_at).length,
          bounced: x.filter((y) => y.bounced_at).length,
          replied: replies.get(s.step_no) ?? 0,
          unsubscribed: unsubs.get(s.step_no) ?? 0,
        };
      }),
    };
  });

  const listSummaries: ListSummary[] = ((lists ?? []) as Omit<ListSummary, "total" | "valid" | "unknown" | "replied" | "stopped">[]).map((l) => {
    const c = contactRows.filter((x) => x.list_id === l.id);
    return {
      ...l,
      total: c.length,
      valid: c.filter((x) => x.email_status === "valid").length,
      unknown: c.filter((x) => x.email_status === "unknown").length,
      replied: c.filter((x) => x.status === "replied").length,
      stopped: c.filter((x) => ["bounced", "unsubscribed", "suppressed"].includes(x.status)).length,
    };
  });

  const cfg = outreachConfig();
  return {
    settings: settings as OutreachSettings | null,
    config: cfg.ok ? { ok: true as const, from: cfg.config.fromEmail, replyTo: cfg.config.replyTo, webhook: Boolean(cfg.config.webhookSecret) } : { ok: false as const, reason: cfg.reason },
    metrics,
    sequences: seqSummaries,
    lists: listSummaries,
    recentSuppressions: (suppressions ?? []) as { email: string; reason: string; note: string | null; created_at: string }[],
  };
}

export type ContactRow = {
  id: string;
  email: string;
  first_name: string | null;
  company: string | null;
  role_title: string | null;
  country_code: string | null;
  status: string;
  email_status: string;
  created_at: string;
};

export async function loadOutreachList(listId: string) {
  if (!/^[0-9a-f-]{36}$/.test(listId)) return null;
  const db = outreachDb();
  const { data: list } = await db.from("outreach_lists").select("id, name, audience, source_note, created_at").eq("id", listId).maybeSingle();
  if (!list) return null;
  const [{ data: contacts }, { data: sequences }] = await Promise.all([
    db.from("outreach_contacts").select("id, email, first_name, company, role_title, country_code, status, email_status, created_at").eq("list_id", listId).order("created_at").limit(2_000),
    db.from("outreach_sequences").select("code, name, audience, active").eq("audience", list.audience),
  ]);
  const ids = ((contacts ?? []) as ContactRow[]).map((c) => c.id);
  const { data: enrolments } = ids.length
    ? await db.from("outreach_enrolments").select("contact_id, current_step, status, next_send_at").in("contact_id", ids)
    : { data: [] };
  const enrolmentByContact = new Map(
    ((enrolments ?? []) as { contact_id: string; current_step: number; status: string; next_send_at: string | null }[]).map((e) => [e.contact_id, e]),
  );
  return {
    list: list as { id: string; name: string; audience: "practitioner" | "brand"; source_note: string | null; created_at: string },
    contacts: (contacts ?? []) as ContactRow[],
    enrolmentByContact,
    sequences: (sequences ?? []) as { code: string; name: string; audience: string; active: boolean }[],
  };
}

export async function loadOutreachSequence(code: string) {
  const db = outreachDb();
  const { data: seq } = await db.from("outreach_sequences").select("id, code, name, audience, active").eq("code", code).maybeSingle();
  if (!seq) return null;
  const { data: steps } = await db.from("outreach_steps").select("id, step_no, delay_days, subject, body_md, updated_at").eq("sequence_id", seq.id).order("step_no");
  return {
    sequence: seq as { id: string; code: string; name: string; audience: "practitioner" | "brand"; active: boolean },
    steps: (steps ?? []) as { id: string; step_no: number; delay_days: number; subject: string; body_md: string; updated_at: string }[],
  };
}

export type TimelineItem = { at: string; label: string; detail?: string };

export async function loadOutreachContact(contactId: string) {
  if (!/^[0-9a-f-]{36}$/.test(contactId)) return null;
  const db = outreachDb();
  const { data: contact } = await db.from("outreach_contacts").select("*").eq("id", contactId).maybeSingle();
  if (!contact) return null;
  const [{ data: list }, { data: enrolments }, { data: sends }, { data: suppression }] = await Promise.all([
    db.from("outreach_lists").select("id, name, source_note").eq("id", contact.list_id).maybeSingle(),
    db.from("outreach_enrolments").select("id, sequence_id, status, current_step, next_send_at, exit_reason, created_at").eq("contact_id", contactId),
    db.from("outreach_sends").select("id, step_no, subject, sent_at, provider_id").eq("contact_id", contactId).order("sent_at"),
    db.from("outreach_suppressions").select("reason, note, created_at").eq("email", contact.email).maybeSingle(),
  ]);
  const sendIds = ((sends ?? []) as { id: string }[]).map((s) => s.id);
  const [{ data: events }, { data: seqs }] = await Promise.all([
    sendIds.length ? db.from("outreach_events").select("send_id, type, occurred_at").in("send_id", sendIds) : Promise.resolve({ data: [] }),
    db.from("outreach_sequences").select("id, name, code"),
  ]);
  const seqName = new Map(((seqs ?? []) as { id: string; name: string; code: string }[]).map((s) => [s.id, s]));
  const stepOf = new Map(((sends ?? []) as { id: string; step_no: number }[]).map((s) => [s.id, s.step_no]));

  const timeline: TimelineItem[] = [
    { at: contact.created_at, label: "Imported", detail: list ? `List "${list.name}". Source: ${list.source_note ?? "not recorded"}` : undefined },
    ...((enrolments ?? []) as { sequence_id: string; created_at: string; status: string; exit_reason: string | null }[]).map((e) => ({
      at: e.created_at,
      label: `Enrolled in ${seqName.get(e.sequence_id)?.name ?? "a sequence"}`,
      detail: `Now ${e.status}${e.exit_reason ? ` (${e.exit_reason})` : ""}`,
    })),
    ...((sends ?? []) as { step_no: number; subject: string; sent_at: string }[]).map((s) => ({ at: s.sent_at, label: `Step ${s.step_no} sent`, detail: s.subject })),
    ...((events ?? []) as { send_id: string; type: string; occurred_at: string }[])
      .filter((e) => e.type !== "sent")
      .map((e) => ({ at: e.occurred_at, label: `${e.type[0].toUpperCase()}${e.type.slice(1).replace("_", " ")}`, detail: `Step ${stepOf.get(e.send_id) ?? "?"}` })),
    ...(suppression ? [{ at: suppression.created_at, label: `Suppressed: ${suppression.reason}`, detail: suppression.note ?? undefined }] : []),
  ].sort((a, b) => a.at.localeCompare(b.at));

  return {
    contact: contact as ContactRow & { list_id: string; replied_at: string | null; unsubscribed_at: string | null; bounced_at: string | null },
    list: list as { id: string; name: string } | null,
    suppressed: Boolean(suppression),
    timeline,
  };
}
