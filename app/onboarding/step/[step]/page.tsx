import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import OnboardingIntroNav from "@/components/onboarding/OnboardingIntroNav";
import OnboardingShell from "@/components/onboarding/OnboardingShell";
import OnboardingStepContent from "@/components/onboarding/OnboardingStepContent";
import ConsentStep from "@/components/onboarding/steps/ConsentStep";
import PlanSelectionStep from "@/components/onboarding/steps/PlanSelectionStep";
import { UploadPhotosFooter } from "@/components/onboarding/steps/UploadPhotosStep";
import {
  getFormStepProgress,
  mapLegacyOnboardingStep,
  ONBOARDING_FORM,
  ONBOARDING_FORM_STEPS,
  ONBOARDING_TOTAL_STEPS,
} from "@/components/onboarding/onboardingConfig";
import { getServerPricingRegion } from "@/lib/pricing/geo";
import { listActivePricingRegions } from "@/lib/pricing/regions";
import { listOfferedPlans } from "@/lib/plans/plansPublic";

const TOTAL_STEPS = ONBOARDING_TOTAL_STEPS;

/**
 * Per-step titles, WITHOUT a "| GlamRepairs" suffix.
 *
 * The root layout declares `title.template` as "%s | GlamRepairs", so Next
 * appends the site name itself. Every entry here used to carry the suffix as
 * well, which rendered "Consent and Trust | GlamRepairs | GlamRepairs" in the
 * browser tab — verified on production before this change. These are noindex
 * pages so nothing was lost in search, but it was visible to anyone in the
 * funnel with more than one tab open.
 */
const STEP_METADATA: Record<number, Metadata> = {
  1: {
    title: "Welcome",
    description: "Start your personalized skin guidance assessment.",
  },
  2: {
    title: "Choose Your Plan",
    description:
      "Pick the plan that fits before you answer anything — no surprises later.",
  },
  3: {
    title: "Your Program",
    description: "Learn what is included in your personalized skin guidance program.",
  },
  4: {
    title: "Skin Type",
    description: "Select your skin type to personalize your treatment program.",
  },
  5: {
    title: "Improve Areas",
    description: "Select the face areas you would like to improve.",
  },
  6: {
    title: "Skin Tone",
    description: "Select the color closest to your skin tone.",
  },
  7: {
    title: "Primary Concern",
    description: "Select your main skin concern to personalize your guidance.",
  },
  8: {
    title: "Concern Duration",
    description: "Tell us how long you have been dealing with your skin concern.",
  },
  9: {
    title: "Daily Routine",
    description: "Tell us about your daily skincare routine.",
  },
  10: {
    title: "Skincare Products",
    description: "Select the skincare products you currently use.",
  },
  11: {
    title: "You're Not Alone",
    description: "Join thousands who have found help with similar skin concerns.",
  },
  12: {
    title: "Treatment Fit",
    description: "See how well your personalized treatment program matches your skin profile.",
  },
  13: {
    title: "Location",
    description: "Share your location so we can tailor recommendations to your climate.",
  },
  14: {
    title: "Ingredients Fit",
    description: "See how well your treatment program matches your goals.",
  },
  15: {
    title: "About You",
    description: "Share a few basics to personalize your skin guidance report.",
  },
  16: {
    title: "Lifestyle",
    description: "Share sleep, water, stress, and diet habits that affect your skin.",
  },
  17: {
    title: "Improvement Goals",
    description: "Select what you hope Glam repair will help you improve.",
  },
  18: {
    title: "Skincare Journey Feelings",
    description: "Select how you want to feel during your glam skincare journey.",
  },
  19: {
    title: "Skin Condition Trend",
    description: "See how skin condition can worsen without glam.",
  },
  20: {
    title: "Special Event",
    description: "Select if you have a special event coming up.",
  },
  21: {
    title: "Event Date",
    description: "Tell us when your special event is.",
  },
  22: {
    title: "Plan Selection",
    description: "Confirm your plan to continue.",
  },
  23: {
    title: "Photo Guide",
    description: "Learn how to take clear photos for an accurate skin assessment.",
  },
  24: {
    title: "Photo Upload",
    description: "Upload front face and concern area photos in clear, natural light.",
  },
  25: {
    title: "Skin Results Timeline",
    description: "See when most users notice skin improvements.",
  },
  26: {
    title: "Consent and Trust",
    description: "Review and agree to our privacy and photo usage terms.",
  },
};

