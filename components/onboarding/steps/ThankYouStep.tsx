"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import FunnelStepGuard from "@/components/funnel/FunnelStepGuard";
import OnboardingShell from "@/components/onboarding/OnboardingShell";
import { ONBOARDING_TOTAL_STEPS } from "@/components/onboarding/onboardingConfig";
import { getOnboardingFirstName } from "@/components/onboarding/onboardingStorage";
import PaymentDetails from "@/components/onboarding/PaymentDetails";
import { StepHeader } from "@/components/steps";
import { ONBOARDING_COMPLETE_UNLOCK } from "@/lib/funnel/funnelProgress";
import type { PricingRegion } from "@/lib/pricing/regions";

const nextSteps = [
  {
    number: "1",
    title: "Expert review",
    description: "Our certified expert reviews your photos and intake form",
  },
  {
    number: "2",
    title: "Personalized report",
    description: "Your personalized skin report is prepared",
  },
  {
    number: "3",
    title: "Report delivery",
    description: "You receive your report + routine within your plan's timeframe",
  },
  {
    number: "4",
    title: "Follow-up scheduled",
    description: "Your follow-up check-in is scheduled automatically",
  },
] as const;

function SuccessIcon() {
  return (
    <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-brand-success text-white sm:h-[4.5rem] sm:w-[4.5rem]">
      <svg
        aria-hidden
        viewBox="0 0 24 24"
        className="h-8 w-8 sm:h-9 sm:w-9"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M6 12.5L10 16.5L18 7.5"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}

function ContactNotice() {
  return (
    <div className="mx-auto mt-5 flex items-start gap-3 rounded-2xl bg-white px-4 py-3.5 text-left shadow-sm sm:mt-6 sm:gap-3.5 sm:px-5 sm:py-4">
      <span
        className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-lavender/40 text-brand-gray"
        aria-hidden
      >
        <svg
          viewBox="0 0 24 24"
          className="h-[1.125rem] w-[1.125rem]"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M7 9.5H17M7 13H13M6 19L7.5 15.5H18C19.1 15.5 20 14.6 20 13.5V7.5C20 6.4 19.1 5.5 18 5.5H6C4.9 5.5 4 6.4 4 7.5V17C4 18.1 4.9 19 6 19Z"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      <p className="text-sm leading-relaxed text-brand-gray sm:text-[0.9375rem]">
        We&apos;ll reach out via the contact details you provided. Keep an eye
        on your WhatsApp or email.
      </p>
    </div>
  );
}

/** The stored name never changes while this screen is mounted. */
function subscribeToNothing() {
  return () => {};
}

function getServerFirstName() {
  return "";
}

type ThankYouStepProps = {
  currentStep?: number;
  /**
   * HANDOVER-9 §1 — resolved server-side by the completion page so the
   * payment amount comes from public.pricing_regions for this visitor's
   * region rather than a hardcoded number.
   */
  region: PricingRegion;
};

export default function ThankYouStep({
  currentStep = ONBOARDING_TOTAL_STEPS,
  region,
}: ThankYouStepProps) {
  // The name lives in sessionStorage, which does not exist on the server.
  // useSyncExternalStore renders the empty server snapshot first and swaps
  // in the stored name on the client, without a hydration mismatch and
  // without setState-inside-an-effect.
  const firstName = useSyncExternalStore(
    subscribeToNothing,
    getOnboardingFirstName,
    getServerFirstName,
  );

  const headline = firstName ? `Thank you, ${firstName}!` : "Thank you!";

  return (
    <>
      <FunnelStepGuard flow="onboarding" step={ONBOARDING_COMPLETE_UNLOCK} />
      <OnboardingShell
      currentStep={currentStep}
      progressCompleted
      footer={
        <Link
          href="/"
          className="subscribe-fill-btn block w-full rounded-full bg-brand-light px-6 py-3 text-center text-xs font-normal uppercase tracking-[0.08em] text-white sm:py-3.5 sm:text-sm"
        >
          Back to Home
        </Link>
      }
    >
      <div className="text-center">
        <SuccessIcon />

        <StepHeader
          title={headline}
          subtitle="Your submission was successful."
          titleClassName="mt-5 font-serif text-[1.75rem] leading-tight text-brand-ink sm:mt-6 sm:text-[2rem]"
          subtitleClassName="mt-2 text-sm font-normal text-brand-ink sm:text-[0.9375rem]"
        />

        {/* HOTFIX-9 §3 — paying is the only thing the user still has to
            do, so it sits directly under the header, above the reassurance
            copy, rather than below it. */}
        <PaymentDetails region={region} />

        <p className="mx-auto mt-5 max-w-[20rem] text-sm leading-relaxed text-brand-gray sm:mt-6 sm:max-w-none sm:text-[0.9375rem]">
          Our certified expert will review your skin assessment and deliver your
          personalized report within 24 hours.
        </p>

        <ContactNotice />

        <div className="mt-6 text-left sm:mt-7">
          <h2 className="text-base font-semibold text-brand-ink sm:text-[1.0625rem]">
            What happens next
          </h2>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:gap-3.5">
            {nextSteps.map((step) => (
              <article
                key={step.number}
                className="rounded-2xl bg-white px-3.5 py-3.5 shadow-sm sm:px-4 sm:py-4"
              >
                <span className="text-lg font-medium leading-none text-brand-light sm:text-xl">
                  {step.number}
                </span>
                <h3 className="mt-2 text-sm font-semibold leading-snug text-brand-ink sm:text-[0.9375rem]">
                  {step.title}
                </h3>
                <p className="mt-1.5 text-xs leading-relaxed text-brand-gray sm:text-[0.8125rem]">
                  {step.description}
                </p>
              </article>
            ))}
          </div>
        </div>
      </div>
    </OnboardingShell>
    </>
  );
}
