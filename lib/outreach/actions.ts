"use server";

import { revalidatePath } from "next/cache";

import { outreachDb } from "@/lib/outreach/config";
import { checkCsvBytes, mapRows, parseCsv, type ParsedContact } from "@/lib/outreach/csv";
import { suppressAddress } from "@/lib/outreach/suppress";
import { requireStudioMember } from "@/lib/studio/member";

/**
 * Outreach, studio side (Handovers 68 §4, 69 §2). Super admin only, checked
 * here on every action: the service role skips RLS, so this is the control,
 * not the button (CLAUDE.md 3.1).
 */

export type OutreachResult<T = undefined> = { ok: true; message: string; data?: T } | { ok: false; error: string };

async function superAdmin() {
  const { user, member } = await requireStudioMember();
  if (!user || !member) return { error: "Not signed in." } as const;
  if (!member.isSuperAdmin) return { error: "Only a super admin can do this." } as const;
  return { userId: user.id } as const;
}

const PATH = "/studio/outreach";
const revalidate = () => revalidatePath(PATH, "layout");

// ── Lists ───────────────────────────────────────────────────────────────

export type CsvPreview = {
  total: number;
  importable: number;
  invalid: number;
  alreadyContacts: number;
  blocked: { email: string; reason: string }[];
  noCountry: number;
  sample: ParsedContact[];
};

async function readCsv(formData: FormData): Promise<{ contacts: ParsedContact[]; invalid: number } | { error: string }> {
  const file = formData.get("file");
  if (!(file instanceof File)) return { error: "Choose a CSV file." };
  const bytes = new Uint8Array(await file.arrayBuffer());
  const bad = checkCsvBytes(bytes);
  if (bad) return { error: bad };
  const country = String(formData.get("defaultCountry") ?? "").trim().toUpperCase() || null;
  const mapped = mapRows(parseCsv(new TextDecoder().decode(bytes)), country);
  if (mapped.error) return { error: mapped.error };
  return { contacts: mapped.contacts, invalid: mapped.invalid };
}

/** Handover 68 §4.1: what the file holds and what would happen, before anything is stored. */
export async function previewOutreachCsv(formData: FormData): Promise<OutreachResult<CsvPreview>> {
  const g = await superAdmin();
  if ("error" in g) return { ok: false, error: g.error as string };
  const parsed = await readCsv(formData);
  if ("error" in parsed) return { ok: false, error: parsed.error };
  const db = outreachDb();
  const emails = parsed.contacts.map((c) => c.email);
  const { data: existing } = emails.length ? await db.from("outreach_contacts").select("email").in("email", emails) : { data: [] };
  const existingSet = new Set((existing ?? []).map((e: { email: string }) => e.email));
  const blocked: { email: string; reason: string }[] = [];
  for (const c of parsed.contacts) {
    const { data: reason } = await db.rpc("outreach_block_reason", { p_email: c.email, p_new_enrolment: true });
    if (reason) blocked.push({ email: c.email, reason: String(reason) });
  }
  const fresh = parsed.contacts.filter((c) => !existingSet.has(c.email));
  return {
    ok: true,
    message: "Preview ready.",
    data: {
      total: parsed.contacts.length + parsed.invalid,
      importable: fresh.length,
      invalid: parsed.invalid,
      alreadyContacts: existingSet.size,
      blocked,
      noCountry: fresh.filter((c) => !c.country_code).length,
      sample: fresh.slice(0, 8),
    },
  };
}