type StepPageProps = {
  params: Promise<{ step: string }>;
};

export async function generateMetadata({ params }: StepPageProps): Promise<Metadata> {
  const { step } = await params;
  const stepNumber = Number(step);
  const legacy = mapLegacyOnboardingStep(stepNumber);
  const metaStep = legacy ?? stepNumber;

  return (
    STEP_METADATA[metaStep] ?? {
      // Suffix-free for the same reason as the entries above — the
      // layout template adds "| GlamRepairs".
      title: `Step ${metaStep}`,
      description: "Complete your personalized skin guidance assessment.",
    }
  );
}

export default async function OnboardingStepPage({ params }: StepPageProps) {
  const { step } = await params;
  const stepNumber = Number(step);

  if (!Number.isInteger(stepNumber) || stepNumber < 1) {
    notFound();
  }

  const legacyStep = mapLegacyOnboardingStep(stepNumber);
  if (legacyStep !== null) {
    redirect(`/onboarding/step/${legacyStep}`);
  }

  if (stepNumber > ONBOARDING_FORM_STEPS) {
    notFound();
  }

  const progressStep = getFormStepProgress(stepNumber);
  const backHref =
    stepNumber === 1 ? "/" : `/onboarding/step/${stepNumber - 1}`;
  const nextHref =
    stepNumber < ONBOARDING_FORM_STEPS
      ? `/onboarding/step/${stepNumber + 1}`
      : "/";

  const nextLabel =
    stepNumber === 12 || stepNumber === 14 || stepNumber === 19
      ? "Let's make it 100%"
      : stepNumber === ONBOARDING_FORM.welcome
        ? "Get My Skin Assessment →"
        : stepNumber === ONBOARDING_FORM_STEPS
          ? "Finish"
          : "Next";

  // HOTFIX-7 §1: resolved fresh per request (getServerPricingRegion() reads
  // cookies()/headers(), which is what keeps this route dynamic instead of
  // caching one visitor's currency for everyone — see PricingSection.tsx).
  // Only these two steps show a price, so only these two pay for the lookup.
  if (
    stepNumber === ONBOARDING_FORM.earlyPlanSelection ||
    stepNumber === ONBOARDING_FORM.planSelection
  ) {
    const [region, regions] = await Promise.all([
      getServerPricingRegion(),
      listActivePricingRegions(),
    ]);
    // HANDOVER-27 §1.4 — the plan list comes from `plans_public`, filtered
    // to what is currently offered, so a retired or expired plan is never
    // rendered as a choice.
    const plans = await listOfferedPlans(region.code);
    return (
      <PlanSelectionStep
        backHref={backHref}
        nextHref={nextHref}
        region={region}
        regions={regions}
        plans={plans}
        step={progressStep}
      />
    );
  }

  if (stepNumber === ONBOARDING_FORM.consent) {
    const region = await getServerPricingRegion();
    return (
      <ConsentStep
        backHref={backHref}
        nextHref="/onboarding/complete"
        region={region}
      />
    );
  }

  // Step 1 used to be a pure welcome screen with nothing to fill in, so its
  // Next was ungated. It now collects name, number and email, so it must gate
  // like any other input step — otherwise the whole point of moving contact
  // capture to the front is bypassable with one click.
  const isIntroInfo =
    stepNumber === ONBOARDING_FORM.program ||
    stepNumber === ONBOARDING_FORM.notAlone ||
    stepNumber === ONBOARDING_FORM.treatmentFit;

  return (
    <OnboardingShell
      currentStep={progressStep}
      totalSteps={TOTAL_STEPS}
      footer={
        stepNumber === ONBOARDING_FORM.uploadPhotos ? (
          <UploadPhotosFooter backHref={backHref} nextHref={nextHref} />
        ) : (
          <OnboardingIntroNav
            backHref={backHref}
            nextHref={nextHref}
            nextLabel={nextLabel}
            gated={!isIntroInfo}
          />
        )
      }
    >
      <OnboardingStepContent stepNumber={stepNumber} />
    </OnboardingShell>
  );
}
