"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  useDocumentHidden,
  usePrefersReducedMotion,
} from "@/lib/hooks/useBrowserState";
import { REVIEWS } from "@/lib/reviews";

/**
 * HANDOVER-12 — the testimonial card deck.
 *
 * A pile of cards that advances itself every five seconds and hands control
 * over the moment the user wants it. Placed between two larger sections as a
 * trust beat, so it stays compact.
 *
 * ── The card is not a new design ─────────────────────────────────────────
 * Radius, shadow, centring, the alternating cream/purple backgrounds and the
 * serif-italic-in-brand-primary quote are all lifted from ProblemCard and
 * TrustPrivacyCard rather than invented. Serif italic in brand-primary is the
 * house voice — it is on every card on the site — so using it for the quote
 * is the single choice that makes this section look native rather than
 * bolted on.
 *
 * ── Why the frame loop writes to the DOM directly ────────────────────────
 * The progress ring updates every frame. Driving that through React state
 * would re-render the whole deck at 60fps to move one stroke offset, so the
 * loop writes `strokeDashoffset` on a ref instead. React state changes once
 * per card, which is the rate at which anything visible actually changes.
 *
 * ── Auto-advance is a WCAG obligation, not a nicety ───────────────────────
 * SC 2.2.2 requires a pause, stop or hide mechanism for anything that
 * auto-updates for more than five seconds. That is satisfied three ways, and
 * all three are load-bearing: a real pause button, suspension on hover and on
 * keyboard focus, and prefers-reduced-motion switching auto-advance off
 * entirely. Do not remove one on the grounds that the others exist.
 */

const DURATION_MS = 5000;
const RING_RADIUS = 18;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;
const SWIPE_THRESHOLD_PX = 45;
const VISIBLE_DEPTH = 3;

/** Google's review gold. Not a brand token on purpose — it signifies Google. */
const STAR_GOLD = "#fbbc04";

function Stars() {
  return (
    <div className="mb-4 flex justify-center gap-px" aria-hidden>
      {Array.from({ length: 5 }, (_, i) => (
        <svg key={i} viewBox="0 0 32 32" fill={STAR_GOLD} className="h-[15px] w-[15px]">
          <path d="M16 2.6c.35 0 .67.2.82.52l3.63 7.44 8.16 1.2c.35.05.64.3.75.64.11.34.02.71-.23.96l-5.92 5.83 1.4 8.2c.06.35-.08.7-.37.91a.87.87 0 0 1-.98.06L16 24.5l-7.26 3.86a.87.87 0 0 1-.98-.06.92.92 0 0 1-.37-.91l1.4-8.2-5.92-5.83a.93.93 0 0 1-.23-.96c.11-.34.4-.59.75-.64l8.16-1.2 3.63-7.44A.9.9 0 0 1 16 2.6z" />
        </svg>
      ))}
    </div>
  );
}

function ArrowIcon({ direction }: { direction: "prev" | "next" }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"
      strokeLinecap="round" strokeLinejoin="round" className="h-[15px] w-[15px]" aria-hidden>
      <path d={direction === "prev" ? "M15 18l-6-6 6-6" : "M9 18l6-6-6-6"} />
    </svg>
  );
}

