"use client";

import { useMemo, useState } from "react";

import type { ReactNode } from "react";

import { cn } from "@/lib/cn";
import { daysUntil } from "@/lib/practitioners/card";

/** What the filters need about a card, plus the card itself, already rendered. */
export type DirectoryEntry = {
  slug: string;
  countryName: string | null;
  languages: string[];
  focus: string[];
  nextAvailableAt: string | null;
  card: ReactNode;
};

/**
 * The /practitioners grid and its four filters (Handover 63 Part 2):
 * country, language, what they read, availability. Language is second on
 * purpose: it is the one people actually filter on.
 *
 * Everything filters in memory. The whole list ships with the page; there
 * is no search backend and no query-string round trip. Revisit past about
 * two hundred practitioners.
 *
 * Handover 65 §4.1: the cards arrive already rendered (on the server, for
 * /practitioners), so this file is the only directory JavaScript a visitor
 * downloads. It decides which cards show; it never builds one.
 */

const AVAILABILITY = [
  { value: "", label: "Any time" },
  { value: "3", label: "Within 3 days" },
  { value: "7", label: "This week" },
] as const;

const uniq = (values: string[]) => [...new Set(values)].sort((a, b) => a.localeCompare(b));

/**
 * Handover 65 §2.6: native selects rendered in each browser's own chrome,
 * which on macOS meant a grey bevelled control inside a purple panel. The
 * control stays a native <select> (keyboard, screen readers and the mobile
 * picker all come free) with the platform styling removed and our own
 * chevron drawn over it.
 */
function Select({
  id,
  label,
  value,
  onChange,
  options,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="flex items-center gap-2">
      <label htmlFor={id} className="text-[11px] font-bold uppercase tracking-[0.1em] text-brand-gray/80">
        {label}
      </label>
      <span className="relative inline-flex">
        <select
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`min-h-10 cursor-pointer appearance-none rounded-full border bg-white py-2 pl-4 pr-9 text-[13.5px] font-medium outline-none transition focus-visible:ring-2 focus-visible:ring-brand-accent/40 ${
            value ? "border-brand-primary text-brand-primary" : "border-brand-lavender text-brand-ink hover:border-brand-accent"
          }`}
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <svg
          viewBox="0 0 12 12"
          aria-hidden="true"
          className="pointer-events-none absolute right-3.5 top-1/2 h-3 w-3 -translate-y-1/2 text-brand-primary"
        >
          <path d="M2.5 4.5 6 8l3.5-3.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
    </div>
  );
}

export default function DirectoryFilters({
  entries: practitioners,
  noun = "practitioners",
}: {
  entries: DirectoryEntry[];
  noun?: string;
}) {
  const [country, setCountry] = useState("");
  const [language, setLanguage] = useState("");
  const [focus, setFocus] = useState("");
  const [within, setWithin] = useState("");

  const options = useMemo(
    () => ({
      countries: uniq(practitioners.map((p) => p.countryName).filter((c): c is string => Boolean(c))),
      languages: uniq(practitioners.flatMap((p) => p.languages)),
      focus: uniq(practitioners.flatMap((p) => p.focus)),
    }),
    [practitioners],
  );

  const list = practitioners.filter(
    (p) =>
      (!country || p.countryName === country) &&
      (!language || p.languages.includes(language)) &&
      (!focus || p.focus.includes(focus)) &&
      (!within || (p.nextAvailableAt !== null && daysUntil(p.nextAvailableAt) <= Number(within))),
  );

  // The way out names the filter most likely to be the problem: language
  // when it is set, otherwise whichever narrow filter is on.
  const culprit = language ? "language" : focus ? "what they read" : within ? "availability" : "country";
  const clear = () => {
    setCountry("");
    setLanguage("");
    setFocus("");
    setWithin("");
  };
  // Handover 65 §2.1: "1 practitioners".
  const counted = (n: number) => (n === 1 ? noun.replace(/s$/, "") : noun);
  return (
    <>
      <div className="mt-7 flex flex-wrap items-center gap-x-4 gap-y-3 rounded-[14px] border border-brand-lavender/70 bg-brand-surface-alt px-[18px] py-4">
        <Select
          id="filter-country"
          label="Country"
          value={country}
          onChange={setCountry}
          options={[{ value: "", label: "Anywhere" }, ...options.countries.map((c) => ({ value: c, label: c }))]}
        />
        <Select
          id="filter-language"
          label="Language"
          value={language}
          onChange={setLanguage}
          options={[{ value: "", label: "Any language" }, ...options.languages.map((c) => ({ value: c, label: c }))]}
        />
        <Select
          id="filter-focus"
          label="Reads"
          value={focus}
          onChange={setFocus}
          options={[{ value: "", label: "Anything" }, ...options.focus.map((c) => ({ value: c, label: c }))]}
        />
        <Select
          id="filter-availability"
          label="Free"
          value={within}
          onChange={setWithin}
          options={AVAILABILITY.map((a) => ({ value: a.value, label: a.label }))}
        />
        <span className="ml-auto text-[13px] tabular-nums text-brand-gray/80" aria-live="polite">
          {list.length === practitioners.length ? `${practitioners.length} ${counted(practitioners.length)}` : `${list.length} of ${practitioners.length}`}
        </span>
        <button type="button" onClick={clear} className="text-[13px] font-semibold text-brand-primary underline">
          Clear
        </button>
      </div>

      {/*
        Handover 65 §2.2: auto-fill kept empty tracks, so one or two cards sat
        on the left of a 1120px row with a hole beside them. auto-fit
        collapses the empty tracks, and a narrower box keeps one or two
        cards from stretching into banners.
      */}
      <div
        className={cn(
          "mt-6 grid grid-cols-1 gap-[22px] sm:grid-cols-[repeat(auto-fit,minmax(300px,1fr))]",
          practitioners.length === 1 ? "max-w-[380px]" : practitioners.length === 2 ? "max-w-[760px]" : null,
        )}
      >
        {list.length ? (
          list.map((p) => <div key={p.slug} className="contents">{p.card}</div>)
        ) : (
          <div className="col-span-full rounded-[14px] border border-dashed border-brand-accent bg-brand-purple-soft p-8 text-center text-[15px] text-brand-gray">
            No one matches all four filters yet. Clearing <b className="text-brand-ink">{culprit}</b> usually finds someone,
            and every practitioner here can read your photographs wherever you are.
          </div>
        )}
      </div>
    </>
  );
}
