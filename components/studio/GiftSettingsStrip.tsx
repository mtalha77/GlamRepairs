"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";

import { formInputClassName } from "@/components/ui/fieldStyles";
import { updateGiftSettingsAction } from "@/lib/studio/actions";

/**
 * The settings strip — HOTFIX-29 §3.1.
 *
 * ── Unlimited is a value, not an empty box ───────────────────────────────
 * The cap column is nullable and NULL means unlimited. A blank number input
 * cannot express that unambiguously — blank reads as "I did not fill this
 * in" — so Unlimited gets its own checkbox and the number input is disabled
 * while it is ticked. Otherwise the screen offers two ways to say nothing
 * and means different things by them.
 */

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-xl bg-brand-primary px-4 py-2.5 text-sm text-white transition-opacity disabled:opacity-50"
    >
      {pending ? "Saving…" : "Save settings"}
    </button>
  );
}

export default function GiftSettingsStrip({
  enabled,
  monthlyCap,
  defaultPlan,
  expiryDays,
  usedThisMonth,
  plans,
}: {
  enabled: boolean;
  monthlyCap: number | null;
  defaultPlan: string;
  expiryDays: number;
  usedThisMonth: number | null;
  plans: { planKey: string; label: string }[];
}) {
  const [on, setOn] = useState(enabled);
  const [unlimited, setUnlimited] = useState(monthlyCap == null);
  const [cap, setCap] = useState(monthlyCap ?? 20);

  return (
    <form
      action={updateGiftSettingsAction}
      className="space-y-5 rounded-2xl border border-brand-lavender/70 bg-white p-5"
    >
      <div>
        <h2 className="font-serif text-xl text-brand-primary">Settings</h2>
        <p className="mt-1 text-sm leading-relaxed text-brand-gray">
          These live in the database, so they change immediately. Nothing here
          needs a deploy.
        </p>
      </div>

      <label className="flex items-start gap-3 rounded-xl border border-brand-lavender/60 px-4 py-3">
        <input
          type="checkbox"
          name="enabled"
          checked={on}
          onChange={(e) => setOn(e.target.checked)}
          className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--color-brand-primary,#6b4a8f)]"
        />
        <span className="text-sm leading-relaxed">
          <span className="font-medium text-brand-ink">Gift programme</span>
          <span className="mt-0.5 block text-brand-gray">
            {on
              ? "New codes can be issued."
              : "No new codes can be issued. Codes already issued stay valid."}
          </span>
        </span>
      </label>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="text-sm text-brand-gray">
          <label htmlFor="gift-monthly-cap">Monthly cap</label>
          <input
            id="gift-monthly-cap"
            type="number"
            name="monthlyCap"
            min={0}
            max={10000}
            step={1}
            value={cap}
            disabled={unlimited}
            onChange={(e) => setCap(Number(e.target.value))}
            className={`${formInputClassName} mt-1 disabled:opacity-50`}
          />
          <label className="mt-2 flex items-center gap-2">
            <input
              type="checkbox"
              name="unlimited"
              checked={unlimited}
              onChange={(e) => setUnlimited(e.target.checked)}
              className="h-4 w-4 accent-[var(--color-brand-primary,#6b4a8f)]"
            />
            <span className="text-xs">Unlimited</span>
          </label>
          <span className="mt-1 block text-xs">
            {unlimited
              ? `No limit. ${usedThisMonth ?? "—"} issued this month.`
              : `${usedThisMonth ?? "—"} of ${cap} issued this month.`}
          </span>
        </div>

        <label className="text-sm text-brand-gray">
          Default plan
          <select
            name="defaultPlan"
            defaultValue={defaultPlan}
            className={`${formInputClassName} mt-1`}
          >
            {/*
              Only active plans. A code granting a retired plan is refused by
              the database at insert, so offering one here would store a
              setting that breaks every code generated afterwards.
            */}
            {plans.map((p) => (
              <option key={p.planKey} value={p.planKey}>
                {p.label}
              </option>
            ))}
          </select>
          <span className="mt-1 block text-xs">
            What a code grants when you leave the plan field blank.
          </span>
        </label>

        <label className="text-sm text-brand-gray">
          Default expiry
          <input
            type="number"
            name="expiryDays"
            min={1}
            max={3650}
            step={1}
            defaultValue={expiryDays}
            className={`${formInputClassName} mt-1`}
          />
          <span className="mt-1 block text-xs">
            Days. Codes already issued keep the date they were given.
          </span>
        </label>
      </div>

      <SaveButton />
    </form>
  );
}