export async function importOutreachCsv(formData: FormData): Promise<OutreachResult<{ listId: string }>> {
  const g = await superAdmin();
  if ("error" in g) return { ok: false, error: g.error as string };
  const name = String(formData.get("name") ?? "").trim().slice(0, 120);
  const audience = String(formData.get("audience") ?? "");
  const sourceNote = String(formData.get("sourceNote") ?? "").trim().slice(0, 500) || null;
  const checked = formData.get("addressesChecked") === "on";
  if (name.length < 3) return { ok: false, error: "Name the list." };
  if (audience !== "practitioner" && audience !== "brand") return { ok: false, error: "Choose who the list is for." };
  if (!sourceNote) return { ok: false, error: "Say where these addresses came from. Every address needs a defensible source." };
  const parsed = await readCsv(formData);
  if ("error" in parsed) return { ok: false, error: parsed.error };

  const db = outreachDb();
  const { data: list, error: listError } = await db
    .from("outreach_lists")
    .insert({ name, audience, source_note: sourceNote, uploaded_by: g.userId })
    .select("id")
    .single();
  if (listError || !list) return { ok: false, error: listError?.message ?? "Could not create the list." };

  const now = new Date().toISOString();
  const rows = parsed.contacts.map((c) => ({
    ...c,
    list_id: list.id,
    // Handover 69 §2.4: only addresses someone has checked are ever sent to.
    email_status: checked ? "valid" : "unknown",
    email_status_set_by: checked ? g.userId : null,
    email_status_set_at: checked ? now : null,
  }));
  const { data: inserted, error } = rows.length
    ? await db.from("outreach_contacts").upsert(rows, { onConflict: "email", ignoreDuplicates: true }).select("id")
    : { data: [], error: null };
  if (error) return { ok: false, error: error.message };
  revalidate();
  return {
    ok: true,
    message: `Imported ${inserted?.length ?? 0} contacts into "${name}". ${rows.length - (inserted?.length ?? 0)} were already on another list. Nobody has been emailed.`,
    data: { listId: list.id },
  };
}

export async function setContactsEmailStatus(input: { contactIds: string[]; status: "valid" | "risky" | "invalid" | "unknown" }): Promise<OutreachResult> {
  const g = await superAdmin();
  if ("error" in g) return { ok: false, error: g.error as string };
  if (!input.contactIds.length) return { ok: false, error: "Select contacts first." };
  const { error } = await outreachDb()
    .from("outreach_contacts")
    .update({ email_status: input.status, email_status_set_by: g.userId, email_status_set_at: new Date().toISOString() })
    .in("id", input.contactIds.slice(0, 2000));
  if (error) return { ok: false, error: error.message };
  revalidate();
  return { ok: true, message: `Marked ${input.contactIds.length} as ${input.status}.` };
}

// ── Enrolment (the irreversible step) ─────────────────────────────────────

export type EnrolPreview = { sequenceName: string; eligible: number; excluded: Record<string, number> };

async function eligibleFor(listId: string, sequenceId: string) {
  const db = outreachDb();
  const { data: contacts } = await db.from("outreach_contacts").select("id, email, email_status, status").eq("list_id", listId);
  const { data: enrolled } = await db.from("outreach_enrolments").select("contact_id").eq("sequence_id", sequenceId);
  const already = new Set((enrolled ?? []).map((e: { contact_id: string }) => e.contact_id));
  const eligible: string[] = [];
  const excluded: Record<string, number> = {};
  const bump = (k: string) => (excluded[k] = (excluded[k] ?? 0) + 1);
  for (const c of (contacts ?? []) as { id: string; email: string; email_status: string; status: string }[]) {
    if (already.has(c.id)) bump("already in this sequence");
    else if (c.email_status === "invalid") bump("invalid address");
    else if (!["new", "complete"].includes(c.status)) bump(`status: ${c.status}`);
    else {
      const { data: reason } = await db.rpc("outreach_block_reason", { p_email: c.email, p_new_enrolment: true });
      if (reason) bump(String(reason));
      else eligible.push(c.id);
    }
  }
  return { eligible, excluded };
}

export async function previewEnrolment(input: { listId: string; sequenceCode: string }): Promise<OutreachResult<EnrolPreview>> {
  const g = await superAdmin();
  if ("error" in g) return { ok: false, error: g.error as string };
  const db = outreachDb();
  const [{ data: seq }, { data: list }] = await Promise.all([
    db.from("outreach_sequences").select("id, name, audience").eq("code", input.sequenceCode).maybeSingle(),
    db.from("outreach_lists").select("audience").eq("id", input.listId).maybeSingle(),
  ]);
  if (!seq || !list) return { ok: false, error: "No such list or sequence." };
  if (seq.audience !== list.audience) return { ok: false, error: `This is a ${list.audience} list; that sequence is for ${seq.audience}s.` };
  const { eligible, excluded } = await eligibleFor(input.listId, seq.id);
  return { ok: true, message: "", data: { sequenceName: seq.name, eligible: eligible.length, excluded } };
}

