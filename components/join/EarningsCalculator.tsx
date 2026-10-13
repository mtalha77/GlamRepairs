"use client";

import { useState } from "react";

/**
 * "Move the slider" — arithmetic, not a forecast. Consultations a week ×
 * Rs 2,000 × 4 weeks, with the working shown beneath the total so it can
 * never read as a promise of booking volume.
 */
const RATE = 2000;

export default function EarningsCalculator() {
  const [perWeek, setPerWeek] = useState(8);
  const monthly = perWeek * RATE * 4;
  return (
    <div className="rounded-2xl border border-brand-lavender/60 bg-white p-6 shadow-[0_6px_24px_rgba(60,30,90,0.06)]">
      <label htmlFor="per-week" className="block text-sm font-semibold">
        Consultations per week: <span className="font-bold text-brand-primary">{perWeek}</span>
      </label>
      <input
        id="per-week"
        type="range"
        min={1}
        max={20}
        value={perWeek}
        onChange={(e) => setPerWeek(Number(e.target.value))}
        className="mb-5 mt-2 h-12 w-full accent-brand-primary"
      />
      <p className="text-sm font-semibold">
        Rate per consultation: <span className="font-bold text-brand-primary">Rs 2,000</span>
      </p>
      <div className="mt-4 rounded-xl bg-brand-purple-soft p-5 text-center">
        <p className="text-[38px] font-semibold leading-none tracking-tight text-brand-primary tabular-nums" aria-live="polite">
          Rs {monthly.toLocaleString("en-PK")}
        </p>
        <p className="mt-2 text-sm text-brand-gray">per month, before tax</p>
      </div>
      <p className="mt-3 text-center text-xs text-brand-accent tabular-nums">
        {perWeek} × Rs 2,000 × 4 weeks
      </p>
    </div>
  );
}
