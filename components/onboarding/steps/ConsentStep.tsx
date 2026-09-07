"use client";

import { useRouter } from "next/navigation";
import { createContext, useContext, useState } from "react";
import Link from "next/link";
import OnboardingShell from "@/components/onboarding/OnboardingShell";
import { ONBOARDING_PROGRESS } from "@/components/onboarding/onboardingConfig";
import { StepHeader, StepRequiredError } from "@/components/steps";
import { ONBOARDING_COMPLETE_UNLOCK } from "@/lib/funnel/funnelProgress";
import { useFunnelStore } from "@/lib/funnel/useFunnelStore";
import {
  useStepAnswer,
  useStepRequiredError,
} from "@/lib/funnel/useStepAnswer";
import { openWhatsAppWithMessage } from "@/lib/funnel/shareWhatsApp";
import { buildWhatsAppBookingSummaryText } from "@/lib/funnel/whatsapp";
import { submitLead } from "@/lib/leads/submitLead";
import {
  formatRegionPrice,
  priceForPlan,
  type PricingRegion,
} from "@/lib/pricing/regions";

type PlanId = "free" | "clarity" | "transform";

// HOTFIX-7 §1: names only — price comes from the region prop, resolved
// server-side from public.pricing_regions. Never hardcode it here again.
const PLAN_NAMES: Record<PlanId, string> = {
  free: "Free",
  clarity: "Clarity",
  transform: "Transform",
};

type ConsentContextValue = {
  privateReview: boolean;
  /**
   * HOTFIX-7 §3: renamed from consentMarketing. That name asserted the
   * opposite of what the checkbox says ("I agree that my photos will NOT
   * be used for marketing") — a filter for consentMarketing = true would
   * have emailed exactly the people who declined. See lib/studio/answers.ts
   * and lib/funnel/formatBookingSummary.ts for the matching label fix.
   */
  photoMarketingRestriction: boolean;
  setPrivateReview: (value: boolean) => void;
  setPhotoMarketingRestriction: (value: boolean) => void;
  canSubmit: boolean;
  isSubmitting: boolean;
  onSubmit: () => void;
};

const ConsentContext = createContext<ConsentContextValue | null>(null);

function useConsent() {
  const context = useContext(ConsentContext);
  if (!context) {
    throw new Error("useConsent must be used within ConsentStep");
  }
  return context;
}

