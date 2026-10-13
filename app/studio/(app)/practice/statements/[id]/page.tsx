import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { formatSlot, TZ_LABEL } from "@/lib/consultation/format";
import { loadPayout, REASON_LABEL } from "@/lib/practitioners/payouts";
import { formatRupees, ownPractitionerProfile } from "@/lib/practitioners/roster";
import { requireStudioMember } from "@/lib/studio/member";

/**
 * Her own itemised statement for one payout — every consultation, what it
 * was paid for, and the transfer reference. Only the practitioner it
 * belongs to (super admins use Studio → Payouts).
 */

export const dynamic = "force-dynamic";

export default async function OwnStatementPage({ params }: { params: Promise<{ id: string }> }) {
  const { member } = await requireStudioMember();
  if (!member) redirect("/studio/login");
  const [profile, data] = await Promise.all([ownPractitionerProfile(member.userId), loadPayout((await params).id)]);
  if (!profile || !data || data.payout.practitioner_id !== profile.id) notFound();
  const { payout, lines } = data;

  return (
    <div className="space-y-6">
      <Link href="/studio/practice" className="text-sm text-brand-primary underline">
        Back to My practice
      </Link>
      <div>
        <h1 className="font-serif text-2xl text-brand-primary">Statement, {payout.period_start.slice(0, 7)}</h1>
        <p className="mt-1 text-sm text-brand-gray">
          {payout.status === "paid" ? `Paid, reference ${payout.reference}` : "Approved, payment on its way"}
        </p>
      </div>
      <section className="rounded-2xl border border-brand-lavender/70 bg-white p-5">
        <table className="w-full text-sm">
          <thead className="text-left text-brand-gray">
            <tr>
              <th className="py-2 font-normal">Consultation ({TZ_LABEL})</th>
              <th className="py-2 font-normal">For</th>
              <th className="py-2 text-right font-normal">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-brand-lavender/60">
            {lines.map((l) => (
              <tr key={l.id}>
                <td className="py-2 text-brand-ink">{l.startsAt ? formatSlot(l.startsAt) : ""}</td>
                <td className="py-2 text-brand-ink">{REASON_LABEL[l.reason] ?? l.reason}</td>
                <td className="py-2 text-right text-brand-ink">{formatRupees(l.practitionerMinor)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot className="border-t border-brand-lavender">
            <tr>
              <td className="pt-3 font-medium text-brand-ink" colSpan={2}>
                Total
              </td>
              <td className="pt-3 text-right font-medium text-brand-ink">{formatRupees(payout.total_minor)}</td>
            </tr>
          </tfoot>
        </table>
      </section>
    </div>
  );
}