export default function TestimonialDeck() {
  const count = REVIEWS.length;

  const [index, setIndex] = useState(0);
  /** The user pressed pause. Sticky until they press play. */
  const [isPaused, setIsPaused] = useState(false);
  /** Pointer is over the deck, or focus is inside it. Transient. */
  const [isEngaged, setIsEngaged] = useState(false);
  /**
   * Both read from the browser rather than from React state. See
   * lib/hooks/useBrowserState.ts for why these are external stores: each
   * states its own server value instead of guessing one, so nothing has to
   * render wrong first and correct itself afterwards.
   */
  const prefersReducedMotion = usePrefersReducedMotion();
  const isHidden = useDocumentHidden();

  const ringRef = useRef<SVGCircleElement | null>(null);
  const frameRef = useRef<number | null>(null);
  const startRef = useRef<number | null>(null);
  const touchStartXRef = useRef(0);

  const isRunning =
    count > 1 && !prefersReducedMotion && !isPaused && !isEngaged && !isHidden;

  const goTo = useCallback((next: number) => {
    setIndex(((next % count) + count) % count);
  }, [count]);

  const goNext = useCallback(() => goTo(index + 1), [goTo, index]);
  const goPrev = useCallback(() => goTo(index - 1), [goTo, index]);

  /* ── The frame loop ────────────────────────────────────────────────────
     Depends on `index`, so any interaction that changes the card also
     restarts the countdown — the timer follows the user rather than fighting
     them. The cleanup cancels the frame on every re-run and on unmount. */
  useEffect(() => {
    const ring = ringRef.current;

    if (!isRunning) {
      // Leave the ring wherever it stopped while merely paused; empty it once
      // there is no countdown to represent at all.
      if (ring && (prefersReducedMotion || count <= 1)) {
        ring.style.strokeDashoffset = String(RING_CIRCUMFERENCE);
      }
      return;
    }

    startRef.current = null;

    const tick = (timestamp: number) => {
      if (startRef.current === null) startRef.current = timestamp;
      const progress = Math.min((timestamp - startRef.current) / DURATION_MS, 1);

      // Drains: a full ring at the start of the interval, empty at the end,
      // so it reads as time remaining rather than work completed.
      if (ring) {
        ring.style.strokeDashoffset = String(RING_CIRCUMFERENCE * progress);
      }

      if (progress >= 1) {
        setIndex((current) => (current + 1) % count);
        return;
      }
      frameRef.current = requestAnimationFrame(tick);
    };

    frameRef.current = requestAnimationFrame(tick);

    return () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    };
  }, [isRunning, index, count, prefersReducedMotion]);

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "ArrowRight") {
      event.preventDefault();
      goNext();
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      goPrev();
    }
  };

  if (count === 0) return null;

  return (
    <div
      className="mx-auto max-w-[560px]"
      onMouseEnter={() => setIsEngaged(true)}
      onMouseLeave={() => setIsEngaged(false)}
      // Focus anywhere inside suspends too. `onFocus`/`onBlur` in React bubble,
      // so this covers the arrows, the dots and the back cards without a
      // listener on each.
      onFocus={() => setIsEngaged(true)}
      // relatedTarget guard: focusout fires when focus moves *between* the
      // controls too, so a plain handler would drop engagement and restart the
      // countdown every time the user tabs from an arrow to a dot. Only
      // release when focus has actually left the deck.
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setIsEngaged(false);
        }
      }}
    >
      <div
        role="group"
        aria-roledescription="carousel"
        aria-label="What our clients are saying"
        tabIndex={0}
        onKeyDown={onKeyDown}
        onTouchStart={(e) => {
          touchStartXRef.current = e.touches[0].clientX;
        }}
        onTouchEnd={(e) => {
          const delta = e.changedTouches[0].clientX - touchStartXRef.current;
          if (Math.abs(delta) > SWIPE_THRESHOLD_PX) {
            if (delta < 0) goNext();
            else goPrev();
          }
        }}
        className="relative h-[320px] rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/40 focus-visible:ring-offset-4 focus-visible:ring-offset-brand-purple-tint sm:h-[290px]"
      >
        {REVIEWS.map((review, i) => {
          const depth = (i - index + count) % count;
          const position = depth <= VISIBLE_DEPTH ? String(depth) : "x";
          const isFront = depth === 0;

          return (
            <article
              key={review.name}
              data-p={position}
              // Only the front card is exposed to assistive tech. The rest are
              // decoration until they are brought forward; their content is
              // reachable via the controls, which are labelled.
              aria-hidden={!isFront}
              className={`tdeck-card flex h-[296px] flex-col items-center justify-center rounded-2xl px-[22px] py-[26px] text-center shadow-sm sm:h-[266px] sm:px-[34px] sm:py-[30px] ${
                i % 2 ? "bg-brand-purple-soft" : "bg-brand-cream-card"
              }`}
            >
              <Stars />
              <p className="max-w-[440px] font-serif text-[1.05rem] italic leading-[1.56] text-brand-primary sm:text-[1.18rem]">
                &ldquo;{review.quote}&rdquo;
              </p>
              <div className="mt-5">
                <span className="block font-sans text-sm font-medium text-brand-ink">
                  {review.name}
                </span>
                <span className="font-sans text-[0.8125rem] text-brand-gray">
                  {review.city}
                </span>
              </div>

              {/* Clicking a back card brings it forward. An overlay button
                  rather than a click handler on the article, so the affordance
                  is a real control — focusable, labelled, and announced — and
                  so the front card is not a button with nothing to do. It
                  mounts and unmounts independently of the card, so it never
                  interrupts the transform transition. */}
              {!isFront ? (
                <button
                  type="button"
                  onClick={() => goTo(i)}
                  aria-label={`Show the review from ${review.name}, ${review.city}`}
                  className="absolute inset-0 h-full w-full cursor-pointer rounded-2xl"
                />
              ) : null}
            </article>
          );
        })}
      </div>

      {/* Announces the change only when the deck is not driving itself.
          A live region that fires every five seconds unprompted is noise; one
          that reports the card the user just chose is information. */}
      <p className="sr-only" aria-live={isRunning ? "off" : "polite"}>
        Review {index + 1} of {count}: {REVIEWS[index].name}, {REVIEWS[index].city}
      </p>

      <div className="mt-[30px] flex items-center justify-center gap-3.5">
        <button
          type="button"
          onClick={goPrev}
          aria-label="Previous review"
          className="grid h-10 w-10 place-items-center rounded-full border border-brand-lavender bg-white text-brand-primary shadow-sm transition-colors duration-150 hover:border-brand-primary hover:bg-brand-primary hover:text-white"
        >
          <ArrowIcon direction="prev" />
        </button>

        <div className="flex gap-[7px]">
          {REVIEWS.map((review, i) => (
            <button
              key={review.name}
              type="button"
              onClick={() => goTo(i)}
              aria-label={`Go to review ${i + 1} of ${count}`}
              aria-current={i === index}
              className={`h-[7px] rounded-full transition-[width,background-color] duration-300 motion-reduce:transition-none ${
                i === index ? "w-6 bg-brand-primary" : "w-[7px] bg-brand-lavender"
              }`}
            />
          ))}
        </div>

        {/* The pause control. Hidden when there is no auto-advance to pause —
            a single review, or reduced motion — because a dead button is
            worse than no button. */}
        {count > 1 && !prefersReducedMotion ? (
          <div className="relative h-10 w-10">
            <svg width="40" height="40" className="-rotate-90" aria-hidden>
              <circle className="tdeck-ring-track" cx="20" cy="20" r={RING_RADIUS} fill="none" strokeWidth="2" />
              <circle
                ref={ringRef}
                className="tdeck-ring-fill"
                cx="20"
                cy="20"
                r={RING_RADIUS}
                fill="none"
                strokeWidth="2"
                strokeDasharray={RING_CIRCUMFERENCE}
                strokeDashoffset={RING_CIRCUMFERENCE}
              />
            </svg>
            <button
              type="button"
              onClick={() => setIsPaused((p) => !p)}
              aria-label={isPaused ? "Play reviews" : "Pause reviews"}
              className="absolute inset-0 grid place-items-center text-brand-primary"
            >
              {isPaused ? (
                <svg viewBox="0 0 24 24" fill="currentColor" className="h-3 w-3" aria-hidden>
                  <path d="M8 5v14l11-7z" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="currentColor" className="h-3 w-3" aria-hidden>
                  <rect x="6" y="5" width="4" height="14" rx="1" />
                  <rect x="14" y="5" width="4" height="14" rx="1" />
                </svg>
              )}
            </button>
          </div>
        ) : null}

        <button
          type="button"
          onClick={goNext}
          aria-label="Next review"
          className="grid h-10 w-10 place-items-center rounded-full border border-brand-lavender bg-white text-brand-primary shadow-sm transition-colors duration-150 hover:border-brand-primary hover:bg-brand-primary hover:text-white"
        >
          <ArrowIcon direction="next" />
        </button>
      </div>
    </div>
  );
}
