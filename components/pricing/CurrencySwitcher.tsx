"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { PricingRegion } from "@/lib/pricing/regions";

/**
 * HOTFIX-7 §1, trap (b) — never hard-lock by IP. Geo (or a prior choice)
 * sets `region`; picking a different one here persists the override
 * (POST /api/pricing/region sets a 1-year cookie) and refreshes the page so
 * every server-rendered price updates together.
 */
export default function CurrencySwitcher({
  region,
  regions,
  className = "",
}: {
  region: PricingRegion;
  regions: PricingRegion[];
  className?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [value, setValue] = useState(region.code);

  if (regions.length <= 1) return null;

  return (
    <label
      className={`inline-flex items-center gap-2 text-sm text-brand-gray ${className}`}
    >
      <span className="sr-only">Currency</span>
      <select
        value={value}
        disabled={pending}
        onChange={async (event) => {
          const code = event.target.value;
          setValue(code);
          await fetch("/api/pricing/region", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ code }),
          }).catch(() => {
            // Best-effort — worst case the choice doesn't persist and geo
            // resolves it again next load.
          });
          startTransition(() => router.refresh());
        }}
        className="rounded-full border border-brand-border-light/60 bg-white px-3 py-1.5 text-sm text-brand-ink"
        aria-label="Show prices in"
      >
        {regions.map((option) => (
          <option key={option.code} value={option.code}>
            {option.currency} — {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
