import Link from "next/link";
import { redirect } from "next/navigation";

import { ApproveRunButton, MarkPaidForm } from "@/components/studio/payouts/PayoutControls";
import { loadPayoutPeriod, periodFor } from "@/lib/practitioners/payouts";
import { formatRupees } from "@/lib/practitioners/roster";
import { requireStudioMember } from "@/lib/studio/member";

/**
 * Studio → Payouts — HANDOVER-52 §4.6. Super admin only.
 *
 * One month at a time: what is ready to approve, what is held waiting on
 * a note (shown, not hidden), and each approved payout waiting to be
 * marked paid with its transfer reference.
 */

export const dynamic = "force-dynamic";

const card = "rounded-2xl border border-brand-lavender/70 bg-white p-5";

export default async function PayoutsPage({ searchParams }: { searchParams: Promise<{ month?: string }> }) {
  const { member } = await requireStudioMember();
  if (!member) redirect("/studio/login");
  if (!member.isSuperAdmin) redirect("/studio");

  const period = periodFor((await searchParams).month);
  const rows = await loadPayoutPeriod(period);
  const toApprove = rows.reduce((s, r) => s + r.toApproveMinor, 0);
  const platform = rows.reduce((s, r) => s + r.platformMinor, 0);
  const held = rows.reduce((s, r) => s + r.heldMinor, 0);
  const awaiting = rows.flatMap((r) => r.payouts.filter((p) => p.status === "approved").map((p) => ({ ...p, name: r.name })));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-serif text-2xl text-brand-primary">Payouts, {period.label}</h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-brand-gray">
            Paid monthly by bank transfer, by the 5th. A consultation is payable once its note is written; until then its
            fee is held, and joins the next run when the note arrives.
          </p>
        </div>
        <nav className="flex gap-2 text-sm" aria-label="Month">
          <Link href={`/studio/payouts?month=${period.prev}`} className="inline-flex min-h-10 items-center rounded-lg border border-brand-border-light px-3">
            Previous
          </Link>
          <Link href={`/studio/payouts?month=${period.next}`} className="inline-flex min-h-10 items-center rounded-lg border border-brand-border-light px-3">
            Next
          </Link>
        </nav>
      </div>

      <section className={card}>
        <h2 className="font-serif text-lg text-brand-primary">To approve</h2>
        {rows.length ? (
          <table className="mt-3 w-full text-sm">
            <thead className="text-left text-brand-gray">
              <tr>
                <th className="py-2 font-normal">Practitioner</th>
                <th className="py-2 font-normal">Consultations</th>
                <th className="py-2 text-right font-normal">Payable</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-lavender/60">
              {rows.map((r) => (
                <tr key={r.practitionerId} className="align-top">
                  <td className="py-2 text-brand-ink">{r.name}</td>
                  <td className="py-2 text-brand-ink">
                    {r.toApproveCount}
                    {r.heldCount ? (
                      <span className="block text-xs text-brand-gray">
                        {r.heldCount} {r.heldCount === 1 ? "note" : "notes"} outstanding, {formatRupees(r.heldMinor)} held
                      </span>
                    ) : null}
                  </td>
                  <td className="py-2 text-right text-brand-ink">{formatRupees(r.toApproveMinor)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="border-t border-brand-lavender">
              <tr>
                <td className="pt-3 font-medium text-brand-ink" colSpan={2}>
                  Total payable
                </td>
                <td className="pt-3 text-right font-medium text-brand-ink">{formatRupees(toApprove)}</td>
              </tr>
              <tr>
                <td className="text-brand-gray" colSpan={2}>
                  Platform
                </td>
                <td className="text-right text-brand-gray">{formatRupees(platform)}</td>
              </tr>
              {held ? (
                <tr>
                  <td className="text-brand-gray" colSpan={2}>
                    Held for notes
                  </td>
                  <td className="text-right text-brand-gray">{formatRupees(held)}</td>
                </tr>
              ) : null}
            </tfoot>
          </table>
        ) : (
          <p className="mt-2 text-sm text-brand-gray">Nothing earned up to the end of {period.label}.</p>
        )}
        {toApprove > 0 ? (
          <div className="mt-4">
            <ApproveRunButton month={period.month} label={period.label} total={formatRupees(toApprove)} />
          </div>
        ) : null}
      </section>

      <section className={card}>
        <h2 className="font-serif text-lg text-brand-primary">Approved, waiting to be paid</h2>
        {awaiting.length ? (
          <ul className="mt-3 divide-y divide-brand-lavender/60">
            {awaiting.map((p) => (
              <li key={p.id} className="flex flex-wrap items-start justify-between gap-3 py-3 text-sm">
                <div>
                  <p className="text-brand-ink">
                    {p.name} · {formatRupees(p.totalMinor)}
                  </p>
                  <Link href={`/studio/payouts/${p.id}`} className="inline-flex min-h-10 items-center text-brand-primary underline">
                    Statement
                  </Link>
                </div>
                <MarkPaidForm id={p.id} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-brand-gray">None.</p>
        )}
      </section>

      <section className={card}>
        <h2 className="font-serif text-lg text-brand-primary">Paid</h2>
        {rows.some((r) => r.payouts.some((p) => p.status === "paid")) ? (
          <ul className="mt-3 divide-y divide-brand-lavender/60 text-sm">
            {rows.flatMap((r) =>
              r.payouts
                .filter((p) => p.status === "paid")
                .map((p) => (
                  <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 py-2">
                    <span className="text-brand-ink">
                      {r.name} · {formatRupees(p.totalMinor)} · {p.reference}
                    </span>
                    <Link href={`/studio/payouts/${p.id}`} className="inline-flex min-h-10 items-center text-brand-primary underline">
                      Statement
                    </Link>
                  </li>
                )),
            )}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-brand-gray">None for {period.label}.</p>
        )}
      </section>
    </div>
  );
}
