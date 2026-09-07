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

const TOTAL_STEPS = ONBOARDING_TOTAL_STEPS;

const STEP_METADATA: Record<number, Metadata> = {
  1: {
    title: "Welcome | GlamRepairs",
    description: "Start your personalized skin guidance assessment.",
  },
  2: {
    title: "Your Program | GlamRepairs",
    description: "Learn what is included in your personalized skin guidance program.",
  },
  3: {
    title: "Skin Type | GlamRepairs",
    description: "Select your skin type to personalize your treatment program.",
  },
  4: {
    title: "Improve Areas | GlamRepairs",
    description: "Select the face areas you would like to improve.",
  },
  5: {
    title: "Skin Tone | GlamRepairs",
    description: "Select the color closest to your skin tone.",
  },
  6: {
    title: "Primary Concern | GlamRepairs",
    description: "Select your main skin concern to personalize your guidance.",
  },
  7: {
    title: "Concern Duration | GlamRepairs",
    description: "Tell us how long you have been dealing with your skin concern.",
  },
  8: {
    title: "Daily Routine | GlamRepairs",
    description: "Tell us about your daily skincare routine.",
  },
  9: {
    title: "Skincare Products | GlamRepairs",
    description: "Select the skincare products you currently use.",
  },
  10: {
    title: "You're Not Alone | GlamRepairs",
    description: "Join thousands who have found help with similar skin concerns.",
  },
  11: {
    title: "Treatment Fit | GlamRepairs",
    description: "See how well your personalized treatment program matches your skin profile.",
  },
  12: {
    title: "Location | GlamRepairs",
    description: "Share your location so we can tailor recommendations to your climate.",
  },
  13: {
    title: "Ingredients Fit | GlamRepairs",
    description: "See how well your treatment program matches your goals.",
  },
  14: {
    title: "About You | GlamRepairs",
    description: "Share a few basics to personalize your skin guidance report.",
  },
  15: {
    title: "Lifestyle | GlamRepairs",
    description: "Share sleep, water, stress, and diet habits that affect your skin.",
  },
  16: {
    title: "Improvement Goals | GlamRepairs",
    description: "Select what you hope Glam repair will help you improve.",
  },
  17: {
    title: "Skincare Journey Feelings | GlamRepairs",
    description: "Select how you want to feel during your glam skincare journey.",
  },
  18: {
    title: "Skin Condition Trend | GlamRepairs",
    description: "See how skin condition can worsen without glam.",
  },
  19: {
    title: "Special Event | GlamRepairs",
    description: "Select if you have a special event coming up.",
  },
  20: {
    title: "Event Date | GlamRepairs",
    description: "Tell us when your special event is.",
  },
  21: {
    title: "Plan Selection | GlamRepairs",
    description: "Choose your Clarity or Transform plan to continue.",
  },
  22: {
    title: "Photo Guide | GlamRepairs",
    description: "Learn how to take clear photos for an accurate skin assessment.",
  },
  23: {
    title: "Photo Upload | GlamRepairs",
    description: "Upload front face and concern area photos in clear, natural light.",
  },
  24: {
    title: "Skin Results Timeline | GlamRepairs",
    description: "See when most users notice skin improvements.",
  },
  25: {
    title: "Consent and Trust | GlamRepairs",
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
      title: `Step ${metaStep} | GlamRepairs`,
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
    stepNumber === 11 || stepNumber === 13 || stepNumber === 18
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
  if (stepNumber === ONBOARDING_FORM.planSelection) {
    const [region, regions] = await Promise.all([
      getServerPricingRegion(),
      listActivePricingRegions(),
    ]);
    return (
      <PlanSelectionStep
        backHref={backHref}
        nextHref={nextHref}
        region={region}
        regions={regions}
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

  const isIntroInfo =
    stepNumber === ONBOARDING_FORM.welcome ||
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
