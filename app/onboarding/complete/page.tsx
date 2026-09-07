import type { Metadata } from "next";

import ThankYouStep from "@/components/onboarding/steps/ThankYouStep";
import { getServerPricingRegion } from "@/lib/pricing/geo";

export const metadata: Metadata = {
  title: "Thank You | GlamRepairs",
  description: "Your skin assessment submission has been received.",
};

/**
 * HANDOVER-9 §1 — the payment amount shown here has to be the one this
 * visitor was quoted, so the region is resolved per request. That read of
 * cookies()/headers() is also what keeps this route out of the static
 * cache, same as /pricing (see PricingSection.tsx).
 */
export default async function OnboardingCompletePage() {
  const region = await getServerPricingRegion();
  return <ThankYouStep region={region} />;
}
