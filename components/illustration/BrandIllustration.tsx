/**
 * HANDOVER-23 §1.2 — the card-scale illustration set.
 *
 * components/sample/SampleIcons.tsx is the 24px stroke-icon end of the
 * system. This is the other end: the three Trust and Privacy illustrations,
 * drawn to one language.
 *
 * ── What this replaced, and why ──────────────────────────────────────────
 * The first version of this drawing was line art in a purple-soft circle
 * with a `--brand-primary` slash across it, and it did not belong to the
 * same family as the shield and the bin either side of it. Five things
 * differed at once: outline instead of solid fill, a background circle the
 * others do not have, a slash that was the darkest mark in the whole
 * section, three dangling circles standing for nothing, and far less visual
 * mass, so it read as smaller and lighter than its neighbours.
 *
 * The shield and the bin stay as the SVG files they already were. Only this
 * middle card is drawn here — it is the one that had no artwork at all.
 *
 * ── The language, written down so the next one matches ───────────────────
 * • SOLID FILLED SILHOUETTE. No outline-only line art, no stroke-based
 *   icons in this family.
 * • TWO TONES, SPLIT DOWN THE VERTICAL CENTRE. --brand-lavender-light on
 *   the left, --brand-lavender on the right. Done with a clipPath over the
 *   same path, so the shading can never drift from the shape.
 * • ONE DARKER ACCENT, --brand-lavender-deep, and only one per icon. Never
 *   --brand-primary: it is far too dark for this set and whichever icon
 *   used it would pull the eye off the other two.
 * • DETAILS KNOCKED OUT IN WHITE — the shield's keyhole, the bin's slots,
 *   the padlock's window.
 * • NO BACKGROUND CIRCLE. The icon sits directly on the cream card.
 * • NEVER A SLASH, CROSS OR WARNING MARK. "Never shared" is said with a
 *   lock, not with a cancellation. A red-circle-slash on a privacy card
 *   reads as an error state, which is the opposite of reassurance.
 * • SEPARATION IS A HALO, NOT A CIRCLE. Where one element overlaps another
 *   it is traced with a 9-unit stroke in the CARD's background colour, so
 *   the gap follows the silhouette and no disc appears behind it.
 * • MATCHED MASS: roughly 58–72 units wide inside a 96 viewBox, bottom
 *   weighted. Nothing should draw the eye more than its neighbours.
 *
 * ⚠️ The halo tracks the card background, so it is --brand-cream-card, not
 * white. Moving these onto a different ground means changing `haloColor`,
 * not accepting a cream outline on a white card.
 */

export type BrandIllustrationName = "notShared";

const LAV = "var(--brand-lavender)";
const LAV_LIGHT = "var(--brand-lavender-light)";
const LAV_DEEP = "var(--brand-lavender-deep)";

export default function BrandIllustration({
  name,
  /*
   * The SAME height as the two file icons in TrustPrivacyCard, and that is
   * the point.
   *
   * This used to be h-[10rem]/h-[13.5rem] — deliberately larger, to buy back
   * mass the drawing was losing. It was losing it because the artwork filled
   * only about 64% of a square 96 box while guard_icon (132x153) and
   * bin_icon (104x122.9) fill roughly 90% of theirs, so at equal height this
   * one rendered visibly smaller and lighter than its neighbours. Scaling
   * the box up was treating the symptom: it made the SVG bigger without
   * making the drawing any denser, and the icon still read as the odd one
   * out.
   *
   * The viewBox is now 88x96 with the artwork spanning x 3-84 and y 6-90 —
   * about 92% by 88% — so matched height gives matched ink, and this can
   * use its neighbours' height verbatim. If you change the artwork, keep it
   * filling the box rather than reaching for a bigger class here.
   */
  className = "h-[9rem] w-auto sm:h-[12rem]",
  /** Must match the surface the icon sits on. See the halo rule above. */
  haloColor = "var(--brand-cream-card)",
}: {
  name: BrandIllustrationName;
  className?: string;
  haloColor?: string;
}) {
  if (name === "notShared") {
    return (
      <svg viewBox="0 0 88 96" className={className} aria-hidden>
        <defs>
          {/* Each element is split at ITS OWN centre, not the icon's, so the
              frame and the padlock each read as one lit object. A single
              split at the icon's centre would leave the padlock entirely on
              the dark side with no light face at all. */}
          <clipPath id="gr-illus-frame-half">
            <rect x="0" y="0" width="34" height="96" />
          </clipPath>
          <clipPath id="gr-illus-lock-half">
            <rect x="0" y="0" width="65" height="96" />
          </clipPath>
          {/*
            The halo is clipped to the frame it separates the padlock from.
            Without this it also traces the padlock's free edges, which sit
            over the page rather than over the frame — and a cream stroke on
            white is a visible ring around nothing. A halo only has a job
            where two shapes actually overlap.
          */}
          <clipPath id="gr-illus-frame-bounds">
            <rect x="3" y="6" width="62" height="46" rx="8" />
          </clipPath>
        </defs>

        {/* ── The photo frame ───────────────────────────────────────── */}
        <rect x="3" y="6" width="62" height="46" rx="8" fill={LAV} />
        <g clipPath="url(#gr-illus-frame-half)">
          <rect x="3" y="6" width="62" height="46" rx="8" fill={LAV_LIGHT} />
        </g>

        {/*
          The photograph, knocked straight out in white.

          There used to be a 50%-white rect across the whole frame interior
          before these shapes. It was meant to read as a recessed picture
          area; what it actually did was wash the frame to a pale grey while
          the shield and the bin either side stayed fully saturated, and it
          left the hills and sun barely legible because they were white on
          near-white. The set's rule is crisp white knock-outs on solid
          fill — the shield's keyhole and the bin's slots — so this is that,
          with no overlay.
        */}
        <path d="M10 45V38l10-10 8 8 8.5-9.5L58 45z" fill="#fff" />
        <circle cx="49" cy="20" r="4.5" fill="#fff" />

        {/* ── The halo, between frame and padlock ───────────────────── */}
        <g
          clipPath="url(#gr-illus-frame-bounds)"
          fill="none"
          stroke={haloColor}
          strokeWidth="9"
          strokeLinejoin="round"
          strokeLinecap="round"
        >
          <path d="M53 56v-6a12 12 0 0 1 24 0v6" />
          <rect x="46" y="56" width="38" height="34" rx="8" fill={haloColor} />
        </g>

        {/* ── The padlock ───────────────────────────────────────────── */}
        {/* The shackle is this icon's single darker accent. */}
        <path
          d="M53 56v-6a12 12 0 0 1 24 0v6"
          fill="none"
          stroke={LAV_DEEP}
          strokeWidth="6"
          strokeLinecap="round"
        />
        <rect x="46" y="56" width="38" height="34" rx="8" fill={LAV} />
        <g clipPath="url(#gr-illus-lock-half)">
          <rect x="46" y="56" width="38" height="34" rx="8" fill={LAV_LIGHT} />
        </g>
        <rect x="59.5" y="66" width="11" height="13" rx="3.5" fill="#fff" />
      </svg>
    );
  }

  return null;
}
