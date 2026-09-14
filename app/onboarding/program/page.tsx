import { redirect } from "next/navigation";

import { ONBOARDING_FORM } from "@/components/onboarding/onboardingConfig";

export default function ProgramIntroPage() {
  // Was hardcoded to step 2, which HANDOVER-22 §4 turned into plan selection.
  redirect(`/onboarding/step/${ONBOARDING_FORM.program}`);
}
