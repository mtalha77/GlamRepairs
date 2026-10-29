"use client";

import { useMemo, useState } from "react";

import PractitionerCard, { type CardActions } from "@/components/practitioners/PractitionerCard";
import { daysUntil, type CardPractitioner } from "@/lib/practitioners/card";

/**
 * The /practitioners grid and its four filters (Handover 63 Part 2):
 * country, language, what they read, availability. Language is second on
 * purpose: it is the one people actually filter on.
 *
 * Everything filters in memory. The whole list ships with the page; there
 * is no search backend and no query-string round trip. Revisit past about
 * two hundred practitioners.
 */

const AVAILABILITY = [
  { value: "", label: "Any time" },
  { value: "3", label: "Within 3 days" },
  { value: "7", label: "This week" },
] as const;

const uniq = (values: string[]) => [...new Set(values)].sort((a, b) => a.localeCompare(b));

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
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="cursor-pointer rounded-[9px] border border-brand-lavender bg-white px-3 py-2 text-[13.5px] text-brand-ink outline-none focus:border-brand-accent"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export default function PractitionerDirectory({
  practitioners,
  actionsFor,
  noun = "practitioners",
}: {
  practitioners: CardPractitioner[];
  /** Built per card by the page, so the test portal can choose without navigating. */
  actionsFor?: (p: CardPractitioner) => CardActions;
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
  const actions = actionsFor ?? ((p: CardPractitioner) => ({
    chooseHref: `/onboarding?practitioner=${encodeURIComponent(p.slug)}`,
    profileHref: `/practitioners/${p.slug}`,
  }));

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
          {list.length === practitioners.length ? `${practitioners.length} ${noun}` : `${list.length} of ${practitioners.length}`}
        </span>
        <button type="button" onClick={clear} className="text-[13px] font-semibold text-brand-primary underline">
          Clear
        </button>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-[22px] md:grid-cols-[repeat(auto-fill,minmax(330px,1fr))]">
        {list.length ? (
          list.map((p) => (
            <PractitionerCard
              key={p.slug}
              p={p}
              actions={actions(p)}
              className="transition duration-300 hover:-translate-y-1 hover:shadow-xl motion-reduce:transition-none motion-reduce:hover:translate-y-0"
            />
          ))
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
