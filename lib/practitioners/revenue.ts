import "server-only";

import { CONSULTATION_TZ } from "@/lib/consultation/format";
import { formatMoney } from "@/lib/pricing/money";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

/**
 * Monthly revenue. Talha, 29 October 2026: the cycle is the calendar month,
 * 1st to the 30th or 31st, Pakistan time, and payouts follow it. Months
 * here are the same months the payout runs use (lib/practitioners/payouts).
 *
 * Every figure is a sum of recorded rows. Nothing is converted between
 * currencies: a month with two currencies shows two amounts.
 */

const monthOf = (iso: string) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: CONSULTATION_TZ, year: "numeric", month: "2-digit" }).format(new Date(iso));

export const monthLabel = (month: string) => {
  const [y, m] = month.split("-").map(Number);
  return new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(Date.UTC(y, m - 1, 1)));
};

/** Sums per currency, shown as "Rs 4,500" or "Rs 4,500 · £20". */
type Money = Map<string, number>;
const add = (m: Money, currency: string, minor: number) => m.set(currency, (m.get(currency) ?? 0) + minor);
export const showMoney = (m: Money) =>
  m.size ? [...m.entries()].map(([c, v]) => formatMoney(v, c, 2)).join(" · ") : "Nil";

export type PractitionerMonth = {
  month: string;
  consultations: number;
  earned: Money;
  released: Money;
  awaiting: Money;
};

/** One practitioner's months, newest first: what they earned and what has been paid out. */
export async function practitionerMonths(practitionerId: string): Promise<PractitionerMonth[]> {
  const { data } = await createAdminSupabaseClient()
    .from("practitioner_earnings")
    .select("earned_at, currency, practitioner_minor, status, reason")
    .eq("practitioner_id", practitionerId)
    .neq("status", "void");
  const byMonth = new Map<string, PractitionerMonth>();
  for (const e of data ?? []) {
    const month = monthOf(e.earned_at);
    const row = byMonth.get(month) ?? { month, consultations: 0, earned: new Map(), released: new Map(), awaiting: new Map() };
    if (e.reason !== "adjustment" && e.reason !== "reversal") row.consultations += 1;
    add(row.earned, e.currency, e.practitioner_minor);
    add(e.status === "paid" ? row.released : row.awaiting, e.currency, e.practitioner_minor);
    byMonth.set(month, row);
  }
  return [...byMonth.values()].sort((a, b) => b.month.localeCompare(a.month));
}

export type PlatformMonth = {
  month: string;
  paidClients: number;
  clientPayments: Money;
  practitionerShare: Money;
  platformShare: Money;
  paidOut: Money;
  stillOwed: Money;
};

/**
 * The business by month: client payments verified that month, the
 * practitioner and platform shares of the work done that month, and what
 * was actually paid out to practitioners in it. Test clients excluded.
 */
export async function platformMonths(): Promise<PlatformMonth[]> {
  const admin = createAdminSupabaseClient();
  const [{ data: leads }, { data: earnings }, { data: payouts }] = await Promise.all([
    admin
      .from("leads")
      .select("payment_verified_at, updated_at, final_price, currency")
      .eq("payment_status", "verified")
      .eq("is_test", false)
      .is("deleted_at", null),
    admin.from("practitioner_earnings").select("earned_at, currency, practitioner_minor, platform_minor, status").neq("status", "void"),
    admin.from("practitioner_payouts").select("paid_at, currency, total_minor, status").eq("status", "paid"),
  ]);

  const byMonth = new Map<string, PlatformMonth>();
  const get = (month: string) => {
    const row = byMonth.get(month) ?? {
      month,
      paidClients: 0,
      clientPayments: new Map(),
      practitionerShare: new Map(),
      platformShare: new Map(),
      paidOut: new Map(),
      stillOwed: new Map(),
    };
    byMonth.set(month, row);
    return row;
  };

  for (const l of leads ?? []) {
    const at = l.payment_verified_at ?? l.updated_at;
    if (!at) continue;
    const row = get(monthOf(at));
    row.paidClients += 1;
    const price = Number(l.final_price ?? 0);
    if (price > 0) add(row.clientPayments, l.currency ?? "PKR", Math.round(price * 100));
  }
  for (const e of earnings ?? []) {
    const row = get(monthOf(e.earned_at));
    add(row.practitionerShare, e.currency, e.practitioner_minor);
    add(row.platformShare, e.currency, e.platform_minor);
    if (e.status !== "paid") add(row.stillOwed, e.currency, e.practitioner_minor);
  }
  for (const p of payouts ?? []) {
    if (!p.paid_at) continue;
    add(get(monthOf(p.paid_at)).paidOut, p.currency ?? "PKR", p.total_minor);
  }
  return [...byMonth.values()].sort((a, b) => b.month.localeCompare(a.month));
}
