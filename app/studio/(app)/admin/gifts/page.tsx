import Link from "next/link";
import { notFound } from "next/navigation";

import { giftCodeUrl, isGiftProgrammeEnabled } from "@/lib/gifts/giftCodes";
import {
  getGiftCapacity,
  giftCodeState,
  listGiftCodes,
} from "@/lib/gifts/issueGiftCode";
import { requireStudioMember } from "@/lib/studio/member";

/**
 * HANDOVER-20 Part 2 — the gift codes screen.
 *
 * The number that matters here is the monthly count against the cap, because
 * the constraint is not fraud, it is that a free Clarity assessment is
 * Rs. 2,000 of the only practitioner's time. So the cap is the headline and
 * the code list is the detail.
 */

const STATE_LABEL = {
  outstanding: "Outstanding",
  redeemed: "Redeemed",
  expired: "Expired",
  inactive: "Cancelled",
} as const;

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default async function GiftsPage() {
  const { member } = await requireStudioMember();
  if (!member?.isSuperAdmin) {
    notFound();
  }

  const [codes, capacity] = await Promise.all([
    listGiftCodes(),
    getGiftCapacity(),
  ]);
  const enabled = isGiftProgrammeEnabled();

  const counts = codes.reduce<Record<string, number>>((acc, row) => {
    const state = giftCodeState(row);
    acc[state] = (acc[state] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl text-brand-primary">Gift codes</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-brand-gray">
          A gifted assessment is a free assessment, not a discount — and it is
          roughly Rs. 2,000 of practitioner time. The monthly cap is what
          protects paying clients from waiting longer.
        </p>
      </div>

      {!enabled ? (
        <div className="rounded-2xl border border-brand-accent/40 bg-brand-accent/5 px-4 py-3.5">
          <p className="text-sm leading-relaxed text-brand-ink">
            <strong className="font-medium">
              The gift programme is switched off.
            </strong>{" "}
            No new codes can be issued. Existing codes can still be redeemed —
            switching off stops new gifts, it does not void ones people are
            already holding. Set{" "}
            <code className="font-mono text-xs">GIFT_PROGRAMME_ENABLED=true</code>{" "}
            once there is more than one practitioner.
          </p>
        </div>
      ) : null}

      <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-brand-lavender/70 bg-white p-4">
          <dt className="text-xs uppercase tracking-wide text-brand-gray">
            This month
          </dt>
          <dd className="mt-1 text-2xl text-brand-primary tabular-nums">
            {capacity.used}
            <span className="text-base text-brand-gray"> / {capacity.cap}</span>
          </dd>
          <p className="mt-1 text-xs text-brand-gray">
            {capacity.remaining === 0
              ? "Cap reached — issuing is stopped until next month."
              : `${capacity.remaining} left before the cap.`}
          </p>
        </div>
        {(["outstanding", "redeemed", "expired"] as const).map((state) => (
          <div
            key={state}
            className="rounded-2xl border border-brand-lavender/70 bg-white p-4"
          >
            <dt className="text-xs uppercase tracking-wide text-brand-gray">
              {STATE_LABEL[state]}
            </dt>
            <dd className="mt-1 text-2xl text-brand-primary tabular-nums">
              {counts[state] ?? 0}
            </dd>
          </div>
        ))}
      </dl>

      {codes.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-brand-lavender bg-white px-4 py-8 text-center text-sm text-brand-gray">
          No gift codes have been issued.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-brand-lavender/70 bg-white">
          <table className="w-full min-w-[44rem] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-brand-lavender/70 text-xs uppercase tracking-wide text-brand-gray">
                <th scope="col" className="px-4 py-3 font-medium">Code</th>
                <th scope="col" className="px-4 py-3 font-medium">State</th>
                <th scope="col" className="px-4 py-3 font-medium">Covers</th>
                <th scope="col" className="px-4 py-3 font-medium">Issued</th>
                <th scope="col" className="px-4 py-3 font-medium">Expires</th>
                <th scope="col" className="px-4 py-3 font-medium">Giver</th>
              </tr>
            </thead>
            <tbody>
              {codes.map((row) => {
                const state = giftCodeState(row);
                return (
                  <tr
                    key={row.code}
                    className="border-b border-brand-lavender/40 last:border-b-0"
                  >
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs text-brand-ink">
                        {row.code}
                      </span>
                      <span className="mt-0.5 block font-mono text-[0.6875rem] text-brand-gray">
                        {giftCodeUrl(row.code)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[0.6875rem] ${
                          state === "outstanding"
                            ? "bg-brand-primary/15 text-brand-primary"
                            : state === "redeemed"
                              ? "bg-brand-lavender/40 text-brand-gray"
                              : "bg-brand-error/10 text-brand-error"
                        }`}
                      >
                        {STATE_LABEL[state]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-brand-ink">
                      {row.discountPct >= 100
                        ? row.grantsPlan
                        : `${row.discountPct}% of ${row.grantsPlan}`}
                    </td>
                    <td className="px-4 py-3 text-brand-gray">
                      {formatDate(row.createdAt)}
                    </td>
                    <td className="px-4 py-3 text-brand-gray">
                      {formatDate(row.expiresAt)}
                    </td>
                    <td className="px-4 py-3">
                      {row.issuedToLead ? (
                        <Link
                          href={`/studio/customers/${row.issuedToLead}`}
                          className="text-brand-primary underline-offset-2 hover:underline"
                        >
                          View client
                        </Link>
                      ) : (
                        <span className="text-brand-gray">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
