"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/cn";
import { availabilityLabel, firstName, type CardPractitioner, type SampleAvatar } from "@/lib/practitioners/card";

/**
 * The practitioner card. Handover 61 Part 1 sets its order, which is the
 * order the decision is made in: face and language, three numbers, what they
 * read most, their own voice, the verifiable credential, then when and how
 * much.
 */

const HAIR: Record<SampleAvatar["style"], string> = {
  long: "M27 44c0-24 15-31 23-31s23 7 23 31v28h-9V40c-5-7-23-7-28 0v32h-9z",
  bun: "M29 42c0-21 14-27 21-27s21 6 21 27c0-7-6-15-21-15s-21 8-21 15z",
  wrap: "M25 46c0-25 16-33 25-33s25 8 25 33c0 15-4 22-4 28h-9c2-12 2-28-2-36-4-8-16-8-20 0-4 8-4 24-2 36h-9c0-6-4-13-4-28z",
  crop: "M30 40c0-18 11-25 20-25s20 7 20 25c0-9-7-14-20-14s-20 5-20 14z",
};

/**
 * A sample profile's portrait. Deliberately an illustration: a stock photo
 * of a real stranger captioned with a name and a reference number is the one
 * thing here that would embarrass anyone who checked.
 */
function SampleFace({ a }: { a: SampleAvatar }) {
  return (
    <svg viewBox="13 5 74 74" preserveAspectRatio="xMidYMid slice" role="img" aria-label="Illustrated sample portrait" className="block h-full w-full">
      <rect x="0" y="0" width="100" height="100" fill={a.bg} />
      <rect x="43" y="52" width="14" height="18" rx="6" fill={a.shade} />
      <path d="M16 100c0-23 15-32 34-32s34 9 34 32z" fill={a.cloth} />
      <ellipse cx="50" cy="39" rx="18" ry="21" fill={a.skin} />
      {a.style === "bun" ? <circle cx="50" cy="11" r="8" fill={a.hair} /> : null}
      <path d={HAIR[a.style]} fill={a.hair} />
      <ellipse cx="43" cy="39" rx="1.7" ry="2.2" fill={a.feature} opacity=".75" />
      <ellipse cx="57" cy="39" rx="1.7" ry="2.2" fill={a.feature} opacity=".75" />
      <path d="M45 47q5 4 10 0" stroke={a.feature} strokeWidth="1.5" fill="none" strokeLinecap="round" opacity=".55" />
    </svg>
  );
}

/**
 * Full-bleed portrait (the face is the first thing someone judges, so it gets
 * the top of the card), over a monogram or the sample illustration. The
 * image removes itself on error, and is checked right after mount for a load
 * that failed before the listener existed, so a broken file degrades to the
 * monogram, never to a broken-image icon.
 */
function Portrait({ p }: { p: CardPractitioner }) {
  const img = useRef<HTMLImageElement>(null);
  const [broken, setBroken] = useState(false);
  useEffect(() => {
    const el = img.current;
    if (el && el.complete && el.naturalWidth === 0) setBroken(true);
  }, []);

  return (
    <div className="absolute inset-0">
      <div className="absolute inset-0 flex items-center justify-center bg-brand-lavender font-serif text-6xl italic text-brand-primary [&_svg]:h-full [&_svg]:w-full">
        {p.avatar ? <SampleFace a={p.avatar} /> : p.initials}
      </div>
      {p.photo && !broken ? (
        // eslint-disable-next-line @next/next/no-img-element -- needs the native error event and naturalWidth check
        <img
          ref={img}
          src={p.photo}
          alt={p.name}
          loading="lazy"
          onError={() => setBroken(true)}
          className="absolute inset-0 h-full w-full object-cover object-[center_22%]"
        />
      ) : null}
    </div>
  );
}

export type CardActions = {
  /** Where "Choose" goes. Absent for a card that is only being looked at. */
  chooseHref?: string;
  onChoose?: () => void;
  /** Absent on the profile page itself. */
  profileHref?: string;
};

