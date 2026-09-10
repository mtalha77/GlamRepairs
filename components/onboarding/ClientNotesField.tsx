"use client";

import {
  CLIENT_NOTES_ANSWER_KEY,
  CLIENT_NOTES_HINTS,
  CLIENT_NOTES_MAX_LENGTH,
} from "@/lib/funnel/clientNotes";
import { useStepAnswer } from "@/lib/funnel/useStepAnswer";

/**
 * HANDOVER-18 §2 — "Anything else you'd like us to know?"
 *
 * Directly beneath the upload control and above the support number, per the
 * handover. Optional, and visibly so: this is the highest-friction step in
 * the funnel and a required field here would cost completions.
 *
 * The counter only appears once there is something to count. A "0 / 600"
 * sitting under an empty optional box reads as a quota to fill.
 */
export default function ClientNotesField() {
  const [value, setValue] = useStepAnswer<string>(CLIENT_NOTES_ANSWER_KEY, "");
  const used = value.length;
  const remaining = CLIENT_NOTES_MAX_LENGTH - used;
  // Only worth mentioning when they are close to it.
  const nearLimit = remaining <= 100;

  return (
    <div className="mt-5 sm:mt-6">
      <label
        htmlFor="client-notes"
        className="block text-sm text-brand-ink sm:text-[0.9375rem]"
      >
        Anything else you&rsquo;d like us to know?{" "}
        <span className="text-brand-gray">(optional)</span>
      </label>
      <p className="mt-1.5 text-xs leading-relaxed text-brand-gray sm:text-[0.8125rem]">
        If something about your skin is hard to capture in photos, or there&rsquo;s
        context that might help, add it here.
      </p>

      <textarea
        id="client-notes"
        name="clientNotes"
        rows={4}
        maxLength={CLIENT_NOTES_MAX_LENGTH}
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder="For example: it burns when I use anything with alcohol, and it got worse after I stopped a cream last month."
        className="mt-2.5 w-full resize-y rounded-2xl border border-brand-border-light/70 bg-white px-4 py-3 text-sm leading-relaxed text-brand-ink shadow-sm outline-none transition-colors placeholder:text-brand-gray/45 focus:border-brand-primary sm:text-[0.9375rem]"
      />

      <div className="mt-1.5 flex items-start justify-between gap-3">
        <p className="text-[0.6875rem] leading-snug text-brand-gray sm:text-xs">
          Helpful to mention: {CLIENT_NOTES_HINTS.join(", ")}.
        </p>
        {used > 0 ? (
          <span
            aria-live="polite"
            className={`shrink-0 text-[0.6875rem] tabular-nums sm:text-xs ${
              nearLimit ? "text-brand-error" : "text-brand-gray"
            }`}
          >
            {used} / {CLIENT_NOTES_MAX_LENGTH}
          </span>
        ) : null}
      </div>
    </div>
  );
}
