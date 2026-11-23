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
 * The shield and the bin stay as the SVG files they already were. Only the
 * middle card is drawn here.
 *
 * ── The language, written down so the next one matches ───────────────────
 * • SOLID FILLED SILHOUETTE. No outline-only line art, no stroke-based
 *   icons in this family.
 * • TWO TONES. A --brand-icon-face over a --brand-icon-body, done by drawing the light half as its own path over the full
 *   silhouette, so the shading can never drift from the shape.
 * • ONE DARKER ACCENT TONE, --brand-icon-accent, and only that one. Never
 *   --brand-primary: it is far too dark for this set and whichever icon
 *   used it would pull the eye off the other two.
 * • DETAILS KNOCKED OUT IN WHITE — the shield's keyhole, the bin's slots,
 *   the eye's iris ring.
 * • NO BACKGROUND CIRCLE. The icon sits directly on the cream card.
 * • ONE OBJECT PER ICON. The old frame-plus-padlock was two shapes and the
 *   only icon in the row without a single closed silhouette; Talha's
 *   23 Nov design replaced it with an eye-off. The strike is in the set's
 *   own accent tone, never red: a red slash reads as an error state.
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

import { useId } from "react";

const BODY = "var(--brand-icon-body)";
const FACE = "var(--brand-icon-face)";
const RIM = "var(--brand-icon-rim)";
const ACCENT = "var(--brand-icon-accent)";

const EYE =
  "M80 48c29 0 50 20 58 34-8 14-29 34-58 34s-50-20-58-34c8-14 29-34 58-34z";

export default function BrandIllustration({
  name,
  /*
   * Sized by WIDTH against its neighbours, not height. The eye is a wide
   * shape (viewBox ratio about 1.27) where guard_icon and bin_icon are tall,
   * so at their height it would carry far more ink than either. These
   * heights make it render about as wide as the shield (guard_icon is
   * 132x153, so 10.4rem wide at 12rem tall). TrustPrivacyCard centres every
   * icon on the card's bottom edge, so a shorter box still sits on the same
   * line.
   */
  className = "h-[4.5rem] w-auto sm:h-[8.25rem]",
  /**
   * Must match the surface the icon sits on: it is the casing that lets the
   * strike cut cleanly through the eye. On any other ground, pass that
   * ground's colour, or the cut shows as a cream band.
   */
  haloColor = "var(--brand-cream-card)",
}: {
  name: BrandIllustrationName;
  className?: string;
  haloColor?: string;
}) {
  const clipId = useId();
  if (name === "notShared") {
    return (
      <svg viewBox="18 33 124 98" className={className} aria-hidden>
        <defs>
          {/* The casing only has a job where the strike crosses the eye.
              Unclipped, its ends hang below the card onto white and show as
              a cream band. Scaled slightly so it also cuts the rim. */}
          <clipPath id={clipId}>
            <path d={EYE} transform="translate(80 82) scale(1.08) translate(-80 -82)" />
          </clipPath>
        </defs>
        {/* The eye: full silhouette in the body tone, the upper half as the
            light face, then a soft rim, same depth read as the shield. */}
        <path d={EYE} fill={BODY} />
        <path d="M80 48c-29 0-50 20-58 34h116c-8-14-29-34-58-34z" fill={FACE} />
        <path d={EYE} fill="none" stroke={RIM} strokeWidth="5" strokeLinejoin="round" />
        <circle cx="80" cy="82" r="21" fill="white" />
        <circle cx="80" cy="82" r="11" fill={ACCENT} />

        {/* The strike: a casing in the card colour first, then the bar, so
            it cuts through the eye instead of sitting on top of it. */}
        <path
          d="M40 42l80 80"
          stroke={haloColor}
          strokeWidth="16"
          strokeLinecap="round"
          clipPath={`url(#${clipId})`}
        />
        <path d="M40 42l80 80" stroke={ACCENT} strokeWidth="9" strokeLinecap="round" />
      </svg>
    );
  }

  return null;
}