export default function PractitionerCard({
  p,
  actions,
  className,
  headingLevel = "h3",
}: {
  p: CardPractitioner;
  actions: CardActions;
  className?: string;
  headingLevel?: "h2" | "h3";
}) {
  const Heading = headingLevel;
  const stats = [
    p.years != null ? { value: String(p.years), label: "Years" } : null,
    p.reads != null ? { value: `${p.reads.toLocaleString("en-GB")}+`, label: "Skins read" } : null,
    p.rating != null ? { value: p.rating.toFixed(1), label: "Rating" } : null,
  ].filter((s): s is { value: string; label: string } => s !== null);
  const when = p.nextAvailableAt ? `Next available: ${availabilityLabel(p.nextAvailableAt)}` : null;
  const whenLine = [when, p.price].filter(Boolean).join("  ·  ");

  return (
    <article
      className={cn(
        "relative flex flex-col overflow-hidden rounded-[20px] border border-brand-lavender/70 bg-white shadow-lg",
        className,
      )}
    >
      {p.sample ? (
        <span className="absolute right-0 top-0 z-10 rounded-bl-[9px] bg-brand-cream px-3 py-1 text-[9.5px] font-extrabold tracking-[0.1em] text-brand-ink">
          SAMPLE PROFILE
        </span>
      ) : null}

      <div className="relative h-[236px] shrink-0 overflow-hidden bg-brand-purple-soft">
        <Portrait p={p} />
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-gradient-to-t from-brand-ink/90 via-brand-ink/30 to-transparent" />
        {p.recommended ? (
          <span className="absolute left-3.5 top-3.5 rounded-full bg-white px-3 py-1 text-[11px] font-bold uppercase tracking-[0.08em] text-brand-primary shadow-md">
            Recommended
          </span>
        ) : null}
        <div className="absolute inset-x-[22px] bottom-[17px] text-white">
          <Heading className="font-sans text-[23px] font-bold leading-tight tracking-[-0.4px] [text-shadow:0_1px_10px_rgb(0_0_0/0.35)]">
            {p.name}
          </Heading>
          <p className="mt-1 font-serif text-[14px] italic leading-snug text-brand-lavender">{p.role}</p>
          <p className="mt-2 inline-block rounded-full border border-white/25 bg-white/15 px-3 py-1 text-[12.5px] text-white/95 backdrop-blur-md">
            {[p.countryName, p.languages.join(", ")].filter(Boolean).join("  ·  ")}
          </p>
        </div>
      </div>

      {stats.length ? (
        <div
          className="grid border-y border-brand-lavender/70 bg-brand-surface-alt"
          style={{ gridTemplateColumns: `repeat(${stats.length}, minmax(0, 1fr))` }}
        >
          {stats.map((s) => (
            <div key={s.label} className="border-r border-brand-lavender/70 px-2 py-3 text-center last:border-r-0">
              <b className="block text-[19px] font-bold tabular-nums tracking-[-0.4px] text-brand-primary">{s.value}</b>
              <span className="mt-0.5 block text-[9.5px] font-semibold uppercase tracking-[0.07em] text-brand-gray/80">{s.label}</span>
            </div>
          ))}
        </div>
      ) : null}

      <div className="flex flex-1 flex-col px-[22px] pt-[17px]">
        {p.focus.length ? (
          <>
            <p className="text-[9.5px] font-bold uppercase tracking-[0.14em] text-brand-gray/80">Reads most often</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {p.focus.map((f) => (
                <span key={f} className="rounded-full bg-brand-purple-soft px-[11px] py-[5px] text-[11.5px] font-semibold text-brand-primary">
                  {f}
                </span>
              ))}
            </div>
          </>
        ) : null}
        {p.quote ? (
          <p className="mt-3.5 border-l-2 border-brand-lavender pl-3 font-serif text-[13.5px] italic leading-relaxed text-brand-gray">
            {p.quote}
          </p>
        ) : null}
        {p.credentialTitle ? (
          <div className="mt-3.5 flex items-start gap-2.5 rounded-[9px] bg-brand-success/10 px-3 py-2.5">
            <svg viewBox="0 0 16 16" aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-success-strong">
              <path d="M3 8.5l3 3 7-7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="text-[11.5px] leading-snug text-brand-ink">
              <b className="block font-bold">{p.credentialTitle}</b>
              {p.credentialRef}
            </span>
          </div>
        ) : null}
      </div>

      {whenLine ? (
        // "Today" depends on the reader's timezone, which the server does not know.
        <p suppressHydrationWarning className="px-[22px] pb-0.5 pt-3.5 text-[11.5px] font-semibold text-brand-success-strong">
          {whenLine}
        </p>
      ) : null}

      {actions.chooseHref || actions.onChoose || actions.profileHref ? (
        <div className="mt-auto flex gap-2 px-[22px] pb-5 pt-3">
          {actions.onChoose ? (
            <button
              type="button"
              onClick={actions.onChoose}
              className="flex-1 rounded-[10px] bg-brand-primary p-3 text-center text-[14.5px] font-semibold text-white transition hover:bg-brand-primary-dark"
            >
              Choose {firstName(p.name)}
            </button>
          ) : actions.chooseHref ? (
            <Link
              href={actions.chooseHref}
              className="flex-1 rounded-[10px] bg-brand-primary p-3 text-center text-[14.5px] font-semibold text-white transition hover:bg-brand-primary-dark"
            >
              Choose {firstName(p.name)}
            </Link>
          ) : null}
          {actions.profileHref ? (
            <Link
              href={actions.profileHref}
              className="rounded-[10px] border border-brand-lavender bg-white px-4 py-3 text-[14.5px] font-semibold text-brand-primary transition hover:bg-brand-purple-soft"
            >
              Full profile
            </Link>
          ) : null}
        </div>
      ) : (
        <div className="pb-5" />
      )}
    </article>
  );
}