function ConsentCheckbox({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
}) {
  return (
    <label
      className={`flex cursor-pointer items-start gap-3 rounded-2xl border px-4 py-3.5 transition-colors sm:gap-3.5 sm:px-5 sm:py-4 ${
        checked
          ? "border-brand-light bg-brand-light text-white"
          : "border-brand-border-light/60 bg-white text-brand-ink hover:border-brand-lavender"
      }`}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="sr-only"
      />
      <span
        className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-[4px] border ${
          checked
            ? "border-white bg-white text-brand-light"
            : "border-brand-light bg-white text-transparent"
        }`}
      >
        <svg
          aria-hidden
          viewBox="0 0 10 8"
          className="h-2 w-2.5"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M1 4.2L3.5 6.7L9 1.2"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      <span className="text-sm leading-relaxed sm:text-[0.9375rem]">{label}</span>
    </label>
  );
}

function ConsentFooter({ backHref }: { backHref: string }) {
  const { canSubmit, isSubmitting, onSubmit } = useConsent();
  const requestStepValidation = useFunnelStore(
    (state) => state.requestStepValidation,
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

      {canSubmit ? (
        <button
          type="button"
          onClick={onSubmit}
          disabled={isSubmitting}
          className="subscribe-fill-btn flex-1 rounded-full bg-brand-light px-6 py-3 text-center text-xs font-normal tracking-[0.08em] text-white disabled:cursor-wait disabled:opacity-70 sm:py-3.5 sm:text-sm"
        >
          {isSubmitting ? "Sending…" : "Agree & Send on WhatsApp"}
        </button>
      ) : (
        <button
          type="button"
          onClick={requestStepValidation}
          className="subscribe-fill-btn flex-1 rounded-full bg-brand-light px-6 py-3 text-center text-xs font-normal tracking-[0.08em] text-white sm:py-3.5 sm:text-sm"
        >
          Agree &amp; Send on WhatsApp
        </button>
      )}
    </div>
  );
}

function ConsentContent() {
  const {
    privateReview,
    photoMarketingRestriction,
    setPrivateReview,
    setPhotoMarketingRestriction,
  } = useConsent();
  const privateReviewError = useStepRequiredError(
    !privateReview,
    "This consent is required.",
  );
  const photoMarketingRestrictionError = useStepRequiredError(
    !photoMarketingRestriction,
    "This consent is required.",
  );

  return (
    <div>
      <StepHeader
        title="Consent and trust"
        subtitle="Your privacy matters. You're in control of your photos and data."
        subtitleClassName="mt-2 text-sm leading-relaxed text-brand-ink sm:mt-2.5 sm:text-[0.9375rem]"
      />

      <div className="mt-6 space-y-3 sm:mt-7 sm:space-y-3.5">
        <div>
          <ConsentCheckbox
            checked={privateReview}
            onChange={setPrivateReview}
            label="I understand that my photos and information will be reviewed privately by our certified aesthetics expert."
          />
          <StepRequiredError
            id="consent-private-review-error"
            message={privateReviewError}
          />
        </div>
        <div>
          <ConsentCheckbox
            checked={photoMarketingRestriction}
            onChange={setPhotoMarketingRestriction}
            label="I agree that my photos will not be used for marketing or shared publicly without my separate written consent."
          />
          <StepRequiredError
            id="consent-marketing-error"
            message={photoMarketingRestrictionError}
          />
        </div>
      </div>

      <p className="mt-5 text-xs leading-relaxed text-brand-gray sm:mt-6 sm:text-[0.8125rem]">
        After you agree, we&apos;ll open WhatsApp with all your answers and selected plan
        ready to send.
      </p>
    </div>
  );
}

type ConsentStepProps = {
  backHref?: string;
  nextHref?: string;
  region: PricingRegion;
};

export default function ConsentStep({
  backHref = "/onboarding/step/24",
  nextHref = "/onboarding/complete",
  region,
}: ConsentStepProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [privateReview, setPrivateReview] = useStepAnswer<boolean>(
    "onboarding.consentPrivateReview",
    false,
  );
  const [photoMarketingRestriction, setPhotoMarketingRestriction] =
    useStepAnswer<boolean>("onboarding.photoMarketingRestriction", false);
  const canSubmit = privateReview && photoMarketingRestriction;

  const ensureSessionId = useFunnelStore((state) => state.ensureSessionId);
  const unlockFlowStep = useFunnelStore((state) => state.unlockFlowStep);

  const onSubmit = async () => {
    if (!canSubmit || isSubmitting) return;

    setIsSubmitting(true);
    ensureSessionId();

    const store = useFunnelStore.getState();
    const planId = store.selectedPlan as PlanId | null;
    const planName = planId ? PLAN_NAMES[planId] : undefined;
    const planPrice = planId ? formatRegionPrice(region, planId) : undefined;

    const photos = Array.isArray(store.answers["onboarding.photos"])
      ? (store.answers["onboarding.photos"] as (string | null)[])
      : [];
    const photoDataUrls = photos.filter(
      (item): item is string =>
        typeof item === "string" && item.startsWith("data:"),
    );
    if (
      photoDataUrls.length === 0 &&
      typeof store.answers["booking.selfie"] === "string" &&
      store.answers["booking.selfie"].startsWith("data:")
    ) {
      photoDataUrls.push(store.answers["booking.selfie"]);
    }

    // Storage upload happens regardless — the funnel needs the photos on the
    // lead row. The result's image URLs are never fed into the WhatsApp
    // message below (see formatBookingSummary.ts for why).
    await submitLead({
      sessionId: store.sessionId,
      fullName: store.fullName || String(store.answers["onboarding.firstName"] ?? ""),
      email: store.email || String(store.answers["onboarding.email"] ?? ""),
      selectedPlan: store.selectedPlan,
      planName,
      planPrice,
      // HOTFIX-7 §1 — record what was quoted, not a server-side re-guess.
      pricingRegion: region.code,
      currency: region.currency,
      listPrice: planId ? priceForPlan(region, planId) : undefined,
      selfieDataUrl: photoDataUrls[0] ?? null,
      photoDataUrls,
      answers: store.answers,
    });

    const message = buildWhatsAppBookingSummaryText({
      answers: store.answers,
      fullName: store.fullName || String(store.answers["onboarding.firstName"] ?? ""),
      email: store.email || String(store.answers["onboarding.email"] ?? ""),
      sessionId: store.sessionId,
      selectedPlan: store.selectedPlan,
      planName: planName ?? null,
      planPrice: planPrice ?? null,
    });

    unlockFlowStep("onboarding", ONBOARDING_COMPLETE_UNLOCK);
    store.setPlanPreselected(false);
    openWhatsAppWithMessage(message);
    setIsSubmitting(false);
    router.push(nextHref);
  };

  return (
    <ConsentContext.Provider
      value={{
        privateReview,
        photoMarketingRestriction,
        setPrivateReview,
        setPhotoMarketingRestriction,
        canSubmit,
        isSubmitting,
        onSubmit,
      }}
    >
      <OnboardingShell
        currentStep={ONBOARDING_PROGRESS.consent}
        footer={<ConsentFooter backHref={backHref} />}
      >
        <ConsentContent />
      </OnboardingShell>
    </ConsentContext.Provider>
  );
}
