"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { ONBOARDING_FORM } from "@/components/onboarding/onboardingConfig";
import { useOfferedPlans } from "@/components/onboarding/OfferedPlansContext";
import { useFunnelStore } from "@/lib/funnel/useFunnelStore";

/**
 * Handover 70 §2.3: every step after the plan step checks there is a plan on
 * arrival. A direct link, the back button or a cleared store can otherwise
 * reach the questionnaire with none, and the assessment would be submitted
 * for nothing in particular. A plan that is no longer offered (retired, or
 * left in the store from an old visit) counts as none.
 *
 * Runs after the store has rehydrated, so a returning visitor's saved plan
 * is seen before anything is decided.
 */
export default function RequirePlan() {
  const pathname = usePathname();
  const router = useRouter();
  const { offered } = useOfferedPlans();
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const finish = () => setHydrated(true);
    if (useFunnelStore.persist.hasHydrated()) {
      finish();
      return;
    }
    return useFunnelStore.persist.onFinishHydration(finish);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const step = Number(pathname.match(/^\/onboarding\/step\/(\d+)/)?.[1]);
    if (!Number.isInteger(step) || step <= ONBOARDING_FORM.earlyPlanSelection || step === ONBOARDING_FORM.planSelection) return;
    const { selectedPlan, setSelectedPlan, setPlanPreselected } = useFunnelStore.getState();
    if (selectedPlan && (offered as string[]).includes(selectedPlan)) return;
    if (selectedPlan) {
      setSelectedPlan(null);
      setPlanPreselected(false);
    }
    router.replace(`/onboarding/step/${ONBOARDING_FORM.earlyPlanSelection}?need=plan`);
  }, [hydrated, pathname, offered, router]);

  return null;
}
