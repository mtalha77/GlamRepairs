"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";

import { formInputClassName } from "@/components/ui/fieldStyles";
import { issueStudioGiftCodeAction } from "@/lib/studio/actions";

/**
 * Issuing a code from the studio — HANDOVER-28 §2.4.
 *
 * ── Two modes, because they are two different objects ────────────────────
 * "Generated" is a bearer token: unguessable, single use, for one named
 * person. "Typed" is a published campaign code: AYESHA20 goes to an
 * influencer's whole audience, so being memorable is the point and being
 * guessable is not a threat.
 *
 * The form defaults to generated, and switching to typed changes the
 * defaults with it (many uses, a discount rather than free), because the
 * dangerous form is not "a typed code" — it is a typed code left at the
 * single-use gift defaults and then published to ten thousand people.
 *
 * The real limits are `maxUses`, the expiry, and the monthly free-assessment
 * cap, all enforced in the database. Nothing here is a security boundary;
 * it is the shape of the thing being made.
 */

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-xl bg-brand-primary px-4 py-2.5 text-sm text-white transition-opacity disabled:opacity-50"
    >
      {pending ? "Creating…" : "Create code"}
    </button>
  );
}

export default function GiftCodeIssueForm({
  defaultExpiryDays,
  remainingThisMonth,
}: {
  defaultExpiryDays: number;
  remainingThisMonth: number;
}) {
  const [mode, setMode] = useState<"generated" | "manual">("generated");
  const [discountPct, setDiscountPct] = useState(100);
  const [maxUses, setMaxUses] = useState(1);
  const [confirmed, setConfirmed] = useState(false);

  const isFree = discountPct >= 100;
  const isManual = mode === "manual";
  // The one combination worth a second look: memorable, public, and free.
  const needsConfirmation = isManual && isFree;
  const freeAssessments = isFree ? maxUses : 0;
  const overCap = freeAssessments > remainingThisMonth;

  function switchMode(next: "generated" | "manual") {
    setMode(next);
    setConfirmed(false);
    if (next === "manual") {
      // A published code that is free and single-use is almost always a
      // mistake — the first person to see the post takes it. Default to the
      // shape a campaign actually wants.
      setDiscountPct(20);
      setMaxUses(50);
    } else {
      setDiscountPct(100);
      setMaxUses(1);
    }
  }

  return (
    <form
      action={issueStudioGiftCodeAction}
      className="space-y-4 rounded-2xl border border-brand-lavender/70 bg-white p-5"
    >
      <div>
        <h2 className="font-serif text-xl text-brand-primary">Create a code</h2>
        <p className="mt-1 text-sm leading-relaxed text-brand-gray">
          A generated code is for one person and cannot be guessed. A code you
          type is for publishing — to an influencer&apos;s audience, a
          newsletter, a poster.
        </p>
      </div>

      <input type="hidden" name="mode" value={mode} />

      <div
        role="radiogroup"
        aria-label="Code type"
        className="flex flex-wrap gap-2"
      >
        {(
          [
            ["generated", "Generate one", "Single use, unguessable"],
            ["manual", "Type my own", "Shareable, many uses"],
          ] as const
        ).map(([value, label, hint]) => (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={mode === value}
            onClick={() => switchMode(value)}
            className={`flex-1 rounded-xl border px-4 py-3 text-left transition-colors ${
              mode === value
                ? "border-brand-primary bg-brand-lavender/25"
                : "border-brand-border-light bg-white hover:border-brand-lavender"
            }`}
          >
            <span className="block text-sm font-medium text-brand-ink">
              {label}
            </span>
            <span className="mt-0.5 block text-xs text-brand-gray">{hint}</span>
          </button>
        ))}
      </div>

      {isManual ? (
        <label className="block text-sm text-brand-gray">
          The code people will type
          <input
            type="text"
            name="code"
            required
            maxLength={24}
            placeholder="AYESHA20"
            autoCapitalize="characters"
            spellCheck={false}
            className={`${formInputClassName} mt-1 font-mono uppercase`}
          />
          <span className="mt-1 block text-xs text-brand-gray">
            Letters, numbers and dashes. Case does not matter — it is stored
            uppercase and matched either way.
          </span>
        </label>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-3">
        <label className="text-sm text-brand-gray">
          Discount
          <div className="relative mt-1">
            <input
              type="number"
              name="discountPct"
              min={1}
              max={100}
              step={1}
              required
              value={discountPct}
              onChange={(e) => {
                setDiscountPct(Number(e.target.value));
                setConfirmed(false);
              }}
              className={`${formInputClassName} pr-8`}
            />
            <span
              aria-hidden
              className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-brand-gray"
            >
              %
            </span>
          </div>
          <span className="mt-1 block text-xs text-brand-gray">
            {isFree ? "A free assessment." : "Money off the assessment."}
          </span>
        </label>

        <label className="text-sm text-brand-gray">
          How many times
          <input
            type="number"
            name="maxUses"
            min={1}
            max={10000}
            step={1}
            required
            value={maxUses}
            onChange={(e) => {
              setMaxUses(Number(e.target.value));
              setConfirmed(false);
            }}
            className={`${formInputClassName} mt-1`}
          />
          <span className="mt-1 block text-xs text-brand-gray">
            {maxUses === 1 ? "One person." : `Up to ${maxUses} people.`}
          </span>
        </label>

        <label className="text-sm text-brand-gray">
          Expires after
          <input
            type="number"
            name="expiryDays"
            min={1}
            max={3650}
            step={1}
            defaultValue={defaultExpiryDays}
            className={`${formInputClassName} mt-1`}
          />
          <span className="mt-1 block text-xs text-brand-gray">
            Days from today.
          </span>
        </label>
      </div>

      <label className="block text-sm text-brand-gray">
        What is it for
        <input
          type="text"
          name="note"
          maxLength={200}
          placeholder="Ayesha — Instagram collab, March"
          className={`${formInputClassName} mt-1`}
        />
        <span className="mt-1 block text-xs text-brand-gray">
          Only you see this. In six months it is the difference between a list
          of codes and a record of what worked.
        </span>
      </label>

      <label className="block text-sm text-brand-gray">
        Kind
        <select
          name="kind"
          defaultValue={isManual ? "promo" : "gift"}
          key={mode}
          className={`${formInputClassName} mt-1`}
        >
          <option value="gift">Gift</option>
          <option value="referral">Referral</option>
          <option value="promo">Promotion</option>
        </select>
        <span className="mt-1 block text-xs text-brand-gray">
          A label for your own reporting. It does not change what the code
          does — the discount and the number of uses do that.
        </span>
      </label>

      {/*
        Stated as assessments, not as codes. "1 code" and "50 free
        assessments" are the same row and only the second one is the number
        that runs out of Ayma's time.
      */}
      {isFree ? (
        <p
          className={`rounded-xl px-4 py-3 text-sm leading-relaxed ${
            overCap
              ? "bg-brand-error/10 text-brand-error-strong"
              : "bg-brand-lavender/20 text-brand-ink"
          }`}
        >
          This code is {freeAssessments} free{" "}
          {freeAssessments === 1 ? "assessment" : "assessments"}.{" "}
          {overCap
            ? `Only ${remainingThisMonth} left in this month's limit, so the database will refuse this. Lower the uses, or raise the monthly limit below.`
            : `${remainingThisMonth} left in this month's limit.`}
        </p>
      ) : null}

      {needsConfirmation ? (
        <label className="flex items-start gap-3 rounded-xl border border-brand-accent/50 bg-brand-accent/5 px-4 py-3">
          <input
            type="checkbox"
            name="confirm100"
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--color-brand-primary,#6b4a8f)]"
          />
          <span className="text-sm leading-relaxed text-brand-ink">
            I mean to publish a free assessment. Anyone who sees this code can
            use it, up to {maxUses}{" "}
            {maxUses === 1 ? "time" : "times"}, without being invited.
          </span>
        </label>
      ) : null}

      <div className="flex items-center gap-3">
        <SubmitButton />
        {needsConfirmation && !confirmed ? (
          <span className="text-xs text-brand-gray">
            Tick the box above first.
          </span>
        ) : null}
      </div>
    </form>
  );
}
