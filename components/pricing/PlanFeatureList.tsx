"use client";

import { useId, useState } from "react";

/**
 * A plan's inclusions, shortened on phones — HOTFIX-41 §2.
 *
 * The paid plan lists fourteen inclusions, which at 375px is about 900px of
 * ticks before the button. Below `sm` the first few show and the rest sit
 * behind one tap; from `sm` up every item always shows and the toggle does
 * not render.
 *
 * Every item stays in the DOM either way. Hidden ones are `display: none`
 * below `sm` until expanded, so crawlers, the desktop layout and anyone who
 * taps "Show all" get the complete list, and nothing is duplicated.
 */
export default function PlanFeatureList({
  features,
  visibleOnPhone = 5,
  icon,
}: {
  features: string[];
  visibleOnPhone?: number;
  icon: React.ReactNode;
}) {
  const [expanded, setExpanded] = useState(false);
  const listId = useId();
  const hiddenCount = Math.max(0, features.length - visibleOnPhone);

  return (
    <div className="flex flex-1 flex-col px-5 py-2 sm:px-6 sm:py-3">
      <ul id={listId} className="flex flex-col gap-3 sm:gap-3.5">
        {features.map((feature, i) => (
          <li
            key={feature}
            className={`items-start gap-2.5 ${
              expanded || i < visibleOnPhone ? "flex" : "hidden sm:flex"
            }`}
          >
            {icon}
            <span className="font-sans leading-snug text-brand-ink text-sm sm:text-[15px] lg:text-base">
              {feature}
            </span>
          </li>
        ))}
      </ul>
      {hiddenCount > 0 ? (
        <button
          type="button"
          aria-expanded={expanded}
          aria-controls={listId}
          onClick={() => setExpanded((v) => !v)}
          className="mt-2 inline-flex min-h-11 items-center self-start text-sm font-medium text-brand-primary underline underline-offset-4 sm:hidden"
        >
          {expanded
            ? "Show fewer"
            : `Show all ${features.length} inclusions`}
        </button>
      ) : null}
    </div>
  );
}
