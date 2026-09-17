"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";

import { formInputClassName } from "@/components/ui/fieldStyles";
import { issueGiftBatchAction } from "@/lib/studio/actions";

/**
 * The Generate panel — HOTFIX-29 §3.2.
 *
 * ── The batch label is required, and that is a product decision ──────────
 * Without it you cannot tell later which influencer drove anything, and
 * that is the only reason to track codes at all. An unlabelled batch is a
 * cost with no reporting attached, so the field is required here and in the
 * server action.
 *
 * ── Why the button is disabled rather than hidden when off ───────────────
 * A missing button raises "where did it go"; a disabled one with the reason
 * beside it answers the question before it is asked.
 */

function GenerateButton({ disabled, count }: { disabled: boolean; count: number }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={disabled || pending}
      className="rounded-xl bg-brand-primary px-5 py-2.5 text-sm text-white transition-opacity disabled:opacity-50"
    >
      {pending
        ? "Generating…"
        : `Generate ${count} ${count === 1 ? "code" : "codes"}`}
    </button>
  );
}

function slugSuggestion() {
  const month = new Date().toLocaleDateString("en-GB", {
    month: "short",
    year: "numeric",
  });
  return `recipient-${month.toLowerCase().replace(" ", "-")}`;
}

export default function GiftBatchGenerator({
  enabled,
  plans,
  defaultPlan,
  defaultExpiryDays,
  remaining,
}: {
  enabled: boolean;
  plans: { planKey: string; label: string }[];
  defaultPlan: string;
  defaultExpiryDays: number;
  /** Null means unlimited. */
  remaining: number | null;
}) {
  const [count, setCount] = useState(1);
  const [discountPct, setDiscountPct] = useState(100);

  const overCap = remaining != null && count > remaining;

  return (
    <form
      action={issueGiftBatchAction}
      className="space-y-4 rounded-2xl border border-brand-lavender/70 bg-white p-5"
    >
      <div>
        <h2 className="font-serif text-xl text-brand-primary">Generate codes</h2>
        <p className="mt-1 text-sm leading-relaxed text-brand-gray">
          Codes are generated, never typed — <code className="font-mono text-xs">GR-XXXXX-XXXXX</code>,
          with no O, 0, I or 1 so they survive being read aloud or retyped
          from a screenshot.
        </p>
      </div>

      {!enabled ? (
        <p className="rounded-xl border border-brand-accent/40 bg-brand-accent/5 px-4 py-3 text-sm leading-relaxed text-brand-ink">
          The gift programme is switched off, so no new codes can be issued.
          Turn it on in Settings above. Codes already issued stay valid.
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm text-brand-gray">
          How many
          <input
            type="number"
            name="count"
            min={1}
            max={500}
            step={1}
            required
            value={count}
            onChange={(e) => setCount(Number(e.target.value))}
            className={`${formInputClassName} mt-1`}
          />
          {overCap ? (
            <span className="mt-1 block text-xs text-brand-error-strong">
              Only {remaining} left in this month&apos;s cap — the database
              will refuse the rest.
            </span>
          ) : null}
        </label>

        <label className="text-sm text-brand-gray">
          Batch label <span aria-hidden>*</span>
          <input
            type="text"
            name="batchLabel"
            required
            maxLength={120}
            placeholder={slugSuggestion()}
            className={`${formInputClassName} mt-1`}
          />
          <span className="mt-1 block text-xs">
            Required. This is how you tell later which collaboration worked.
          </span>
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <label className="text-sm text-brand-gray">
          Type
          <select name="kind" defaultValue="gift" className={`${formInputClassName} mt-1`}>
            <option value="gift">Gift</option>
            <option value="referral">Referral</option>
            <option value="promo">Promotion</option>
          </select>
        </label>

        <div className="text-sm text-brand-gray">
          <label htmlFor="gift-discount">Discount</label>
          <input
            id="gift-discount"
            type="number"
            name="discountPct"
            min={1}
            max={100}
            step={1}
            required
            value={discountPct}
            onChange={(e) => setDiscountPct(Number(e.target.value))}
            className={`${formInputClassName} mt-1`}
          />
          <button
            type="button"
            onClick={() => setDiscountPct(100)}
            className="mt-1 text-xs text-brand-primary underline underline-offset-2 disabled:opacity-40"
            disabled={discountPct === 100}
          >
            Free (100%)
          </button>
        </div>

        <label className="text-sm text-brand-gray">
          Plan
          <select
            name="grantsPlan"
            defaultValue=""
            className={`${formInputClassName} mt-1`}
          >
            <option value="">
              Default ({defaultPlan})
            </option>
            {plans.map((p) => (
              <option key={p.planKey} value={p.planKey}>
                {p.label}
              </option>
            ))}
          </select>
        </label>

        <label className="text-sm text-brand-gray">
          Valid for
          <input
            type="number"
            name="expiresDays"
            min={1}
            max={3650}
            step={1}
            placeholder={String(defaultExpiryDays)}
            className={`${formInputClassName} mt-1`}
          />
          <span className="mt-1 block text-xs">Days. Blank uses the default.</span>
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm text-brand-gray">
          Recipient
          <input
            type="text"
            name="recipient"
            maxLength={200}
            placeholder="Ayesha K, @handle"
            className={`${formInputClassName} mt-1`}
          />
        </label>
        <label className="text-sm text-brand-gray">
          Note
          <input
            type="text"
            name="note"
            maxLength={200}
            placeholder="September outreach"
            className={`${formInputClassName} mt-1`}
          />
        </label>
      </div>

      <GenerateButton disabled={!enabled} count={count} />
    </form>
  );
}
