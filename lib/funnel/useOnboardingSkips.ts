"use client";

import {
  type OnboardingSkips,
  NO_ONBOARDING_SKIPS,
} from "@/lib/funnel/funnelProgress";
import { useFunnelStore } from "@/lib/funnel/useFunnelStore";

/**
 * Which onboarding steps the current answers make irrelevant. Read by both
 * the nav (to jump over them) and the shell (to keep the progress indicator
 * counting a funnel of the right length), so the two can never disagree
 * about how many steps this user is actually walking through.
 */
export function useOnboardingSkips(): OnboardingSkips {
  const planPreselected = useFunnelStore((state) => state.planPreselected);
  const selectedPlan = useFunnelStore((state) => state.selectedPlan);
  const specialEvent = useFunnelStore(
    (state) => state.answers["booking.specialEvent"],
  );

  return {
    ...NO_ONBOARDING_SKIPS,
    skipPlanSelection: Boolean(planPreselected && selectedPlan),
    skipEventDate: specialEvent === "none",
  };
}
