import Link from "next/link";
import OnboardingShell from "@/components/onboarding/OnboardingShell";
import {
  ONBOARDING_PROGRESS,
  ONBOARDING_TOTAL_STEPS,
} from "@/components/onboarding/onboardingConfig";
import WelcomeHeroImage from "@/components/onboarding/WelcomeHeroImage";
import { StepHeader } from "@/components/steps";

export default function WelcomeScreen() {
  return (
    <OnboardingShell
      currentStep={ONBOARDING_PROGRESS.welcome}
      totalSteps={ONBOARDING_TOTAL_STEPS}
      footer={
        <Link
          href="/onboarding/program"
          className="subscribe-fill-btn min-h-12 inline-flex w-full items-center justify-center whitespace-nowrap rounded-full bg-brand-light px-4 py-3 text-center text-[11px] font-normal tracking-[0.08em] text-white sm:px-6 sm:py-3.5 sm:text-sm sm:tracking-[0.12em]"
        >
          Get My Skin Assessment →
        </Link>
      }
    >
      <WelcomeHeroImage />

      <StepHeader
        className="mt-7 text-center sm:mt-8"
        title="Welcome"
        titleClassName="font-serif text-[1.75rem] leading-none text-brand-primary sm:text-[2rem]"
        subtitle="Tell us what your skin is going through. We'll guide you with a simple, routine-based report."
        subtitleClassName="mx-auto mt-3 max-w-[18rem] text-sm font-normal leading-relaxed text-brand-ink sm:mt-3.5 sm:max-w-none sm:text-[0.9375rem]"
      />
    </OnboardingShell>
  );
}
