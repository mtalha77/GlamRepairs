/**
 * HANDOVER-23 §2.10 — the skeleton primitive.
 *
 * "Match the shape of what is arriving: cream rounded rectangles at the
 * real dimensions." The real dimensions part is the whole point — a
 * skeleton that is not the size of the content it stands in for causes the
 * page to jump when the content lands, which is worse than having shown
 * nothing. So callers pass explicit sizes rather than this guessing.
 *
 * `aria-hidden` on every piece, and the container that uses them carries
 * one `aria-busy` region with a text label, so a screen reader hears
 * "Loading customers" once instead of twelve nameless boxes.
 */
export function Skeleton({ className = "" }: { className?: string }) {
  return <div aria-hidden className={`gr-skeleton rounded-lg ${className}`} />;
}

/** A block of text lines, the last one short so it reads as a paragraph. */
export function SkeletonText({
  lines = 3,
  className = "",
}: {
  lines?: number;
  className?: string;
}) {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, index) => (
        <Skeleton
          key={index}
          className={`h-3.5 ${index === lines - 1 ? "w-2/3" : "w-full"}`}
        />
      ))}
    </div>
  );
}

/**
 * Wraps a skeleton screen so assistive technology is told what is coming
 * rather than left to interpret the shapes.
 */
export function SkeletonScreen({
  label,
  children,
  className = "",
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div role="status" aria-busy="true" aria-live="polite" className={className}>
      <span className="sr-only">{label}</span>
      {children}
    </div>
  );
}