/**
 * Handover 68 §4.2 / 69 §2.2: the confirmation names the count and the
 * sequence, and the server recomputes both; if the list changed since the
 * preview, nothing is enrolled. Enrolment schedules step 1; it sends nothing.
 */
export async function enrolList(input: { listId: string; sequenceCode: string; confirmCount: number }): Promise<OutreachResult> {
  const g = await superAdmin();
  if ("error" in g) return { ok: false, error: g.error as string };
  const db = outreachDb();
  const { data: seq } = await db.from("outreach_sequences").select("id, name, audience").eq("code", input.sequenceCode).maybeSingle();
  const { data: list } = await db.from("outreach_lists").select("audience").eq("id", input.listId).maybeSingle();
  if (!seq || !list || seq.audience !== list.audience) return { ok: false, error: "List and sequence do not match." };
  const { eligible } = await eligibleFor(input.listId, seq.id);
  if (eligible.length !== input.confirmCount) {
    return { ok: false, error: `The list changed: ${eligible.length} are eligible now, not ${input.confirmCount}. Preview again.` };
  }
  if (!eligible.length) return { ok: false, error: "Nobody on this list is eligible." };
  const now = new Date().toISOString();
  const { error } = await db
    .from("outreach_enrolments")
    .upsert(eligible.map((id) => ({ contact_id: id, sequence_id: seq.id, enrolled_by: g.userId, next_send_at: now })), {
      onConflict: "contact_id,sequence_id",
      ignoreDuplicates: true,
    });
  if (error) return { ok: false, error: error.message };
  await db.from("outreach_contacts").update({ status: "queued" }).in("id", eligible).eq("status", "new");
  revalidate();
  return {
    ok: true,
    message: `Enrolled ${eligible.length} in "${seq.name}". Step 1 goes out from the next hourly run, within the daily cap, in business hours, and only to validated addresses with the sequence switched on.`,
  };
}

// ── Replies and suppression ───────────────────────────────────────────────

/** Handover 68 §5.1: the day-one way to stop a sequence for someone who answered. */
export async function markContactReplied(contactId: string): Promise<OutreachResult> {
  const g = await superAdmin();
  if ("error" in g) return { ok: false, error: g.error as string };
  const db = outreachDb();
  const { data: c } = await db.from("outreach_contacts").select("email").eq("id", contactId).maybeSingle();
  if (!c) return { ok: false, error: "No such contact." };
  await suppressAddress({ email: c.email, reason: "replied", note: "Marked replied in the studio", by: g.userId });
  const { data: lastSend } = await db.from("outreach_sends").select("id, provider_id").eq("contact_id", contactId).order("sent_at", { ascending: false }).limit(1).maybeSingle();
  if (lastSend) {
    await db.from("outreach_events").insert({ send_id: lastSend.id, provider_id: lastSend.provider_id, type: "replied", occurred_at: new Date().toISOString(), payload: { by: g.userId } });
  }
  revalidate();
  return { ok: true, message: "Marked replied. No further emails will go to this address from any sequence." };
}

export async function suppressManually(input: { email: string; note: string }): Promise<OutreachResult> {
  const g = await superAdmin();
  if ("error" in g) return { ok: false, error: g.error as string };
  const email = input.email.trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(email)) return { ok: false, error: "Enter an email address." };
  await suppressAddress({ email, reason: "manual", note: input.note.trim().slice(0, 300) || null, by: g.userId });
  revalidate();
  return { ok: true, message: `${email} will never be emailed by any sequence.` };
}

// ── Sequences ─────────────────────────────────────────────────────────────

