"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import OnboardingShell from "@/components/onboarding/OnboardingShell";
import { ONBOARDING_PROGRESS } from "@/components/onboarding/onboardingConfig";
import CurrencySwitcher from "@/components/pricing/CurrencySwitcher";
import CredentialsBlock from "@/components/seo/CredentialsBlock";
import { StepHeader, StepRequiredError } from "@/components/steps";
import { resolveUnlockTarget } from "@/lib/funnel/funnelProgress";
import { useFunnelStore } from "@/lib/funnel/useFunnelStore";
import { useStepRequiredError } from "@/lib/funnel/useStepAnswer";
import { formatRegionPrice, type PricingRegion } from "@/lib/pricing/regions";

type PlanId = "free" | "clarity" | "transform";

// HOTFIX-7 §1: names/highlights only — price comes from the region prop
// (public.pricing_regions), resolved server-side per request. Never
// hardcode a price back into this array.
const PLAN_META: {
  id: PlanId;
  name: string;
  highlights: string;
}[] = [
  {
    id: "free",
    name: "Free",
    highlights:
      "Skin concern quiz · Instant skin type result · Generic routine guide · Skin tips access",
  },
  {
    id: "clarity",
    name: "Clarity",
    highlights: "Manual expert review · Delivered in 24 hours · 1 follow-up at 2 weeks",
  },
  {
    id: "transform",
    name: "Transform",
    highlights:
      "Priority review in 24 hours · Week-by-week plan · 2 follow-ups · WhatsApp access",
  },
];

function PlanCard({
  name,
  price,
  highlights,
  selected,
  onSelect,
}: {
  name: string;
  price: string;
  highlights: string;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full rounded-[1.25rem] border p-4 text-left shadow-sm transition-colors sm:p-5 ${
        selected
          ? "border-brand-light bg-brand-light text-white"
          : "border-brand-border-light/60 bg-white text-brand-ink hover:border-brand-lavender"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span
            className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
              selected
                ? "border-white bg-white"
                : "border-brand-border-light bg-white"
            }`}
          >
            {selected ? <span className="h-2.5 w-2.5 rounded-full bg-brand-light" /> : null}
          </span>
          <span className="text-base font-semibold sm:text-lg">{name}</span>
        </div>
        <span
          className={`font-serif text-xl leading-none sm:text-2xl ${
            selected ? "text-white" : "text-brand-light"
          }`}
        >
          {price}
        </span>
      </div>
      <p
        className={`mt-3 text-sm leading-relaxed sm:text-[0.9375rem] ${
          selected ? "text-white/90" : "text-brand-gray"
        }`}
      >
        {highlights}
      </p>
    </button>
  );
}

function PlanSelectionFooter({
  backHref,
  nextHref,
  canContinue,
}: {
  backHref: string;
  nextHref: string;
  canContinue: boolean;
}) {
  const unlockFlowStep = useFunnelStore((state) => state.unlockFlowStep);
  const requestStepValidation = useFunnelStore(
    (state) => state.requestStepValidation,
  );
  const clearStepValidationAttempt = useFunnelStore(
    (state) => state.clearStepValidationAttempt,
  );

  return (
    <div className="flex items-center justify-between gap-4">
      <Link
        href={backHref}
        aria-label="Go back"
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-brand-border-light bg-white text-brand-gray shadow-sm transition-opacity hover:opacity-80"
      >
        <svg
          aria-hidden
          viewBox="0 0 16 16"
          className="h-4 w-4"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M10 3L5 8L10 13"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </Link>

      {canContinue ? (
        <Link
          href={nextHref}
          onClick={() => {
            clearStepValidationAttempt();
            const target = resolveUnlockTarget("onboarding", nextHref);
            if (target !== null) unlockFlowStep("onboarding", target);
          }}
          className="subscribe-fill-btn flex-1 rounded-full bg-brand-light px-6 py-3 text-center text-xs font-normal uppercase tracking-[0.15em] text-white sm:py-3.5 sm:text-sm"
        >
          Continue
        </Link>
      ) : (
        <button
          type="button"
          onClick={requestStepValidation}
          className="subscribe-fill-btn flex-1 rounded-full bg-brand-light px-6 py-3 text-center text-xs font-normal uppercase tracking-[0.15em] text-white sm:py-3.5 sm:text-sm"
        >
          Continue
        </button>
      )}
    </div>
  );
}

type PlanSelectionStepProps = {
  backHref?: string;
  nextHref?: string;
  region: PricingRegion;
  regions: PricingRegion[];
};

export default function PlanSelectionStep({
  backHref = "/onboarding/step/20",
  nextHref = "/onboarding/step/22",
  region,
  regions,
}: PlanSelectionStepProps) {
  const plans = PLAN_META.map((plan) => ({
    ...plan,
    price: formatRegionPrice(region, plan.id),
  }));
  const router = useRouter();
  const selectedPlan = useFunnelStore(
    (state) => state.selectedPlan,
  ) as PlanId | null;
  const planPreselected = useFunnelStore((state) => state.planPreselected);
  const setSelectedPlan = useFunnelStore((state) => state.setSelectedPlan);
  const unlockFlowStep = useFunnelStore((state) => state.unlockFlowStep);
  const clearStepValidationAttempt = useFunnelStore(
    (state) => state.clearStepValidationAttempt,
  );
  const planError = useStepRequiredError(
    selectedPlan === null,
    "Please select a plan.",
  );

  // Pricing already chose a plan — skip this step entirely.
  useEffect(() => {
    if (!planPreselected || !selectedPlan) return;
    const target = resolveUnlockTarget("onboarding", nextHref);
    if (target !== null) unlockFlowStep("onboarding", target);
    router.replace(nextHref);
  }, [
    planPreselected,
    selectedPlan,
    nextHref,
    router,
    unlockFlowStep,
  ]);

  if (planPreselected && selectedPlan) {
    return null;
  }

  return (
    <OnboardingShell
      currentStep={ONBOARDING_PROGRESS.planSelection}
      footer={
        <PlanSelectionFooter
          backHref={backHref}
          nextHref={nextHref}
          canContinue={selectedPlan !== null}
        />
      }
    >
      <div>
        <StepHeader
          eyebrow="Plan Selection & Payment"
          title="Choose your plan"
        />

        {/* HOTFIX-7 §1, trap (b) — geo set this region as the default;
            never hard-lock by it. A Pakistani student in Manchester, or
            someone in Lahore buying for family abroad, needs this. */}
        <div className="mt-3 flex justify-end">
          <CurrencySwitcher region={region} regions={regions} />
        </div>

        {/* HOTFIX-6 §1 — trust reassurance at the moment the reader is
            deciding whether to pay: who actually reviews this. */}
        <div className="mt-4 rounded-2xl border border-brand-border-light/60 bg-white px-4 py-3.5 sm:mt-5">
          <CredentialsBlock compact />
        </div>

        <div className="mt-6 space-y-3 sm:mt-7 sm:space-y-4">
          {plans.map((plan) => (
            <PlanCard
              key={plan.id}
              name={plan.name}
              price={plan.price}
              highlights={plan.highlights}
              selected={selectedPlan === plan.id}
              onSelect={() => {
                setSelectedPlan(plan.id);
                clearStepValidationAttempt();
              }}
            />
          ))}
        </div>
        <StepRequiredError message={planError} />
      </div>
    </OnboardingShell>
  );
}
