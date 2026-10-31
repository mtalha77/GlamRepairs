"use client";

import { useEffect, useRef, useState } from "react";

import type { CardPractitioner, SampleAvatar } from "@/lib/practitioners/card";

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
export default function Portrait({ p }: { p: CardPractitioner }) {
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

