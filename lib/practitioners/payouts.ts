import "server-only";

import { CONSULTATION_TZ } from "@/lib/consultation/format";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

/**
 * Payouts, the read side — HANDOVER-52 §2.7, §4.6.
 *
 * A period is a Pakistan calendar month. "To approve" is every payable
 * earning (note written) not yet in a payout, up to the period's end, so
 * an earning whose note came late is paid in the next run rather than
 * lost. "Held" is what is still waiting on a note, shown as held, never
 * hidden: a practitioner should not have to ask why her total looks short.
 */

export type Period = { month: string; start: string; end: string; label: string; prev: string; next: string };

function shift(month: string, by: number): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + by, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

/** Defaults to last month, in Pakistan time. */
export function periodFor(month?: string | null): Period {
  const valid = month && /^\d{4}-(0[1-9]|1[0-2])$/.test(month) ? month : null;
  const thisMonth = new Intl.DateTimeFormat("en-CA", { timeZone: CONSULTATION_TZ, year: "numeric", month: "2-digit" })
    .format(new Date())
    .slice(0, 7);
  const m = valid ?? shift(thisMonth, -1);
  const [y, mm] = m.split("-").map(Number);
  const last = new Date(Date.UTC(y, mm, 0)).getUTCDate();
  const label = new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(Date.UTC(y, mm - 1, 1)));
  return { month: m, start: `${m}-01`, end: `${m}-${String(last).padStart(2, "0")}`, label, prev: shift(m, -1), next: shift(m, 1) };
}

/** The first instant after the period, as the database counts it. */
function untilIso(end: string): string {
  // Pakistan has no daylight saving: midnight PKT is 19:00 UTC the day before.
  const d = new Date(`${end}T00:00:00+05:00`);
  return new Date(d.getTime() + 86_400_000).toISOString();
}

export type PayoutRow = {
  practitionerId: string;
  name: string;
  toApproveMinor: number;
  toApproveCount: number;
  heldMinor: number;
  heldCount: number;
  platformMinor: number;
  payouts: { id: string; status: string; totalMinor: number; reference: string | null; paidAt: string | null }[];
};

export async function loadPayoutPeriod(period: Period): Promise<PayoutRow[]> {
  const supabase = createAdminSupabaseClient();
  const until = untilIso(period.end);
  const [{ data: open }, { data: payouts }, { data: profiles }] = await Promise.all([
    supabase
      .from("practitioner_earnings")
      .select("practitioner_id, status, practitioner_minor, platform_minor, payout_id")
      .in("status", ["pending", "payable"])
      .is("payout_id", null)
      .lt("earned_at", until),
    supabase
      .from("practitioner_payouts")
      .select("id, practitioner_id, status, total_minor, reference, paid_at")
      .eq("period_start", period.start)
      .eq("period_end", period.end)
      .neq("status", "cancelled"),
    supabase.from("practitioner_profiles").select("id, full_name"),
  ]);
  const names = new Map((profiles ?? []).map((p) => [p.id, p.full_name]));
  const rows = new Map<string, PayoutRow>();
  const row = (id: string) => {
    let r = rows.get(id);
    if (!r) {
      r = { practitionerId: id, name: names.get(id) ?? "Practitioner", toApproveMinor: 0, toApproveCount: 0, heldMinor: 0, heldCount: 0, platformMinor: 0, payouts: [] };
      rows.set(id, r);
    }
    return r;
  };
  for (const e of open ?? []) {
    const r = row(e.practitioner_id);
    if (e.status === "payable") {
      r.toApproveMinor += e.practitioner_minor;
      r.toApproveCount += 1;
      r.platformMinor += e.platform_minor;
    } else {
      r.heldMinor += e.practitioner_minor;
      r.heldCount += 1;
    }
  }
  for (const p of payouts ?? []) {
    row(p.practitioner_id).payouts.push({ id: p.id, status: p.status, totalMinor: p.total_minor, reference: p.reference, paidAt: p.paid_at });
  }
  return [...rows.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export type StatementLine = { id: string; startsAt: string | null; reason: string; practitionerMinor: number; platformMinor: number; status: string };

export async function loadPayout(id: string) {
  const supabase = createAdminSupabaseClient();
  const { data: payout } = await supabase.from("practitioner_payouts").select("*").eq("id", id).maybeSingle();
  if (!payout) return null;
  const [{ data: profile }, { data: lines }] = await Promise.all([
    supabase.from("practitioner_profiles").select("id, full_name, payout_method, payout_detail_ref").eq("id", payout.practitioner_id).maybeSingle(),
    supabase
      .from("practitioner_earnings")
      .select("id, appointment_id, reason, practitioner_minor, platform_minor, status, earned_at")
      .eq("payout_id", id)
      .order("earned_at"),
  ]);
  const apptIds = (lines ?? []).map((l) => l.appointment_id);
  const { data: appts } = apptIds.length ? await supabase.from("appointments").select("id, starts_at").in("id", apptIds) : { data: [] };
  const startOf = new Map((appts ?? []).map((a) => [a.id, a.starts_at]));
  return {
    payout,
    profile,
    lines: (lines ?? []).map<StatementLine>((l) => ({
      id: l.id,
      startsAt: startOf.get(l.appointment_id) ?? l.earned_at,
      reason: l.reason,
      practitionerMinor: l.practitioner_minor,
      platformMinor: l.platform_minor,
      status: l.status,
    })),
  };
}

export async function listOwnPayouts(practitionerId: string) {
  const { data } = await createAdminSupabaseClient()
    .from("practitioner_payouts")
    .select("id, period_start, period_end, status, total_minor, reference, paid_at")
    .eq("practitioner_id", practitionerId)
    .neq("status", "cancelled")
    .order("period_start", { ascending: false })
    .limit(12);
  return data ?? [];
}

export const REASON_LABEL: Record<string, string> = {
  attended: "Consultation",
  client_no_show: "Client did not attend (paid in full)",
  cancelled_late: "Late cancellation",
  adjustment: "Adjustment",
  reversal: "Reversal",
};
