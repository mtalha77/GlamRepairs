"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import GiftCodeField from "@/components/onboarding/GiftCodeField";
import OnboardingShell from "@/components/onboarding/OnboardingShell";
import {
  ONBOARDING_FORM,
  ONBOARDING_PROGRESS,
} from "@/components/onboarding/onboardingConfig";
import CurrencySwitcher from "@/components/pricing/CurrencySwitcher";
import CredentialsBlock from "@/components/seo/CredentialsBlock";
import { StepHeader, StepRequiredError } from "@/components/steps";
import { resolveUnlockTarget } from "@/lib/funnel/funnelProgress";
import { useFunnelStore } from "@/lib/funnel/useFunnelStore";
import { useStepRequiredError } from "@/lib/funnel/useStepAnswer";
import { type PricingRegion } from "@/lib/pricing/regions";
import {
  formatOfferEndDate,
  formatPlanPrice,
  PAID_PLAN_KEY,
  type PlanKey,
  type PublicPlan,
} from "@/lib/plans/plansPublic";

/*
 * HANDOVER-27 §1.4 — plans come from `plans_public`, not from a literal.
 *
 * PLAN_META used to live here: three hardcoded names and highlight strings,
 * with only the price read from the database. That split is what broke —
 * retiring Clarity left this array offering it, and the highlights still
 * described a tier structure that no longer exists.
 *
 * The step is now closer to a confirmation than a choice: with one paid
 * option and a free tier, "Choose your plan" is really "the free sample or
 * the assessment". It still renders as a list rather than being removed,
 * because the free tier is a genuine second option while the offer is open
 * and because the step also runs as the pre-payment confirmation. When the
 * free offer closes, `listOfferedPlans` returns one plan and this collapses
 * to a single card the reader confirms.
 */

/** First few feature bullets, as the one-line highlight under a plan name. */
function highlightFor(plan: PublicPlan): string {
  return plan.features.slice(0, 3).join(" · ");
}

function PlanCard({
  name,
  price,
  highlights,
  note,
  selected,
  onSelect,
}: {
  name: string;
  price: string;
  highlights: string;
  /** e.g. the free tier's end date — HANDOVER-27 §1.3. */
  note?: string;
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
      {note ? (
        <p
          className={`mt-1.5 text-xs font-medium sm:text-[0.8125rem] ${
            selected ? "text-white/90" : "text-[#8a6d1f]"
          }`}
        >
          {note}
        </p>
      ) : null}
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
  /**
   * Plans currently on offer, resolved on the server from `plans_public`.
   * Already filtered by `currently_offered`, so an expired free tier never
   * reaches this list — HANDOVER-27 §1.3.
   */
  plans: PublicPlan[];
  /**
   * HANDOVER-22 §4 — this component now renders at two points in the funnel:
   * step 2 (the first real choice) and step 22 (the confirmation before
   * payment). The step number drives the progress bar and the wording, so
   * neither one has to lie about where the reader is.
   */
  step?: number;
};

export default function PlanSelectionStep({
  backHref = `/onboarding/step/${ONBOARDING_FORM.planSelection - 1}`,
  nextHref = `/onboarding/step/${ONBOARDING_FORM.planSelection + 1}`,
  region,
  regions,
  plans,
  step = ONBOARDING_PROGRESS.planSelection,
}: PlanSelectionStepProps) {
  const isEarly = step === ONBOARDING_FORM.earlyPlanSelection;
  const paidPlan = plans.find((p) => p.planKey === PAID_PLAN_KEY);
  const router = useRouter();
  const selectedPlan = useFunnelStore(
    (state) => state.selectedPlan,
  ) as PlanKey | null;
  const planPreselected = useFunnelStore((state) => state.planPreselected);
  const giftCode = useFunnelStore((state) => state.giftCode);
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
      currentStep={step}
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
          eyebrow={isEarly ? "Your plan" : "Plan Selection & Payment"}
          title={isEarly ? "Choose your plan" : "Confirm your plan"}
        />

        {/*
          HANDOVER-22 §4 — the price is shown before the questionnaire, not
          after it. Two of the three real abandonments happened at the steps
          immediately before the old reveal, so the cost of asking late is
          measured in lost clients, not in a worse first impression.
        */}
        {isEarly ? (
          <p className="mt-3 text-sm leading-relaxed text-brand-gray">
            Pick the one that fits. You can change it before you pay — nothing
            is charged yet.
          </p>
        ) : null}

        {/*
          HANDOVER-20 Part 2 — say the assessment is covered at the moment
          the prices appear. Someone who arrived through a gift link and then
          reads a price list assumes the gift did not apply, and the most
          likely next action is to close the tab.

          HANDOVER-27 §1.4 — this named Skin Clarity, which is retired. With
          one paid plan a gift covers it outright, so there is no topping up
          to explain any more and the copy gets simpler rather than needing
          a second sentence.
        */}
        {giftCode && paidPlan ? (
          <p className="mt-4 rounded-2xl border border-brand-primary/30 bg-brand-lavender/20 px-4 py-3 text-sm leading-relaxed text-brand-ink">
            <strong className="font-medium">Your gift covers this.</strong>{" "}
            {paidPlan.label} is already paid for, so there is nothing to pay.
          </p>
        ) : null}

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
              key={plan.planKey}
              name={plan.label}
              price={plan.price === 0 ? "Free" : formatPlanPrice(plan)}
              highlights={highlightFor(plan)}
              note={
                plan.availableUntil
                  ? `Free until ${formatOfferEndDate(plan.availableUntil)}.`
                  : undefined
              }
              selected={selectedPlan === plan.planKey}
              onSelect={() => {
                setSelectedPlan(plan.planKey);
                clearStepValidationAttempt();
              }}
            />
          ))}
        </div>
        {/*
          HANDOVER-28 §2.1 — somewhere to type a code, collapsed.

          Rendered on both passes of this step, not just the confirmation
          one. Someone holding a published code (AYESHA20 from an
          influencer's post) meets the price here first, and a price with no
          visible way to apply their code is a reason to close the tab. It
          collapses to a single link, and hides itself entirely once a code
          is applied or the reader arrived through a gift link.
        */}
        <GiftCodeField />

        <StepRequiredError message={planError} />
      </div>
    </OnboardingShell>
  );
}
