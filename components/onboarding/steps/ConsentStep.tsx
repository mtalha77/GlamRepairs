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

type PlanId = "free" | "clarity" | "transform";

const PLAN_COPY: Record<PlanId, { name: string; price: string }> = {
  free: { name: "Free", price: "Rs. 0" },
  clarity: { name: "Clarity", price: "Rs. 1,500" },
  transform: { name: "Transform", price: "Rs. 3,000" },
};

type ConsentContextValue = {
  privateReview: boolean;
  marketingConsent: boolean;
  setPrivateReview: (value: boolean) => void;
  setMarketingConsent: (value: boolean) => void;
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
    marketingConsent,
    setPrivateReview,
    setMarketingConsent,
  } = useConsent();
  const privateReviewError = useStepRequiredError(
    !privateReview,
    "This consent is required.",
  );
  const marketingConsentError = useStepRequiredError(
    !marketingConsent,
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
            checked={marketingConsent}
            onChange={setMarketingConsent}
            label="I agree that my photos will not be used for marketing or shared publicly without my separate written consent."
          />
          <StepRequiredError
            id="consent-marketing-error"
            message={marketingConsentError}
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
};

export default function ConsentStep({
  backHref = "/onboarding/step/24",
  nextHref = "/onboarding/complete",
}: ConsentStepProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [privateReview, setPrivateReview] = useStepAnswer<boolean>(
    "onboarding.consentPrivateReview",
    false,
  );
  const [marketingConsent, setMarketingConsent] = useStepAnswer<boolean>(
    "onboarding.consentMarketing",
    false,
  );
  const canSubmit = privateReview && marketingConsent;

  const ensureSessionId = useFunnelStore((state) => state.ensureSessionId);
  const unlockFlowStep = useFunnelStore((state) => state.unlockFlowStep);

  const onSubmit = async () => {
    if (!canSubmit || isSubmitting) return;

    setIsSubmitting(true);
    ensureSessionId();

    const store = useFunnelStore.getState();
    const planId = store.selectedPlan as PlanId | null;
    const plan = planId ? PLAN_COPY[planId] : null;

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
      planName: plan?.name,
      planPrice: plan?.price,
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
      planName: plan?.name ?? null,
      planPrice: plan?.price ?? null,
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
        marketingConsent,
        setPrivateReview,
        setMarketingConsent,
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
