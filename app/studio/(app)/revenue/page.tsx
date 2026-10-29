import { notFound } from "next/navigation";

import FinanceTabs from "@/components/studio/FinanceTabs";
import { monthLabel, platformMonths, showMoney } from "@/lib/practitioners/revenue";
import { requireStudioMember } from "@/lib/studio/member";

/**
 * Studio → Finance → Revenue. Talha, 29 October 2026: one table, by
 * calendar month, of what clients paid, how it split between practitioners
 * and the platform (50/50 by default), and what has been paid out.
 * Super admins only.
 */

export const dynamic = "force-dynamic";

const card = "rounded-2xl border border-brand-lavender/70 bg-white p-5";

export default async function RevenuePage() {
  const { member } = await requireStudioMember();
  if (!member?.isSuperAdmin) notFound();
  const months = await platformMonths();

  return (
    <div className="space-y-5">
      <FinanceTabs active="revenue" />
      <div>
        <h1 className="font-serif text-2xl text-brand-primary">Revenue by month</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-brand-gray">
          Each month runs from the 1st to its last day, Pakistan time. Client payments are counted in the month the payment was
          verified; practitioner and platform shares in the month the consultation was settled; payouts in the month they were
          marked paid. Test clients are left out.
        </p>
      </div>
      <section className={card}>
        {months.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[46rem] text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-brand-gray">
                <tr>
                  <th className="py-2 pr-3 font-medium">Month</th>
                  <th className="py-2 pr-3 font-medium">Paid clients</th>
                  <th className="py-2 pr-3 font-medium">Client payments</th>
                  <th className="py-2 pr-3 font-medium">Practitioner share</th>
                  <th className="py-2 pr-3 font-medium">Platform share</th>
                  <th className="py-2 pr-3 font-medium">Paid out</th>
                  <th className="py-2 font-medium">Still owed</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-lavender/60 border-t border-brand-lavender/60">
                {months.map((m) => (
                  <tr key={m.month}>
                    <td className="py-2 pr-3 text-brand-ink">{monthLabel(m.month)}</td>
                    <td className="py-2 pr-3 tabular-nums">{m.paidClients}</td>
                    <td className="py-2 pr-3 tabular-nums">{showMoney(m.clientPayments)}</td>
                    <td className="py-2 pr-3 tabular-nums">{showMoney(m.practitionerShare)}</td>
                    <td className="py-2 pr-3 tabular-nums">{showMoney(m.platformShare)}</td>
                    <td className="py-2 pr-3 tabular-nums text-brand-success-strong">{showMoney(m.paidOut)}</td>
                    <td className="py-2 tabular-nums">{showMoney(m.stillOwed)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-brand-gray">Nothing yet. Months appear once a payment is verified or a consultation is settled.</p>
        )}
      </section>
    </div>
  );
}
