import Link from "next/link";
import { notFound } from "next/navigation";

import GiftCodeActiveToggle from "@/components/studio/GiftCodeActiveToggle";
import GiftCodeIssueForm from "@/components/studio/GiftCodeIssueForm";
import GiftSettingsForm from "@/components/studio/GiftSettingsForm";
import { getGiftSettings } from "@/lib/gifts/adminCodes";
import { giftCodeUrl, isGiftProgrammeEnabled } from "@/lib/gifts/giftCodes";
import {
  getGiftCapacity,
  giftCodeState,
  listGiftCodes,
  type GiftCodeRow,
} from "@/lib/gifts/issueGiftCode";
import { requireStudioMember } from "@/lib/studio/member";

/**
 * HANDOVER-20 Part 2, extended by HANDOVER-28 §2.4 — the codes screen.
 *
 * The number that matters here is free assessments against the monthly cap,
 * because the constraint is not fraud, it is that a free Skin Transform
 * assessment is Rs. 3,000 of the only practitioner's time. So the cap is the
 * headline and the code list is the detail.
 *
 * Note it counts ASSESSMENTS, not rows: one influencer code with fifty uses
 * is fifty of them. The database enforces the cap with the same maths, so the
 * headline and the refusal message cannot disagree.
 */

const STATE_LABEL = {
  outstanding: "Live",
  redeemed: "Used up",
  expired: "Expired",
  inactive: "Turned off",
} as const;

const STATE_STYLE = {
  outstanding: "bg-brand-primary/15 text-brand-primary",
  redeemed: "bg-brand-lavender/40 text-brand-gray",
  expired: "bg-brand-error/10 text-brand-error-strong",
  inactive: "bg-brand-error/10 text-brand-error-strong",
} as const;

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** What the code is worth, in the words Talha would use to describe it. */
function describeOffer(row: GiftCodeRow) {
  const free = row.discountPct >= 100;
  const uses =
    row.maxUses === 1 ? "one person" : `up to ${row.maxUses} people`;
  return free
    ? `Free assessment, ${uses}`
    : `${row.discountPct}% off, ${uses}`;
}

type GiftsPageProps = {
  searchParams: Promise<{
    error?: string;
    issued?: string;
    deactivated?: string;
    reactivated?: string;
    saved?: string;
  }>;
};

