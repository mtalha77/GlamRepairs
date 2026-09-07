import {
  BOOKING_LAST_STEP,
} from "@/components/booking/bookingConfig";
import {
  ONBOARDING_FORM,
  ONBOARDING_FORM_STEPS,
} from "@/components/onboarding/onboardingConfig";
import type { FunnelFlow } from "@/lib/funnel/useFunnelStore";

/**
 * Steps the current answers make irrelevant, so navigation jumps over them.
 *
 * - planSelection (21): the plan was already chosen on /pricing.
 * - eventDate (20): the user said they have no event coming up, so asking
 *   for its date is a visible bug (HOTFIX-9 §1).
 */
export type OnboardingSkips = {
  skipPlanSelection: boolean;
  skipEventDate: boolean;
};

export const NO_ONBOARDING_SKIPS: OnboardingSkips = {
  skipPlanSelection: false,
  skipEventDate: false,
};

export function isSkippedOnboardingStep(
  step: number,
  skips: OnboardingSkips,
): boolean {
  if (skips.skipEventDate && step === ONBOARDING_FORM.eventDate) return true;
  if (skips.skipPlanSelection && step === ONBOARDING_FORM.planSelection) {
    return true;
  }
  return false;
}

/**
 * Walks past every skipped step in the given direction, so consecutive
 * skips chain correctly: with both a preselected plan and no event, step 19
 * Next has to clear 20 AND 21 and land on 22, and step 22 Back has to clear
 * 21 AND 20 and land on 19. Handling them as two independent adjustments
 * would stop after the first.
 */
export function adjustOnboardingHrefForSkips(
  href: string,
  direction: "next" | "back",
  skips: OnboardingSkips,
): string {
  const match = href.match(/^\/onboarding\/step\/(\d+)/);
  if (!match) return href;

  const delta = direction === "next" ? 1 : -1;
  let step = Number(match[1]);

  // Bounded by the step count — a malformed skip set can never spin here.
  for (let guard = 0; guard < ONBOARDING_FORM_STEPS; guard += 1) {
    if (!isSkippedOnboardingStep(step, skips)) break;
    step += delta;
  }

  if (step < 1 || step > ONBOARDING_FORM_STEPS) return href;
  return `/onboarding/step/${step}`;
}

/**
 * How many steps before `step` are being skipped — used to keep the progress
 * indicator truthful. A bar that jumps 19 → 21 out of 25 looks broken, so a
 * skipping user counts down a shorter funnel instead.
 */
export function countSkippedOnboardingStepsBefore(
  step: number,
  skips: OnboardingSkips,
): number {
  let skipped = 0;
  for (let candidate = 1; candidate < step; candidate += 1) {
    if (isSkippedOnboardingStep(candidate, skips)) skipped += 1;
  }
  return skipped;
}

/** Total steps this particular user actually walks through. */
export function onboardingTotalStepsFor(skips: OnboardingSkips): number {
  return (
    ONBOARDING_FORM_STEPS -
    countSkippedOnboardingStepsBefore(ONBOARDING_FORM_STEPS + 1, skips)
  );
}

/** Beyond last URL step — unlocks `/booking/report`. */
export const BOOKING_REPORT_UNLOCK = BOOKING_LAST_STEP + 1;

/** Beyond last form step — unlocks `/onboarding/complete`. */
export const ONBOARDING_COMPLETE_UNLOCK = ONBOARDING_FORM_STEPS + 1;

export function parseBookingProgressFromHref(href: string): number | null {
  if (href.startsWith("/booking/report")) return BOOKING_REPORT_UNLOCK;
  const match = href.match(/^\/booking\/step\/(\d+)/);
  if (!match) return null;
  const step = Number(match[1]);
  return Number.isInteger(step) ? step : null;
}

export function parseOnboardingProgressFromHref(href: string): number | null {
  if (href.startsWith("/onboarding/complete")) return ONBOARDING_COMPLETE_UNLOCK;
  const match = href.match(/^\/onboarding\/step\/(\d+)/);
  if (!match) return null;
  const step = Number(match[1]);
  return Number.isInteger(step) ? step : null;
}

export function resolveUnlockTarget(
  flow: FunnelFlow,
  href: string,
): number | null {
  return flow === "booking"
    ? parseBookingProgressFromHref(href)
    : parseOnboardingProgressFromHref(href);
}

export function fallbackStepPath(flow: FunnelFlow, unlockedStep: number) {
  // Booking funnel merged into onboarding — always recover into the single flow.
  if (flow === "booking") {
    return "/onboarding/step/1";
  }
  const step = Math.min(Math.max(unlockedStep, 1), ONBOARDING_FORM_STEPS);
  return `/onboarding/step/${step}`;
}
