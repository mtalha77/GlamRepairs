/**
 * HANDOVER-23 §1.2 — the illustration system, at illustration scale.
 *
 * components/sample/SampleIcons.tsx covers the 24px icon end. This is the
 * other end: drawings large enough to carry a card, in the conventions §1.2
 * sets out from `compare-simple-preview.html`.
 *
 * ── The rules, so the next one matches ───────────────────────────────────
 * • 2px strokes, `--brand-accent` for line work.
 * • A soft filled circle behind, `--brand-purple-soft` or `--brand-cream`.
 * • Exactly ONE accent detail in solid `--brand-primary`. One is what makes
 *   a set read as a set; two makes each drawing argue with itself about
 *   where to look.
 * • Inline SVG. No dependency, no network request, and it inherits the
 *   page's colours rather than baking them into a file.
 * • Decorative, so `aria-hidden` — the card's heading already says it.
 *
 * ── Why this exists at all ───────────────────────────────────────────────
 * §1.2's observation: everything visual on the site is either a stock
 * photograph of a woman or a small icon, with nothing in between and
 * nothing that feels drawn for this brand. The trust cards were the clearest
 * case — two carried a large illustration and the third carried nothing,
 * leaving a reserved gap under the copy.
 */

export type BrandIllustrationName = "notShared";

export default function BrandIllustration({
  name,
  className = "h-[9rem] w-auto sm:h-[12rem]",
}: {
  name: BrandIllustrationName;
  className?: string;
}) {
  if (name === "notShared") {
    return (
      <svg
        viewBox="0 0 200 200"
        fill="none"
        className={className}
        aria-hidden
      >
        {/* The soft ground. */}
        <circle cx="100" cy="104" r="76" fill="var(--brand-purple-soft)" />

        {/* A photograph, face down. The card is the subject; everything
            else on the drawing is about what does not happen to it. */}
        <g
          stroke="var(--brand-accent)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="58" y="62" width="84" height="66" rx="10" fill="#ffffff" />
          <path d="M58 108l20-19 15 13 17-19 32 27" />
          <circle cx="119" cy="83" r="6" />

          {/* Three share targets, each unreachable. Drawn small and low so
              they read as "out there" rather than as part of the card. */}
          <circle cx="52" cy="152" r="9" />
          <circle cx="100" cy="160" r="9" />
          <circle cx="148" cy="152" r="9" />
          <path d="M66 145l20-9M134 145l-20-9" strokeDasharray="3 5" />
        </g>

        {/* The one solid accent: the stroke through the whole thing. It is
            the single most important fact on the card, so it is the only
            thing in brand-primary. */}
        <path
          d="M52 148L148 72"
          stroke="var(--brand-primary)"
          strokeWidth="5"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  return null;
}
