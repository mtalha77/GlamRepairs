import "server-only";

import { outreachDb } from "@/lib/outreach/config";

/**
 * One way to stop writing to someone (Handover 68 §5): unsubscribe, hard
 * bounce, complaint, reply or a manual block. The address goes on the
 * global suppression list, so it is excluded from every sequence, and every
 * enrolment it has stops at once. Safe to call twice.
 */

export type SuppressReason = "unsubscribed" | "bounced" | "complained" | "replied" | "manual";

const CONTACT_STATUS: Record<SuppressReason, string> = {
  unsubscribed: "unsubscribed",
  bounced: "bounced",
  complained: "suppressed",
  replied: "replied",
  manual: "suppressed",
};

const STAMP: Partial<Record<SuppressReason, string>> = {
  unsubscribed: "unsubscribed_at",
  bounced: "bounced_at",
  replied: "replied_at",
};

export async function suppressAddress(input: { email: string; reason: SuppressReason; note?: string | null; by?: string | null }): Promise<void> {
  const db = outreachDb();
  const email = input.email.trim().toLowerCase();
  const now = new Date().toISOString();

  // The first reason recorded stands; a later one does not overwrite it.
  await db
    .from("outreach_suppressions")
    .upsert({ email, reason: input.reason, note: input.note ?? null, created_by: input.by ?? null }, { onConflict: "email", ignoreDuplicates: true });

  const { data: contact } = await db.from("outreach_contacts").select("id").eq("email", email).maybeSingle();
  if (!contact) return;

  const stamp = STAMP[input.reason];
  await db
    .from("outreach_contacts")
    .update({ status: CONTACT_STATUS[input.reason], ...(stamp ? { [stamp]: now } : {}) })
    .eq("id", contact.id);

  await db
    .from("outreach_enrolments")
    .update({ status: "exited", exit_reason: input.reason, next_send_at: null })
    .eq("contact_id", contact.id)
    .in("status", ["active", "paused"]);
}
