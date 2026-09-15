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
   * Larger than the 9/12rem the two file icons use, and deliberately so.
   * Those are portrait artwork (132x153 and 104x123) that fills its box;
   * this is a landscape composition — frame and padlock side by side — in a
   * square 96 box, so at the same height it renders about a third shorter
   * and reads as the small one of the three. The extra height buys back the
   * mass. See the note on matched mass above.
   */
  className = "h-[10rem] w-auto sm:h-[13.5rem]",
  /** Must match the surface the icon sits on. See the halo rule above. */
  haloColor = "var(--brand-cream-card)",
}: {
  name: BrandIllustrationName;
  className?: string;
  haloColor?: string;
}) {
  if (name === "notShared") {
    return (
      <svg viewBox="0 0 96 96" className={className} aria-hidden>
        <defs>
          <clipPath id="gr-illus-frame-half">
            <rect x="0" y="0" width="37" height="96" />
          </clipPath>
          {/*
            The halo is clipped to the frame it separates the padlock from.
            Without this it also traces the padlock's lower edge, which hangs
            below the card onto the page — and a cream stroke on white is a
            visible ring around nothing. A halo only has a job where two
            shapes overlap.
          */}
          <clipPath id="gr-illus-frame-bounds">
            <rect x="8" y="17" width="58" height="44" rx="8" />
          </clipPath>
        </defs>
        <g transform="translate(0,7)">
          <rect x="8" y="17" width="58" height="44" rx="8" fill={LAV} />
          <g clipPath="url(#gr-illus-frame-half)">
            <rect
              x="8"
              y="17"
              width="58"
              height="44"
              rx="8"
              fill={LAV_LIGHT}
            />
          </g>
          <rect
            x="15"
            y="24"
            width="44"
            height="30"
            rx="4"
            fill="#fff"
            opacity=".5"
          />
          {/* The photograph inside the frame: hills and a sun, knocked out. */}
          <path d="M15 54V48L25 38l8 8 8.5-9.5L59 54z" fill="#fff" />
          <circle cx="50" cy="31" r="4.5" fill="#fff" />

          {/* The halo: the padlock's own silhouette traced in the card
              colour, so the gap between it and the frame follows the shape
              rather than sitting behind a disc. */}
          <g
            clipPath="url(#gr-illus-frame-bounds)"
            fill="none"
            stroke={haloColor}
            strokeWidth="9"
            strokeLinejoin="round"
            strokeLinecap="round"
          >
            <path d="M61 57V51a7 7 0 0 1 14 0v6" />
            <rect
              x="55"
              y="56"
              width="26"
              height="22"
              rx="6"
              fill={haloColor}
            />
          </g>

          {/* The shackle is this icon's single darker accent. */}
          <path
            d="M61 57V51a7 7 0 0 1 14 0v6"
            fill="none"
            stroke={LAV_DEEP}
            strokeWidth="5"
            strokeLinecap="round"
          />
          <rect x="55" y="56" width="26" height="22" rx="6" fill={LAV} />
          <path
            d="M61 56h-1a5 5 0 0 0-5 5v12a5 5 0 0 0 5 5h1z"
            fill={LAV_LIGHT}
          />
          <rect x="61.5" y="62" width="13" height="10" rx="3" fill="#fff" />
        </g>
      </svg>
    );
  }

  return null;
}
