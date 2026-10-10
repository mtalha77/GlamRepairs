import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { formatSlot, TZ_LABEL } from "@/lib/consultation/format";
import { loadPayout, REASON_LABEL } from "@/lib/practitioners/payouts";
import { formatRupees } from "@/lib/practitioners/roster";
import { requireStudioMember } from "@/lib/studio/member";

/** A payout statement — HANDOVER-52 §4.6. Super admin only. */

export const dynamic = "force-dynamic";

export default async function PayoutStatementPage({ params }: { params: Promise<{ id: string }> }) {
  const { member } = await requireStudioMember();
  if (!member) redirect("/studio/login");
  if (!member.isSuperAdmin) redirect("/studio");

  const data = await loadPayout((await params).id);
  if (!data) notFound();
  const { payout, profile, lines } = data;

  return (
    <div className="space-y-6">
      <Link href={`/studio/payouts?month=${payout.period_start.slice(0, 7)}`} className="text-sm text-brand-primary underline">
        Back to payouts
      </Link>
      <div>
        <h1 className="font-serif text-2xl text-brand-primary">Statement: {profile?.full_name ?? "Practitioner"}</h1>
        <p className="mt-1 text-sm text-brand-gray">
          {payout.period_start} to {payout.period_end} · {payout.status === "paid" ? `Paid, reference ${payout.reference}` : "Approved, not yet paid"}
          {profile?.payout_method ? ` · ${profile.payout_method}${profile.payout_detail_ref ? `, ${profile.payout_detail_ref}` : ""}` : ""}
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
