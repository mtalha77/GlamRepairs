export const stepTitleClassName = {
  lg: "font-serif text-[1.75rem] leading-tight text-brand-ink sm:text-[2rem]",
  sm: "font-serif text-[1.35rem] leading-snug text-brand-ink sm:text-[1.5rem]",
  statement:
    "font-serif text-[1.75rem] leading-snug text-brand-ink sm:mt-4 sm:text-[2rem]",
} as const;

export const stepSubtitleClassName =
  "mt-3 text-sm leading-relaxed text-brand-gray sm:mt-4 sm:text-[0.9375rem]";

export const stepEyebrowClassName =
  "text-xs font-medium uppercase tracking-[0.12em] text-brand-light";

/**
 * HANDOVER-11 §3.1 — selection feedback for every choice card in the funnel.
 *
 * `transition-colors` alone could not animate the selected scale, so the
 * transition is widened to name transform explicitly. 1.02 is the whole
 * effect: on a ~28rem card that is about 9px, comfortably inside the shell's
 * 28px padding, so a selected card lifts out of the list without the list
 * reflowing around it. Cards are the one control in this funnel the user
 * touches 25 times; it is worth the two properties.
 */
export const choiceCardBaseClassName =
  "flex w-full rounded-2xl border bg-white text-left shadow-sm transition-[color,background-color,border-color,box-shadow,transform] duration-200 ease-[cubic-bezier(0.2,0.7,0.3,1)] motion-reduce:transition-none";

export const choiceCardSelectedClassName =
  "border-brand-light ring-1 ring-brand-light scale-[1.02] motion-reduce:scale-100";

export const choiceCardUnselectedClassName =
  "border-brand-border-light/60 hover:border-brand-lavender";

export const choiceLabelClassName = {
  default: "text-sm text-brand-ink sm:text-[0.9375rem]",
  snug: "text-sm leading-snug text-brand-ink sm:text-[0.9375rem]",
} as const;

export const stepListSpacingClassName = {
  default: "space-y-3 sm:space-y-3.5",
  compact: "space-y-2.5 sm:space-y-3",
} as const;

export const stepBodySpacingClassName = {
  default: "mt-6 sm:mt-7",
  sm: "mt-5 sm:mt-6",
  lg: "mt-8 sm:mt-10",
} as const;
