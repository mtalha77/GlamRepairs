type SelectionIndicatorProps = {
  selected: boolean;
  unselectedBorder?: "default" | "lavender";
};

export default function SelectionIndicator({
  selected,
  unselectedBorder = "default",
}: SelectionIndicatorProps) {
  if (selected) {
    // HANDOVER-11 §3.1 — the check confirms the tap. This branch only renders
    // once `selected` flips, so the mount animation fires exactly once per
    // selection, with no state to track. Nothing waits on it: the funnel
    // advances on the user's own Next press, and holding navigation behind an
    // animation would make the form feel slower, not more responsive.
    return (
      <span className="selection-check-in flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-light">
        <svg
          aria-hidden
          viewBox="0 0 12 10"
          className="h-2.5 w-3"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M1 5.2L4.2 8.4L11 1.6"
            stroke="white"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
    );
  }

  return (
    <span
      className={`h-5 w-5 shrink-0 rounded-full border bg-white ${
        unselectedBorder === "lavender"
          ? "border-brand-lavender"
          : "border-brand-border-light"
      }`}
    />
  );
}
