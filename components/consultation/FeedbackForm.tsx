"use client";

import { useState } from "react";

import { formInputClassName, formLabelClassName } from "@/components/ui/fieldStyles";

/** The feedback form — HANDOVER-52 §3.6. Four questions, all but the first optional. */

const pill = (on: boolean) =>
  `inline-flex min-h-12 min-w-12 items-center justify-center rounded-full border px-4 text-sm ${
    on ? "border-brand-primary bg-brand-primary text-white" : "border-brand-border-light bg-white text-brand-ink"
  }`;

function Scale({ value, onChange, label }: { value: number | null; onChange: (n: number) => void; label: string }) {
  return (
    <fieldset>
      <legend className={formLabelClassName}>{label}</legend>
      <div className="flex flex-wrap gap-2">
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} type="button" aria-pressed={value === n} className={pill(value === n)} onClick={() => onChange(n)}>
            {n}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

export default function FeedbackForm({ a, k }: { a: string; k: string }) {
  const [rating, setRating] = useState<number | null>(null);
  const [feltHeard, setFeltHeard] = useState<number | null>(null);
  const [wouldReturn, setWouldReturn] = useState<boolean | null>(null);
  const [comment, setComment] = useState("");
  const [publishable, setPublishable] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function submit() {
    if (!rating) return setError("Please choose a rating.");
    setBusy(true);
    setError(null);
    const res = await fetch("/api/consultation/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ a, k, rating, feltHeard, wouldReturn, comment, publishable }),
    }).catch(() => null);
    const data = (await res?.json().catch(() => ({}))) as { ok?: boolean; error?: string } | undefined;
    setBusy(false);
    if (!data?.ok) return setError(data?.error ?? "Something went wrong. Please try again.");
    setDone(true);
  }

  if (done) {
    return (
      <div role="status" className="rounded-2xl bg-brand-purple-soft p-6">
        <h2 className="font-serif text-2xl italic text-brand-primary">Thank you</h2>
        <p className="mt-2 text-sm leading-relaxed text-brand-ink">We read every answer, and it shapes how we work.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 rounded-2xl bg-brand-cream-card p-5 sm:p-6">
      <Scale value={rating} onChange={setRating} label="Overall, how was your consultation? (1 is poor, 5 is excellent)" />
      <Scale value={feltHeard} onChange={setFeltHeard} label="Did you feel listened to? (optional)" />
      <fieldset>
        <legend className={formLabelClassName}>Would you book another consultation? (optional)</legend>
        <div className="flex gap-2">
          <button type="button" aria-pressed={wouldReturn === true} className={pill(wouldReturn === true)} onClick={() => setWouldReturn(true)}>
            Yes
          </button>
          <button type="button" aria-pressed={wouldReturn === false} className={pill(wouldReturn === false)} onClick={() => setWouldReturn(false)}>
            No
          </button>
        </div>
      </fieldset>
      <label className="block">
        <span className={formLabelClassName}>Anything you would like to tell us (optional)</span>
        <textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={4} maxLength={1500} className={formInputClassName} />
      </label>
      {comment.trim() ? (
        <label className="flex min-h-12 items-start gap-3 text-sm leading-relaxed text-brand-ink">
          <input type="checkbox" checked={publishable} onChange={(e) => setPublishable(e.target.checked)} className="mt-1 h-5 w-5 shrink-0" />
          <span>You may quote my comment on the GlamRepairs website, with my first name only.</span>
        </label>
      ) : null}
      {error ? (
        <p role="alert" className="text-sm text-brand-error-strong">
          {error}
        </p>
      ) : null}
      <button
        type="button"
        disabled={busy}
        onClick={submit}
        className="inline-flex min-h-12 items-center justify-center rounded-full bg-brand-primary px-6 text-sm font-medium text-white disabled:opacity-50"
      >
        {busy ? "Sending…" : "Send feedback"}
      </button>
    </div>
  );
}
