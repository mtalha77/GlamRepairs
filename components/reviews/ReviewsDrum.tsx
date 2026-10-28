"use client";

import { useCallback, useMemo, useRef, useState } from "react";

import { useSectionArrows } from "@/lib/hooks/useSectionArrows";
import type { Review } from "@/lib/reviews";

/**
 * HANDOVER-61 Part 2: the reviews drum.
 *
 * A real cylinder: six faces at rotateY(i * 60deg) translateZ(radius), the
 * ring rotated the other way, all of it composited by the browser. No
 * per-frame JavaScript.
 *
 * ── Six faces, however many reviews ──────────────────────────────────────
 * The radius is (width / 2) / tan(PI / faces). One face per review would
 * push it from about 260px to 560px at twelve reviews and flatten the ring
 * into a row. So there are always six, and they are repainted as the drum
 * turns: with a virtual index v, the slots at v-2 .. v+3 always hold the
 * reviews for those positions. The face turning away keeps its content for
 * the whole animation and the one coming round is filled before it shows.
 *
 * Under prefers-reduced-motion the transition is off (globals and the
 * motion-reduce variant), and buttons, dots, swipe and arrows all still work.
 */

const FACES = 6;
const STEP = 360 / FACES;
const SWIPE_PX = 45;
/** (w / 2) / tan(30deg), as a multiple of the card width. */
const RADIUS_FACTOR = 0.5 / Math.tan(Math.PI / FACES);

const mod = (n: number, m: number) => ((n % m) + m) % m;

export default function ReviewsDrum({ reviews, countryNames }: { reviews: Review[]; countryNames: Record<string, string> }) {
  const countries = useMemo(() => [...new Set(reviews.map((r) => r.country))], [reviews]);
  const [country, setCountry] = useState<string | null>(null);
  const list = useMemo(() => (country ? reviews.filter((r) => r.country === country) : reviews), [reviews, country]);
  const [v, setV] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const dragX = useRef<number | null>(null);

  const prev = useCallback(() => setV((x) => x - 1), []);
  const next = useCallback(() => setV((x) => x + 1), []);
  useSectionArrows(rootRef, prev, next);

  const count = list.length;
  const current = mod(v, count);

  // Which review each of the six faces shows right now.
  const slots: (Review | null)[] = Array(FACES).fill(null);
  for (let d = -2; d <= 3; d += 1) slots[mod(v + d, FACES)] = list[mod(v + d, count)] ?? null;
  const front = mod(v, FACES);

  if (count === 0) return null;

  return (
    <div ref={rootRef}>
      {countries.length > 1 ? (
        <div role="group" aria-label="Show reviews from" className="mb-6 flex flex-wrap justify-center gap-2">
          {[null, ...countries].map((c) => (
            <button
              key={c ?? "all"}
              type="button"
              aria-pressed={country === c}
              onClick={() => {
                setCountry(c);
                setV(0);
              }}
              className={`min-h-11 rounded-full border px-4 text-[0.8125rem] font-medium ${
                country === c
                  ? "border-brand-primary bg-brand-primary text-white"
                  : "border-brand-lavender bg-white text-brand-gray hover:text-brand-primary"
              }`}
            >
              {c ? (countryNames[c] ?? c) : "All reviews"}
            </button>
          ))}
        </div>
      ) : null}

      <div
        role="region"
        aria-roledescription="carousel"
        aria-label="Client reviews"
        className="relative mx-auto h-[300px] select-none [perspective:1400px] [touch-action:pan-y] sm:h-[280px]"
        style={{ ["--w" as string]: "min(78vw, 320px)" }}
        onPointerDown={(e) => {
          dragX.current = e.clientX;
        }}
        onPointerUp={(e) => {
          if (dragX.current === null) return;
          const dx = e.clientX - dragX.current;
          dragX.current = null;
          if (dx <= -SWIPE_PX) next();
          else if (dx >= SWIPE_PX) prev();
        }}
        onPointerCancel={() => {
          dragX.current = null;
        }}
      >
        <div
          className="absolute left-1/2 top-0 h-full [transform-style:preserve-3d] transition-transform duration-[650ms] ease-[cubic-bezier(0.22,0.75,0.28,1)] motion-reduce:transition-none"
          style={{
            width: "var(--w)",
            marginLeft: "calc(var(--w) / -2)",
            transform: `translateZ(calc(var(--w) * ${-RADIUS_FACTOR})) rotateY(${-v * STEP}deg)`,
          }}
        >
          {slots.map((review, slot) => {
            const isFront = slot === front;
            return (
              <figure
                key={slot}
                aria-hidden={!isFront}
                className={`absolute inset-0 flex flex-col justify-center rounded-[22px] border border-brand-lavender/70 px-7 py-6 text-center shadow-[0_18px_40px_-24px_color-mix(in_srgb,var(--color-brand-primary)_45%,transparent)] [backface-visibility:hidden] transition-opacity duration-500 motion-reduce:transition-none ${
                  slot % 2 === 0 ? "bg-brand-cream-card" : "bg-brand-purple-soft"
                } ${isFront ? "opacity-100" : "opacity-50"}`}
                style={{ transform: `rotateY(${slot * STEP}deg) translateZ(calc(var(--w) * ${RADIUS_FACTOR}))` }}
              >
                {review ? (
                  <>
                    <blockquote className="font-serif text-[1.0625rem] italic leading-[1.55] text-brand-primary">
                      &ldquo;{review.quote}&rdquo;
                    </blockquote>
                    <figcaption className="mt-4 text-[0.8125rem] text-brand-gray">
                      <span className="font-medium text-brand-ink">{review.name}</span>, {review.city}
                    </figcaption>
                  </>
                ) : null}
              </figure>
            );
          })}
        </div>
      </div>

      <p className="sr-only" aria-live="polite">
        Review {current + 1} of {count}
      </p>

      <div className="mt-6 flex items-center justify-center gap-4">
        <button
          type="button"
          onClick={prev}
          aria-label="Previous review"
          className="flex h-11 w-11 items-center justify-center rounded-full border border-brand-lavender bg-white text-brand-primary hover:border-brand-primary"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden>
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <div className="flex gap-1.5">
          {list.map((r, i) => (
            <button
              key={`${r.name}-${i}`}
              type="button"
              aria-label={`Review ${i + 1}: ${r.name}`}
              aria-current={i === current}
              onClick={() => setV((x) => x + (i - mod(x, count)))}
              className="flex h-11 w-5 items-center justify-center"
            >
              <span className={`block h-2 rounded-full transition-all motion-reduce:transition-none ${i === current ? "w-5 bg-brand-primary" : "w-2 bg-brand-lavender"}`} />
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={next}
          aria-label="Next review"
          className="flex h-11 w-11 items-center justify-center rounded-full border border-brand-lavender bg-white text-brand-primary hover:border-brand-primary"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden>
            <path d="M9 18l6-6-6-6" />
          </svg>
        </button>
      </div>
    </div>
  );
}