export default async function GiftsPage({ searchParams }: GiftsPageProps) {
  const { member } = await requireStudioMember();
  if (!member?.isSuperAdmin) {
    notFound();
  }

  const params = await searchParams;

  const [codes, capacity, settings] = await Promise.all([
    listGiftCodes(),
    getGiftCapacity(),
    getGiftSettings(),
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
        <h1 className="font-serif text-2xl text-brand-primary">
          Gift and redeem codes
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-brand-gray">
          Two kinds of code. A generated one is a private gift for a single
          named person. A code you type — AYESHA20 — is for publishing to an
          influencer&apos;s audience, and it is limited by how many uses you
          give it, not by being hard to guess.
        </p>
      </div>

      {params.error ? (
        <p
          role="alert"
          className="rounded-xl bg-brand-error/10 px-4 py-3 text-sm leading-relaxed text-brand-error-strong"
        >
          {params.error}
        </p>
      ) : null}

      {params.issued ? (
        <div className="rounded-xl bg-brand-success/15 px-4 py-3 text-sm leading-relaxed text-brand-success-strong">
          <p>
            Created <span className="font-mono">{params.issued}</span>.
          </p>
          <p className="mt-1 font-mono text-xs break-all">
            {giftCodeUrl(params.issued)}
          </p>
        </div>
      ) : null}

      {params.deactivated ? (
        <p className="rounded-xl bg-brand-lavender/25 px-4 py-3 text-sm text-brand-ink">
          <span className="font-mono">{params.deactivated}</span> is turned
          off. Nobody new can redeem it; anyone who already did keeps their
          assessment.
        </p>
      ) : null}

      {params.reactivated ? (
        <p className="rounded-xl bg-brand-lavender/25 px-4 py-3 text-sm text-brand-ink">
          <span className="font-mono">{params.reactivated}</span> is live
          again.
        </p>
      ) : null}

      {params.saved === "settings" ? (
        <p className="rounded-xl bg-brand-success/15 px-4 py-3 text-sm text-brand-success-strong">
          Limits saved.
        </p>
      ) : null}

      {/*
        The kill switch only gates issuing FROM A CLIENT'S RECORD — the
        "gift an assessment to a friend" flow, which spends capacity on
        someone who has not paid. Issuing from here is Talha's own decision
        about his own marketing, so it is not gated on it, and saying which
        is which stops the banner reading as "nothing on this page works".
      */}
      {!enabled ? (
        <div className="rounded-2xl border border-brand-accent/40 bg-brand-accent/5 px-4 py-3.5">
          <p className="text-sm leading-relaxed text-brand-ink">
            <strong className="font-medium">
              Client-to-client gifting is switched off.
            </strong>{" "}
            Paying clients cannot gift an assessment to a friend until{" "}
            <code className="font-mono text-xs">
              GIFT_PROGRAMME_ENABLED=true
            </code>{" "}
            and there is more than one practitioner. Codes you create here are
            unaffected, and existing codes can still be redeemed.
          </p>
        </div>
      ) : null}

      <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-brand-lavender/70 bg-white p-4">
          <dt className="text-xs uppercase tracking-wide text-brand-gray">
            Free this month
          </dt>
          <dd className="mt-1 text-2xl text-brand-primary tabular-nums">
            {capacity.used}
            <span className="text-base text-brand-gray"> / {capacity.cap}</span>
          </dd>
          <p className="mt-1 text-xs text-brand-gray">
            {capacity.remaining === 0
              ? "Limit reached — no more free codes until next month, or raise it below."
              : `${capacity.remaining} assessments left.`}
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

      <GiftCodeIssueForm
        defaultExpiryDays={settings.giftExpiryDays}
        remainingThisMonth={capacity.remaining}
      />

      <GiftSettingsForm
        giftCodesPerMonth={settings.giftCodesPerMonth}
        giftExpiryDays={settings.giftExpiryDays}
        memberDiscountPct={settings.memberDiscountPct}
      />

      {codes.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-brand-lavender bg-white px-4 py-8 text-center text-sm text-brand-gray">
          No codes yet.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-brand-lavender/70 bg-white">
          <table className="w-full min-w-[52rem] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-brand-lavender/70 text-xs uppercase tracking-wide text-brand-gray">
                <th scope="col" className="px-4 py-3 font-medium">Code</th>
                <th scope="col" className="px-4 py-3 font-medium">State</th>
                <th scope="col" className="px-4 py-3 font-medium">Worth</th>
                <th scope="col" className="px-4 py-3 font-medium">Used</th>
                <th scope="col" className="px-4 py-3 font-medium">Created</th>
                <th scope="col" className="px-4 py-3 font-medium">Expires</th>
                <th scope="col" className="px-4 py-3 font-medium">For</th>
                <th scope="col" className="px-4 py-3 font-medium">
                  <span className="sr-only">Actions</span>
                </th>
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
                      <span className="mt-0.5 block font-mono text-[0.6875rem] break-all text-brand-gray">
                        {giftCodeUrl(row.code)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[0.6875rem] ${STATE_STYLE[state]}`}
                      >
                        {STATE_LABEL[state]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-brand-ink">
                      {describeOffer(row)}
                    </td>
                    <td className="px-4 py-3 text-brand-gray tabular-nums">
                      {row.usesCount} / {row.maxUses}
                    </td>
                    <td className="px-4 py-3 text-brand-gray">
                      {formatDate(row.createdAt)}
                    </td>
                    <td className="px-4 py-3 text-brand-gray">
                      {formatDate(row.expiresAt)}
                    </td>
                    <td className="px-4 py-3 text-brand-gray">
                      {row.note ? (
                        <span className="text-brand-ink">{row.note}</span>
                      ) : row.issuedToLead ? (
                        <Link
                          href={`/studio/customers/${row.issuedToLead}`}
                          className="text-brand-primary underline-offset-2 hover:underline"
                        >
                          View client
                        </Link>
                      ) : (
                        <span aria-hidden>—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {/*
                        Nothing to turn off once a code is used up — the
                        limit already stopped it, and offering the control
                        implies it would do something.
                      */}
                      {state === "redeemed" ? null : (
                        <GiftCodeActiveToggle
                          code={row.code}
                          active={row.active}
                        />
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
