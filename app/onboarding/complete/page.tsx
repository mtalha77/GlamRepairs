import type { Metadata } from "next";

import ThankYouStep from "@/components/onboarding/steps/ThankYouStep";
import { renderMarkdown } from "@/lib/blog/markdown";
import { getConsultationSettings } from "@/lib/consultation/slots";
import { getPlanSettings } from "@/lib/plans/planSettings";
import { getServerPricingRegion } from "@/lib/pricing/geo";

// Suffix-free: the root layout template appends "| GlamRepairs", so the
// old value rendered "Thank You | GlamRepairs | GlamRepairs" — the same
// fault /pricing already documents and fixed for itself.
export const metadata: Metadata = {
  title: "Thank You",
  description: "Your skin assessment submission has been received.",
};

/**
 * HANDOVER-9 §1 — the payment amount shown here has to be the one this
 * visitor was quoted, so the region is resolved per request. That read of
 * cookies()/headers() is also what keeps this route out of the static
 * cache, same as /pricing (see PricingSection.tsx).
 */
export default async function OnboardingCompletePage() {
  const [region, planSettings, consultation] = await Promise.all([
    getServerPricingRegion(),
    getPlanSettings(),
    getConsultationSettings(),
  ]);
  const videoPlans = Object.fromEntries(
    Object.values(planSettings)
      .filter((plan) => plan.includesVideoCall)
      .map((plan) => [plan.planKey, plan.videoMinutes ?? 15]),
  );
  return (
    <ThankYouStep
      region={region}
      consultation={{
        videoPlans,
        guidelinesHtml: consultation.guidelinesMarkdown ? renderMarkdown(consultation.guidelinesMarkdown) : "",
      }}
    />
  );
}
