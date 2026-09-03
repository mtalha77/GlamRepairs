import type { Metadata } from "next";

/**
 * Keeps funnel steps out of the search index.
 *
 * ── The problem this solves ──────────────────────────────────────────────────
 * Search Console flagged `/onboarding/step/1` under "Duplicate without
 * user-selected canonical" and `/onboarding/step/3` under "Page with redirect".
 * Checked live: both return 200 and are fully crawlable.
 *
 * These pages should never rank. They are stateful, near-identical to one
 * another, thin, and meaningless without the answers from earlier steps. Left
 * indexable they do three bad things: burn crawl budget, compete with real
 * pages, and drag the site's average quality down — which matters on a YMYL
 * site where Google is already applying its strictest bar.
 *
 * ── Why noindex rather than a robots.txt disallow ────────────────────────────
 * These URLs are *already* in Google's index. A robots.txt disallow blocks
 * crawling, which means Google never re-reads the page — so it cannot discover
 * a noindex and the URL can sit in the index indefinitely.
 *
 * To remove an already-indexed page you must let Google crawl it and find the
 * noindex. So: allow crawling, serve noindex, and let them drop out naturally.
 * A disallow could be added later once the index is clean, but it would be
 * counterproductive now.
 *
 * `follow: true` is deliberate — links out of the funnel still pass signal.
 *
 * A layout is used rather than editing each step page so the dev's
 * `STEP_METADATA` map stays untouched. Route metadata merges, so per-step
 * titles still apply; only `robots` is added.
 */
export const metadata: Metadata = {
  robots: {
    index: false,
    follow: true,
    googleBot: { index: false, follow: true },
  },
};

export default function OnboardingStepLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
