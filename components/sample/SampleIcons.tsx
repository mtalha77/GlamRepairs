import type { SampleValueIcon } from "@/lib/sample/sampleAssessment";

/**
 * HANDOVER-23 §1.2 — the start of the illustration system.
 *
 * Inline SVG, no dependency and no network request, which is why §3 rules
 * out an icon library: every glyph here is smaller than the HTTP request
 * that would fetch it.
 *
 * ── The conventions, so the next one matches ─────────────────────────────
 * • 24×24 viewBox, 1.7px stroke, round caps and joins.
 * • Stroke is `currentColor` — never a hardcoded hex. The caller sets the
 *   colour, which is what lets the same glyph sit on cream, on white and on
 *   purple without a second copy.
 * • `fill="none"`. A filled shape at this weight reads as a different
 *   family.
 * • Decorative, so `aria-hidden`. The card's heading already says what the
 *   icon says; announcing both is noise to a screen reader.
 */

const ICON_PATHS: Record<SampleValueIcon, React.ReactNode> = {
  magnifier: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-4.3-4.3" />
      <path d="M8.5 11.5l1.8 1.8 3.4-3.6" />
    </>
  ),
  document: (
    <>
      <path d="M6 3h8l5 5v13a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" />
      <path d="M14 3v5h5" />
      <path d="M9 13h6M9 17h4" />
    </>
  ),
  chat: (
    <path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 8.6 8.6 0 0 1-3.9-.9L3 20.5l1.6-4.9A8.4 8.4 0 0 1 12 3.1a8.4 8.4 0 0 1 9 8.4z" />
  ),
  shield: (
    <>
      <path d="M12 3l7.5 3.4v5c0 4.4-3.1 8.5-7.5 9.6-4.4-1.1-7.5-5.2-7.5-9.6v-5z" />
      <path d="M8.8 12.2l2.2 2.2 4.2-4.4" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3.2 1.9" />
    </>
  ),
  star: (
    <path d="M12 3.5l2.4 5 5.4.8-3.9 3.8.9 5.4-4.8-2.6-4.8 2.6.9-5.4L4.2 9.3l5.4-.8z" />
  ),
};

export default function SampleIcon({
  name,
  className = "h-6 w-6",
}: {
  name: SampleValueIcon;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      {ICON_PATHS[name]}
    </svg>
  );
}
