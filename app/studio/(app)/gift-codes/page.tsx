import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import GeneratedCodesPanel from "@/components/studio/GeneratedCodesPanel";
import GiftBatchDeactivateButton from "@/components/studio/GiftBatchDeactivateButton";
import GiftBatchGenerator from "@/components/studio/GiftBatchGenerator";
import GiftCodeActiveToggle from "@/components/studio/GiftCodeActiveToggle";
import GiftCodeFilters from "@/components/studio/GiftCodeFilters";
import GiftCodeIssueForm from "@/components/studio/GiftCodeIssueForm";
import GiftSettingsStrip from "@/components/studio/GiftSettingsStrip";
import {
  listActivePlanKeys,
  listAdminGiftCodes,
  listGiftBatches,
  type AdminGiftCode,
} from "@/lib/gifts/adminViews";
import { giftCodeUrl } from "@/lib/gifts/giftCodes";
import { getGiftCapacity, getGiftSettings } from "@/lib/gifts/giftSettings";
import { requireStudioMember } from "@/lib/studio/member";

/**
 * Gift codes — HOTFIX-29 Part 3.
 *
 * Super admin only, and the check is repeated in every server action rather
 * than relying on this one. `notFound()` here hides the screen; it does not
 * protect the endpoints behind it, and those run with the service role,
 * which bypasses RLS.
 *
 * Order on the page follows the order of the job: what the programme is
 * currently doing, then making codes, then what happened to the codes you
 * already made. Batches come before individual codes deliberately —
 * redemption rate per batch is the only number here that answers a business
 * question, and a list of two hundred individual codes buries it.
 */

const STATE_LABEL: Record<AdminGiftCode["state"], string> = {
  available: "Available",
  redeemed: "Redeemed",
  expired: "Expired",
  deactivated: "Deactivated",
};

const STATE_STYLE: Record<AdminGiftCode["state"], string> = {
  available: "bg-brand-primary/15 text-brand-primary",
  redeemed: "bg-brand-success/15 text-brand-success-strong",
  expired: "bg-brand-lavender/40 text-brand-gray",
  deactivated: "bg-brand-error/10 text-brand-error-strong",
};

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

type PageProps = {
  searchParams: Promise<{
    state?: string;
    q?: string;
    batch?: string;
    created?: string;
    error?: string;
    saved?: string;
    deactivatedBatch?: string;
    count?: string;
  }>;
};

