"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { onboardingHref } from "@/components/home/Navbar";

/**
 * HANDOVER-22 §2 — the persistent way in.
 *
 * Someone reading the blog, the sample assessment or the about page has no
 * route into the funnel without scrolling back to the navbar, and the navbar
 * scrolls away with the hero. This is the standing one.
 *
 * ── Why it hides itself, and where ───────────────────────────────────────
 * • Over the plans. Competing with the real pricing CTA is worse than not
 *   being there: two "start" affordances on one screen make the reader
 *   choose between buttons instead of choosing the product. Observed on
 *   `#pricing`, which PricingSection carries on both pages that render it.
 * • Across /onboarding/*. Someone already in the funnel cannot "get
 *   started"; a floating button that restarts what they are doing is a
 *   trap, not a shortcut. The same reasoning covers /booking/* (the legacy
 *   funnel), /gift/* (which carries its own claim CTA), /p/* (a client's
 *   own photographs) and the whole practitioner studio, where a marketing
 *   CTA has no business being at all.
 *
 * ── Why IntersectionObserver rather than a scroll handler ────────────────
 * A scroll handler fires on every frame and has to measure the element
 * itself, which forces layout on the main thread during scrolling. The
 * observer does the same job off the main thread and reports only the
 * transitions. Nothing here calls setState from an effect body — the state
 * changes come from callbacks, which is what keeps this clear of
 * react-hooks/set-state-in-effect.
 */

const PLANS_SELECTOR = "#pricing";

/** Route prefixes where a "Get Started" CTA is wrong, not merely redundant. */
const SUPPRESSED_PREFIXES = [
  "/onboarding",
  "/booking",
  "/studio",
  "/gift",
  "/p/",
];

/**
 * HANDOVER-23 §2.11 — "appear after roughly 400px of scroll". Raised from
 * 320px, which on a laptop put the tab on screen while the hero was still
 * partly visible.
 */
const HERO_SCROLL_PX = 400;

function Arrow({ className }: { className: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

export default function StickyGetStartedTab() {
  const pathname = usePathname();
  const [plansVisible, setPlansVisible] = useState(false);

  // Hidden until the reader has moved — appearing over the hero, beside the
  // navbar's own Get Started, is the one place it is pure noise.
  const [scrolledPastHero, setScrolledPastHero] = useState(false);

  const suppressed = SUPPRESSED_PREFIXES.some((prefix) =>
    (pathname ?? "").startsWith(prefix),
  );

  useEffect(() => {
    if (suppressed) return;

    const plans = document.querySelector(PLANS_SELECTOR);
    if (!plans) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) setPlansVisible(entry.isIntersecting);
      },
      // A sliver on screen is enough to count as "in view": the tab sits at
      // the vertical middle of the viewport, so the plans reaching the edge
      // of the screen is already the moment the two would compete.
      { threshold: 0 },
    );
    observer.observe(plans);
    return () => observer.disconnect();
  }, [suppressed, pathname]);

  useEffect(() => {
    if (suppressed) return;

    const onScroll = () =>
      setScrolledPastHero(window.scrollY > HERO_SCROLL_PX);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [suppressed, pathname]);

  if (suppressed) return null;

  const visible = scrolledPastHero && !plansVisible;

  return (
    <>
      {/*
        Tablet and up: the vertical tab, flush to the right edge.

        HANDOVER-23 §2.11, option A. The arrow is what makes it read as an
        action rather than a label — without it, a vertical word on the edge
        of the screen looks like a section marker.

        py-[22px] px-[13px] on a 12px cap-height label clears the 44px
        minimum tap target on both axes.
      */}
      <Link
        href={onboardingHref}
        aria-hidden={!visible}
        tabIndex={visible ? undefined : -1}
        className={`gr-sticky-tab fixed right-0 top-1/2 z-40 hidden -translate-y-1/2 flex-col items-center justify-center gap-2.5 rounded-l-2xl py-[22px] pl-[13px] pr-[13px] text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:flex ${
          visible
            ? "translate-x-0 opacity-100"
            : "pointer-events-none translate-x-full opacity-0"
        }`}
      >
        <Arrow className="gr-sticky-tab__arrow h-[13px] w-[13px] flex-none" />
        <span className="gr-sticky-tab__label whitespace-nowrap text-xs font-semibold uppercase">
          Get Started
        </span>
      </Link>

      {/*
        Under 640px a right-edge vertical tab covers a usable share of a
        phone screen and sits under the thumb during scrolling, and vertical
        type at that size is cramped and easy to mis-tap. A horizontal pill
        at the bottom right is the same affordance where the thumb already
        is. `env(safe-area-inset-bottom)` keeps it clear of the iOS home bar.
      */}
      <div
        className={`fixed bottom-0 right-0 z-40 px-4 transition-all duration-300 sm:hidden ${
          visible
            ? "translate-y-0 opacity-100"
            : "pointer-events-none translate-y-4 opacity-0"
        }`}
        style={{ paddingBottom: "calc(1.125rem + env(safe-area-inset-bottom))" }}
      >
        <Link
          href={onboardingHref}
          aria-hidden={!visible}
          tabIndex={visible ? undefined : -1}
          className="inline-flex items-center gap-[9px] rounded-full bg-gradient-to-br from-[#7a3aa8] to-brand-primary px-[22px] py-3.5 text-sm font-medium text-white shadow-[0_10px_26px_-8px_rgba(102,45,145,0.6)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary"
        >
          Get Started
          <Arrow className="h-[15px] w-[15px] flex-none" />
        </Link>
      </div>
    </>
  );
}
