"use client";

import { useFunnelStore } from "@/lib/funnel/useFunnelStore";
import { PREFERRED_PRACTITIONER_KEY } from "@/components/onboarding/ApplyPractitionerFromQuery";

export type ChoosablePractitioner = { slug: string; name: string; recommended: boolean };

/**
 * Who reads your skin (Talha, 30 October 2026). On the paid plan the client
 * picks a practitioner, or leaves it to us; the lead is assigned to the one
 * they chose when they submit. On the free plan there is no choice: we
 * assign, and any earlier choice is cleared.
 */
export default function PractitionerChoice({
  practitioners,
  freePlan,
}: {
  practitioners: ChoosablePractitioner[];
  freePlan: boolean;
}) {
  const chosen = useFunnelStore((s) => s.answers[PREFERRED_PRACTITIONER_KEY]) as string | null | undefined;
  const setAnswer = useFunnelStore((s) => s.setAnswer);
  const current = typeof chosen === "string" && practitioners.some((p) => p.slug === chosen) ? chosen : null;

  if (freePlan) {
    return (
      <p className="mb-6 rounded-2xl border border-brand-border-light/60 bg-white px-4 py-3 text-sm leading-relaxed text-brand-gray">
        On the free plan we choose your practitioner for you. A certified practitioner reads your answers and sends your
        report.
      </p>
    );
  }
  if (!practitioners.length) return null;

  const option = (value: string | null, label: string, note?: string) => {
    const selected = current === value;
    return (
      <label
        key={value ?? "any"}
        className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-2xl border px-4 py-3 text-sm transition-colors ${
          selected ? "border-brand-primary bg-brand-purple-soft" : "border-brand-border-light/60 bg-white hover:border-brand-lavender"
        }`}
      >
        <input
          type="radio"
          name="preferred-practitioner"
          checked={selected}
          onChange={() => setAnswer(PREFERRED_PRACTITIONER_KEY, value)}
          className="h-4 w-4 accent-brand-primary"
        />
        <span className="flex-1 text-brand-ink">{label}</span>
        {note ? (
          <span className="rounded-full bg-brand-primary px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-white">
            {note}
          </span>
        ) : null}
      </label>
    );
  };

  return (
    <fieldset className="mb-8">
      <legend className="font-serif text-xl text-brand-primary">Your practitioner</legend>
      <p className="mt-1 text-sm leading-relaxed text-brand-gray">
        Choose who reads your skin, or leave it to us and we will choose for you.
      </p>
      <div className="mt-3 space-y-2">
        {practitioners.map((p) => option(p.slug, p.name, p.recommended ? "Recommended" : undefined))}
        {option(null, "No preference, choose for me")}
      </div>
    </fieldset>
  );
}