export default async function GiftCodesPage({ searchParams }: PageProps) {
  const { member } = await requireStudioMember();
  if (!member?.isSuperAdmin) {
    notFound();
  }

  const params = await searchParams;

  const [settings, capacity, plans, batches, codes] = await Promise.all([
    getGiftSettings(),
    getGiftCapacity(),
    listActivePlanKeys(),
    listGiftBatches(),
    listAdminGiftCodes({ state: params.state, search: params.q }),
  ]);

  /*
   * The just-generated codes are re-read from the batch rather than passed
   * through the URL. A query string lands in browser history, server logs
   * and any analytics on the page, and these are bearer tokens — they are
   * meant to be pasted into WhatsApp, not scattered through infrastructure.
   */
  const justCreated = params.batch
    ? (await listAdminGiftCodes({ search: params.batch, limit: 500 }))
        .filter((c) => c.batchLabel === params.batch)
        .slice(0, Number(params.created) || undefined)
    : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl text-brand-primary">Gift codes</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-brand-gray">
          Generate codes for a collaboration, hand them out, and see how many
          came back. A free assessment is roughly Rs. 3,000 of practitioner
          time, so the monthly cap is what protects paying clients from
          waiting longer.
        </p>
      </div>

      {!settings.ok ? (
        <p
          role="alert"
          className="rounded-xl bg-brand-error/10 px-4 py-3 text-sm leading-relaxed text-brand-error-strong"
        >
          The gift settings could not be read, so this screen is showing
          fallbacks and issuing is blocked. This is a fault, not a setting —
          nobody switched anything off.
        </p>
      ) : null}

      {params.error ? (
        <p
          role="alert"
          className="rounded-xl bg-brand-error/10 px-4 py-3 text-sm leading-relaxed text-brand-error-strong"
        >
          {params.error}
        </p>
      ) : null}

      {params.saved === "settings" ? (
        <p className="rounded-xl bg-brand-success/15 px-4 py-3 text-sm text-brand-success-strong">
          Settings saved.
        </p>
      ) : null}

      {params.deactivatedBatch ? (
        <p className="rounded-xl bg-brand-lavender/25 px-4 py-3 text-sm leading-relaxed text-brand-ink">
          Deactivated {params.count ?? 0}{" "}
          {params.count === "1" ? "code" : "codes"} in{" "}
          <span className="font-mono text-xs">{params.deactivatedBatch}</span>.
          Codes already redeemed were left alone.
        </p>
      ) : null}

      {justCreated.length ? (
        <GeneratedCodesPanel
          batchLabel={params.batch ?? ""}
          codes={justCreated.map((c) => ({
            code: c.code,
            expiresAt: c.expiresAt,
          }))}
        />
      ) : null}

      <GiftSettingsStrip
        enabled={settings.enabled}
        monthlyCap={settings.monthlyCap}
        defaultPlan={settings.defaultPlan}
        expiryDays={settings.expiryDays}
        usedThisMonth={capacity.used}
        plans={plans}
      />

      <GiftBatchGenerator
        enabled={settings.enabled && settings.ok}
        plans={plans}
        defaultPlan={settings.defaultPlan}
        defaultExpiryDays={settings.expiryDays}
        remaining={capacity.remaining}
      />

      {/*
        HOTFIX-29 §2.2 says codes are never typed by a human, and for a code
        handed to one named person that is right — it is a bearer token and
        has to be unguessable.

        A published campaign code is a different object. Talha asked for
        these specifically, to share with influencers, and there being
        guessable is the point: the limit is how many times it can be used,
        not whether anyone can remember it. So it stays, below generation
        rather than beside it, because generation is what should happen by
        default.
      */}
      <GiftCodeIssueForm
        enabled={settings.enabled && settings.ok}
        defaultExpiryDays={settings.expiryDays}
        remainingThisMonth={capacity.remaining}
      />

      <section className="space-y-3">
        <div>
          <h2 className="font-serif text-xl text-brand-primary">Batches</h2>
          <p className="mt-1 text-sm text-brand-gray">
            Redemption rate is the number worth watching — it is how you find
            out whether a collaboration was worth doing.
          </p>
        </div>

        {batches.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-brand-lavender bg-white px-4 py-8 text-center text-sm text-brand-gray">
            No batches yet. Generate some codes above.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-brand-lavender/70 bg-white">
            <table className="w-full min-w-[42rem] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-brand-lavender/70 text-xs uppercase tracking-wide text-brand-gray">
                  <th scope="col" className="px-4 py-3 font-medium">Batch</th>
                  <th scope="col" className="px-4 py-3 font-medium">Issued</th>
                  <th scope="col" className="px-4 py-3 font-medium">Codes</th>
                  <th scope="col" className="px-4 py-3 font-medium">Redeemed</th>
                  <th scope="col" className="px-4 py-3 font-medium">Available</th>
                  <th scope="col" className="px-4 py-3 font-medium">Rate</th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {batches.map((b) => (
                  <tr
                    key={b.batchLabel ?? "unlabelled"}
                    className="border-b border-brand-lavender/40 last:border-b-0"
                  >
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs text-brand-ink">
                        {b.batchLabel ?? "—"}
                      </span>
                      {b.recipient ? (
                        <span className="mt-0.5 block text-xs text-brand-gray">
                          {b.recipient}
                        </span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-brand-gray">
                      {formatDate(b.issuedOn)}
                    </td>
                    <td className="px-4 py-3 tabular-nums text-brand-ink">{b.codes}</td>
                    <td className="px-4 py-3 tabular-nums text-brand-ink">{b.redeemed}</td>
                    <td className="px-4 py-3 tabular-nums text-brand-gray">{b.available}</td>
                    <td className="px-4 py-3 tabular-nums text-brand-ink">
                      {b.redemptionPct == null ? "—" : `${b.redemptionPct}%`}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {b.batchLabel && b.available > 0 ? (
                        <GiftBatchDeactivateButton batchLabel={b.batchLabel} />
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="font-serif text-xl text-brand-primary">All codes</h2>

        <Suspense fallback={null}>
          <GiftCodeFilters />
        </Suspense>

        {codes.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-brand-lavender bg-white px-4 py-8 text-center text-sm text-brand-gray">
            {params.q || params.state
              ? "No codes match that."
              : "No codes yet."}
          </p>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-brand-lavender/70 bg-white">
            <table className="w-full min-w-[52rem] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-brand-lavender/70 text-xs uppercase tracking-wide text-brand-gray">
                  <th scope="col" className="px-4 py-3 font-medium">Code</th>
                  <th scope="col" className="px-4 py-3 font-medium">State</th>
                  <th scope="col" className="px-4 py-3 font-medium">Worth</th>
                  <th scope="col" className="px-4 py-3 font-medium">Batch</th>
                  <th scope="col" className="px-4 py-3 font-medium">Expires</th>
                  <th scope="col" className="px-4 py-3 font-medium">Redeemed</th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {codes.map((c) => (
                  <tr
                    key={c.code}
                    className="border-b border-brand-lavender/40 last:border-b-0"
                  >
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs text-brand-ink">
                        {c.code}
                      </span>
                      <span className="mt-0.5 block break-all font-mono text-[0.6875rem] text-brand-gray">
                        {giftCodeUrl(c.code)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[0.6875rem] ${STATE_STYLE[c.state]}`}
                      >
                        {STATE_LABEL[c.state]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-brand-ink">
                      {c.discountPct >= 100
                        ? "Free assessment"
                        : `${c.discountPct}% off`}
                      {c.maxUses > 1 ? (
                        <span className="mt-0.5 block text-xs text-brand-gray">
                          {c.usesCount} of {c.maxUses} used
                        </span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs text-brand-gray">
                        {c.batchLabel ?? "—"}
                      </span>
                      {c.recipient ? (
                        <span className="mt-0.5 block text-xs text-brand-gray">
                          {c.recipient}
                        </span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-brand-gray">
                      {formatDate(c.expiresAt)}
                    </td>
                    <td className="px-4 py-3 text-brand-gray">
                      {c.redeemedByLead ? (
                        <Link
                          href={`/studio/customers/${c.redeemedByLead}`}
                          className="text-brand-primary underline-offset-2 hover:underline"
                        >
                          {formatDate(c.redeemedAt)}
                        </Link>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {/*
                        Nothing to turn off once a code is spent or already
                        dead — offering the control implies it would do
                        something.
                      */}
                      {c.state === "available" ? (
                        <GiftCodeActiveToggle code={c.code} active />
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
