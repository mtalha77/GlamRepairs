"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

import { formInputClassName } from "@/components/ui/fieldStyles";

/**
 * Filter and search over the code list — HOTFIX-29 §3.3.
 *
 * State goes in the URL rather than component state so a filtered view can
 * be bookmarked and, more usefully, survives the redirect after generating
 * or deactivating something.
 */

const STATES = [
  ["all", "All"],
  ["available", "Available"],
  ["redeemed", "Redeemed"],
  ["expired", "Expired"],
  ["deactivated", "Deactivated"],
] as const;

export default function GiftCodeFilters() {
  const router = useRouter();
  const params = useSearchParams();
  const [search, setSearch] = useState(params.get("q") ?? "");
  const state = params.get("state") ?? "all";

  function apply(next: { state?: string; q?: string }) {
    const p = new URLSearchParams(params.toString());

    // The one-off banners are results of the last action, not filters. They
    // must not survive a filter change, or the "12 codes ready" panel stays
    // pinned to the top while you browse something else.
    for (const key of ["batch", "created", "error", "saved", "deactivatedBatch", "count"]) {
      p.delete(key);
    }

    if (next.state !== undefined) {
      if (next.state === "all") p.delete("state");
      else p.set("state", next.state);
    }
    if (next.q !== undefined) {
      if (next.q.trim() === "") p.delete("q");
      else p.set("q", next.q.trim());
    }

    router.push(`/studio/gift-codes?${p.toString()}`);
  }

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="flex flex-wrap gap-1.5">
        {STATES.map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => apply({ state: value })}
            aria-pressed={state === value}
            className={`rounded-full px-3 py-1.5 text-xs transition-colors ${
              state === value
                ? "bg-brand-primary text-white"
                : "border border-brand-lavender text-brand-gray hover:bg-brand-lavender/20"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          apply({ q: search });
        }}
        className="flex flex-1 gap-2"
      >
        <label htmlFor="gift-code-search" className="sr-only">
          Search codes
        </label>
        <input
          id="gift-code-search"
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Code, batch or recipient"
          className={`${formInputClassName} min-w-[12rem] flex-1 py-2`}
        />
        <button
          type="submit"
          className="shrink-0 rounded-xl border border-brand-lavender px-3 py-2 text-sm text-brand-primary hover:bg-brand-lavender/20"
        >
          Search
        </button>
      </form>
    </div>
  );
}