export async function saveOutreachStep(input: { stepId: string; subject: string; body: string; delayDays: number }): Promise<OutreachResult> {
  const g = await superAdmin();
  if ("error" in g) return { ok: false, error: g.error as string };
  if (!Number.isInteger(input.delayDays) || input.delayDays < 0 || input.delayDays > 120) return { ok: false, error: "Day must be a whole number from 0." };
  const { error } = await outreachDb()
    .from("outreach_steps")
    .update({ subject: input.subject.trim(), body_md: input.body.replace(/\r\n/g, "\n").trim(), delay_days: input.delayDays, updated_at: new Date().toISOString() })
    .eq("id", input.stepId);
  if (error) {
    if (error.message.includes("no_em_dash")) return { ok: false, error: "Em dashes are not allowed. Use a comma or a full stop." };
    if (error.message.includes("no_banned_words")) return { ok: false, error: "That uses a banned word (licensed, dermatologist, diagnose, prescribe or BSc)." };
    return { ok: false, error: error.message };
  }
  revalidate();
  return { ok: true, message: "Saved." };
}

export async function setSequenceActive(input: { code: string; active: boolean }): Promise<OutreachResult> {
  const g = await superAdmin();
  if ("error" in g) return { ok: false, error: g.error as string };
  const { error } = await outreachDb().from("outreach_sequences").update({ active: input.active }).eq("code", input.code);
  if (error) {
    const blanks = error.message.match(/still has (.+) to fill in/)?.[1];
    if (blanks) return { ok: false, error: `Fill these in first: ${blanks}.` };
    return { ok: false, error: error.message };
  }
  revalidate();
  return { ok: true, message: input.active ? "Switched on. Enrolled contacts start receiving it from the next hourly run." : "Switched off. Nothing more sends from it." };
}

// ── Settings and the pause ────────────────────────────────────────────────

export async function saveOutreachSettings(input: { dailyCap: number; hourlyCap: number; businessAddress: string }): Promise<OutreachResult> {
  const g = await superAdmin();
  if ("error" in g) return { ok: false, error: g.error as string };
  if (!Number.isInteger(input.dailyCap) || input.dailyCap < 0 || input.dailyCap > 500) return { ok: false, error: "Daily cap: a whole number up to 500." };
  if (!Number.isInteger(input.hourlyCap) || input.hourlyCap < 0 || input.hourlyCap > input.dailyCap) return { ok: false, error: "Hourly cap: up to the daily cap." };
  const address = input.businessAddress.trim().slice(0, 300);
  if (address && address.length < 10) return { ok: false, error: "Give the full business address." };
  const { error } = await outreachDb()
    .from("outreach_settings")
    .update({ daily_cap: input.dailyCap, hourly_cap: input.hourlyCap, business_address: address || null, updated_at: new Date().toISOString(), updated_by: g.userId })
    .eq("id", true);
  if (error) return { ok: false, error: error.message };
  revalidate();
  return { ok: true, message: "Saved." };
}

/** Handover 69 §3.4: clearing a pause is a deliberate act with a reason, never automatic. */
export async function resumeOutreach(input: { note: string }): Promise<OutreachResult> {
  const g = await superAdmin();
  if ("error" in g) return { ok: false, error: g.error as string };
  if (input.note.trim().length < 10) return { ok: false, error: "Say what you checked before resuming." };
  const db = outreachDb();
  const { data: s } = await db.from("outreach_settings").select("paused_reason").eq("id", true).single();
  const { error } = await db
    .from("outreach_settings")
    .update({ paused: false, paused_reason: `Resumed: ${input.note.trim().slice(0, 300)} (was: ${s?.paused_reason ?? "paused"})`, paused_at: null, updated_at: new Date().toISOString(), updated_by: g.userId })
    .eq("id", true);
  if (error) return { ok: false, error: error.message };
  revalidate();
  return { ok: true, message: "Resumed. Note that the bounce and complaint check still counts the last 100 sends, so it may pause again until healthy sends dilute them." };
}

export async function pauseOutreach(input: { reason: string }): Promise<OutreachResult> {
  const g = await superAdmin();
  if ("error" in g) return { ok: false, error: g.error as string };
  const { error } = await outreachDb()
    .from("outreach_settings")
    .update({ paused: true, paused_reason: `Paused by hand: ${input.reason.trim().slice(0, 300) || "no reason given"}`, paused_at: new Date().toISOString(), updated_by: g.userId })
    .eq("id", true);
  if (error) return { ok: false, error: error.message };
  revalidate();
  return { ok: true, message: "Paused. Nothing sends until resumed." };
}
