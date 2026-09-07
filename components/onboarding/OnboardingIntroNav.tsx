"use client";

import Link from "next/link";
import { useFunnelStore } from "@/lib/funnel/useFunnelStore";
import {
  getBookingNextStepNumber,
  getBookingPrevStepNumber,
} from "@/lib/funnel/bookingFlow";
import { BOOKING_FORM_STEPS } from "@/components/booking/bookingConfig";
import {
  adjustOnboardingHrefForSkips,
  resolveUnlockTarget,
} from "@/lib/funnel/funnelProgress";
import { useOnboardingSkips } from "@/lib/funnel/useOnboardingSkips";

type OnboardingIntroNavProps = {
  backHref: string;
  nextHref: string;
  nextLabel?: string;
  /**
   * When false, the step has no required answer to gate on (e.g. informational
   * steps) and the Next button is always enabled. Defaults to true so every
   * input step is required before continuing.
   */
  gated?: boolean;
  /**
   * Current booking step number. When set, the nav applies conditional
   * branching (skip ranges) to the back/next targets based on stored answers.
   */
  bookingStep?: number;
  /**
   * Which funnel progress to unlock on Next. Inferred from bookingStep when set.
   */
  flow?: "booking" | "onboarding";
};

export default function OnboardingIntroNav({
  backHref,
  nextHref,
  nextLabel = "Next",
  gated = true,
  bookingStep,
  flow = typeof bookingStep === "number" ? "booking" : "onboarding",
}: OnboardingIntroNavProps) {
  const currentStepValid = useFunnelStore((state) => state.currentStepValid);
  const answers = useFunnelStore((state) => state.answers);
  const skips = useOnboardingSkips();
  const unlockFlowStep = useFunnelStore((state) => state.unlockFlowStep);
  const requestStepValidation = useFunnelStore(
    (state) => state.requestStepValidation,
  );
  const canContinue = !gated || currentStepValid;

  let resolvedBackHref = backHref;
  let resolvedNextHref = nextHref;

  if (typeof bookingStep === "number") {
    const nextStep = getBookingNextStepNumber(bookingStep, answers);
    resolvedNextHref =
      nextStep > BOOKING_FORM_STEPS
        ? "/booking/report"
        : `/booking/step/${nextStep}`;

    const prevStep = getBookingPrevStepNumber(bookingStep, answers);
    if (prevStep !== null && prevStep >= 1) {
      resolvedBackHref = `/booking/step/${prevStep}`;
    } else if (bookingStep === 1) {
      resolvedBackHref = backHref;
    }
  } else if (flow === "onboarding") {
    // HOTFIX-9 §1 — jumps the event-date step when there is no event, and
    // still jumps the plan step when the plan came from /pricing. Both
    // directions, so Back never lands on a step Next just skipped.
    resolvedNextHref = adjustOnboardingHrefForSkips(
      resolvedNextHref,
      "next",
      skips,
    );
    resolvedBackHref = adjustOnboardingHrefForSkips(
      resolvedBackHref,
      "back",
      skips,
    );
  }

  const unlockNext = () => {
    const target = resolveUnlockTarget(flow, resolvedNextHref);
    if (target !== null) {
      unlockFlowStep(flow, target);
    }
  };

  return (
    <div className="flex items-center justify-between gap-4">
      <Link
        href={resolvedBackHref}
        aria-label="Go back"
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-brand-border-light bg-white text-brand-gray shadow-sm transition-opacity hover:opacity-80"
      >
        <svg
          aria-hidden
          viewBox="0 0 16 16"
          className="h-4 w-4"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M10 3L5 8L10 13"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </Link>

      {canContinue ? (
        <Link
          href={resolvedNextHref}
          onClick={unlockNext}
          className="subscribe-fill-btn inline-flex min-w-0 flex-1 items-center justify-center whitespace-nowrap rounded-full bg-brand-light px-4 py-3 text-[11px] font-normal uppercase tracking-[0.08em] text-white sm:px-12 sm:py-3.5 sm:text-sm sm:tracking-[0.15em]"
        >
          {nextLabel}
        </Link>
      ) : (
        <button
          type="button"
          onClick={requestStepValidation}
          className="subscribe-fill-btn inline-flex min-w-0 flex-1 items-center justify-center whitespace-nowrap rounded-full bg-brand-light px-4 py-3 text-[11px] font-normal uppercase tracking-[0.08em] text-white sm:px-12 sm:py-3.5 sm:text-sm sm:tracking-[0.15em]"
        >
          {nextLabel}
        </button>
      )}
    </div>
  );
}
