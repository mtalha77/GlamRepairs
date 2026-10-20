import "server-only";

import { leadDisplayRef } from "@/lib/leads/displayRef";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

/**
 * Studio → Follow-ups (20 October 2026): the 15 and 30 day check-ins after a
 * report. The email goes automatically; the WhatsApp is sent from here by a
 * person, from the business phone, because sending WhatsApp automatically
 * needs the paid Business API (Talha chose the queue).
 */

export type FollowupRow = {
  id: string;
  leadId: string;
  ref: string;
  name: string;
  sequence: number;
  dueAt: string;
  status: "pending" | "done" | "skipped";
  emailSentAt: string | null;
  whatsappSentAt: string | null;
  whatsappHref: string | null;
  phone: string | null;
};

function whatsappHref(phoneE164: string | null, name: string, sequence: number): string | null {
  const digits = (phoneE164 ?? "").replace(/\D/g, "");
  if (digits.length < 8) return null;
  const first = name.trim().split(/\s+/)[0] || "there";
  const text =
    sequence === 1
      ? `Hi ${first}, this is Glam Repairs. It has been about two weeks since your skin assessment. How is your skin getting on with the routine? If anything stings, feels heavy, or you are unsure about a step, reply here and we will help.`
      : `Hi ${first}, this is Glam Repairs. It has been a month since your skin assessment. Are you seeing progress? If not, or the weather has changed your skin, reply here and we will help you adjust.`;
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}

export async function listFollowups(): Promise<{ due: FollowupRow[]; upcoming: FollowupRow[]; closed: FollowupRow[] }> {
  const admin = createAdminSupabaseClient();
  const soon = new Date(Date.now() + 3 * 86_400_000).toISOString();
  const { data: rows } = await admin
    .from("client_followups")
    .select("id, lead_id, sequence, due_at, status, email_sent_at, whatsapp_sent_at, completed_at")
    .order("due_at")
    .limit(300);
  const leadIds = [...new Set((rows ?? []).map((r) => r.lead_id))];
  const { data: leads } = leadIds.length
    ? await admin.from("leads").select("id, session_id, full_name, phone, phone_e164, is_test, deleted_at").in("id", leadIds)
    : { data: [] };
  const byId = new Map((leads ?? []).map((l) => [l.id, l]));

  const mapped: (FollowupRow & { completedAt: string | null })[] = [];
  for (const r of rows ?? []) {
    const lead = byId.get(r.lead_id);
    if (!lead || lead.is_test || lead.deleted_at) continue;
    const name = lead.full_name?.trim() || "Client";
    mapped.push({
      id: r.id,
      leadId: r.lead_id,
      ref: leadDisplayRef(lead.session_id) ?? "",
      name,
      sequence: r.sequence,
      dueAt: r.due_at,
      status: r.status,
      emailSentAt: r.email_sent_at,
      whatsappSentAt: r.whatsapp_sent_at,
      whatsappHref: whatsappHref(lead.phone_e164, name, r.sequence),
      phone: lead.phone,
      completedAt: r.completed_at,
    });
  }
  const twoWeeksAgo = Date.now() - 14 * 86_400_000;
  return {
    due: mapped.filter((r) => r.status === "pending" && r.dueAt <= soon && r.dueAt <= new Date().toISOString()),
    upcoming: mapped.filter((r) => r.status === "pending" && r.dueAt > new Date().toISOString()).slice(0, 30),
    closed: mapped
      .filter((r) => r.status !== "pending" && r.completedAt && new Date(r.completedAt).getTime() > twoWeeksAgo)
      .reverse(),
  };
}
