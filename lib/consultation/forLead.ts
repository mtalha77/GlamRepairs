import "server-only";

import { leadFactsById, slotForLead } from "@/lib/consultation/slots";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

/**
 * One client's consultation, as the customer page shows it at the top.
 *
 * In order of what matters: a booked appointment, then a held time waiting
 * on payment, then "plan includes a call but no time chosen". The most
 * recent closed appointment is the fallback, so a finished call still
 * shows when it happened. Null when the plan has no video call.
 */

export type LeadConsultation =
  | {
      kind: "appointment";
      startsAt: string;
      status: "scheduled" | "completed" | "cancelled" | "no_show";
      joinUrl: string | null;
      /** "in 2 days", "in 3 hours", "ended": worked out on the server. */
      relative: string;
    }
  | { kind: "held"; startsAt: string; heldUntil: string | null; relative: string }
  | { kind: "booked_pending"; startsAt: string; relative: string }
  | { kind: "none" };

function relativeTo(iso: string, now: number): string {
  const ms = new Date(iso).getTime() - now;
  if (ms <= 0) return "started";
  const hours = Math.round(ms / 3_600_000);
  if (hours < 1) return `in ${Math.max(1, Math.round(ms / 60_000))} minutes`;
  if (hours < 48) return `in ${hours} ${hours === 1 ? "hour" : "hours"}`;
  const days = Math.round(hours / 24);
  return `in ${days} days`;
}

export async function getLeadConsultation(leadId: string): Promise<LeadConsultation | null> {
  const facts = await leadFactsById(leadId);
  if (!facts?.includesVideoCall) return null;
  const now = Date.now();

  const { data: appts } = await createAdminSupabaseClient()
    .from("appointments")
    .select("starts_at, status, join_url")
    .eq("lead_id", leadId)
    .order("starts_at", { ascending: false })
    .limit(5);
  const scheduled = (appts ?? []).find((a) => a.status === "scheduled");
  if (scheduled) {
    return {
      kind: "appointment",
      startsAt: scheduled.starts_at,
      status: "scheduled",
      joinUrl: scheduled.join_url,
      relative: relativeTo(scheduled.starts_at, now),
    };
  }

  const slot = await slotForLead(leadId);
  if (slot?.status === "held") {
    return { kind: "held", startsAt: slot.startsAt, heldUntil: slot.heldUntil, relative: relativeTo(slot.startsAt, now) };
  }
  if (slot?.status === "booked") {
    return { kind: "booked_pending", startsAt: slot.startsAt, relative: relativeTo(slot.startsAt, now) };
  }

  const last = (appts ?? [])[0];
  if (last) {
    return { kind: "appointment", startsAt: last.starts_at, status: last.status, joinUrl: null, relative: "" };
  }
  return { kind: "none" };
}
