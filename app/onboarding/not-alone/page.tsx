import { redirect } from "next/navigation";

import { ONBOARDING_FORM } from "@/components/onboarding/onboardingConfig";

export default function NotAlonePage() {
  // Derived rather than hardcoded: HANDOVER-22 §4 inserted a step and this
  // file still pointed at the old number, which is how a renumber quietly
  // sends people to the wrong card.
  redirect(`/onboarding/step/${ONBOARDING_FORM.notAlone}`);
}
