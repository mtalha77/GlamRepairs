"use client";

import { useState } from "react";
import { useFunnelStore } from "@/lib/funnel/useFunnelStore";
import { leadDisplayRef } from "@/lib/leads/displayRef";
import { buildScreenshotPrefill } from "@/lib/leads/paymentDetails";
import { getWhatsAppChatLink } from "@/lib/funnel/whatsapp";
import {
  formatRegionPrice,
  type FunnelPlanId,
  type PricingRegion,
} from "@/lib/pricing/regions";
import { PAYMENT } from "@/lib/seo/site";

const PLAN_NAMES: Record<FunnelPlanId, string> = {
  free: "Free",
  clarity: "Clarity",
  transform: "Transform",
};

function isPlanId(value: unknown): value is FunnelPlanId {
  return value === "free" || value === "clarity" || value === "transform";
}

function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      type="button"
      aria-label={`Copy ${label}`}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          window.setTimeout(() => setCopied(false), 1600);
        } catch {
          // Clipboard is unavailable (older mobile browsers, insecure
          // context). The value is on screen and selectable either way.
        }
      }}
      className="shrink-0 rounded-full border border-brand-border-light bg-white px-2.5 py-1 text-[0.6875rem] font-medium text-brand-gray transition-colors hover:border-brand-lavender hover:text-brand-primary"
    >
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

function DetailRow({
  label,
  value,
  copyable = false,
  mono = false,
}: {
  label: string;
  value: string;
  copyable?: boolean;
  mono?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-brand-border-light/50 py-2 last:border-b-0">
      <span className="shrink-0 text-xs text-brand-gray sm:text-[0.8125rem]">
        {label}
      </span>
      <span className="flex min-w-0 items-center gap-2">
        <span
          className={`truncate text-right text-sm text-brand-ink sm:text-[0.9375rem] ${
            mono ? "font-mono tracking-tight" : ""
          }`}
        >
          {value}
        </span>
        {copyable ? <CopyButton value={value} label={label} /> : null}
      </span>
    </div>
  );
}

/**
 * HANDOVER-9 §1 — the payment block on /onboarding/complete.
 *
 * Amount comes from the region (public.pricing_regions), never a hardcoded
 * number. The reference is derived from the session id — see
 * lib/leads/displayRef.ts for why it isn't a column — and is deliberately
 * the most prominent thing here: a bank transfer arrives as a name and an
 * amount, so without the reference in the transfer note reconciliation is
 * guesswork.
 *
 * The session id and plan are read straight off the funnel store, the same
 * way PlanSelectionStep and ConsentStep read them, rather than being copied
 * into local state inside an effect.
 */
export default function PaymentDetails({ region }: { region: PricingRegion }) {
  const sessionId = useFunnelStore((state) => state.sessionId);
  const selectedPlan = useFunnelStore((state) => state.selectedPlan);

  /**
   * HANDOVER-28 §1.1 — the SERVER's answer, not the code the client typed.
   *
   * This used to key on `giftCode` being present, and the comment here said
   * why: "the funnel has not read the row back at this point." It does now.
   * /api/leads returns `payment.showBankDetails`, computed from the row the
   * triggers produced, and ConsentStep stores it on submit.
   *
   * That closes the case the old approach got wrong in the other direction:
   * a code that was typed but turned out invalid (expired, already used,
   * self-redeemed) left the lead at full price while this component hid the
   * payment instructions, so the client was charged and never told how to
   * pay. Keying on the outcome fixes both directions at once.
   */
  const paymentOutcome = useFunnelStore((state) => state.paymentOutcome);

  const reference = leadDisplayRef(sessionId);
  const planId = isPlanId(selectedPlan) ? selectedPlan : null;

  // The free plan is never paid for, so the whole block would be nonsense.
  if (planId === "free") return null;

  if (paymentOutcome?.isGifted) {
    return (
      <section className="mt-6 rounded-2xl border-2 border-brand-light/70 bg-white px-4 py-4 text-left shadow-sm sm:mt-7 sm:px-5 sm:py-5">
        <h2 className="font-serif text-lg text-brand-primary sm:text-xl">
          Nothing to pay — this one is a gift
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-brand-ink sm:text-[0.9375rem]">
          Your assessment is covered. We&apos;ll be in touch on WhatsApp once
          a practitioner has read your photographs.
        </p>
        {reference ? (
          <p className="mt-3 text-sm text-brand-gray">
            Your reference is{" "}
            <span className="font-mono text-brand-ink">{reference}</span>.
          </p>
        ) : null}
      </section>
    );
  }

  const amount = planId ? formatRegionPrice(region, planId) : null;
  const planName = planId ? PLAN_NAMES[planId] : null;
  const whatsappHref = getWhatsAppChatLink(
    buildScreenshotPrefill({ amount, reference, planName }),
  );

  return (
    <section className="mt-6 rounded-2xl border-2 border-brand-light/70 bg-white px-4 py-4 text-left shadow-sm sm:mt-7 sm:px-5 sm:py-5">
      <h2 className="font-serif text-lg text-brand-primary sm:text-xl">
        Almost done — here&apos;s how to pay
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-brand-ink sm:text-[0.9375rem]">
        {amount ? (
          <>
            Transfer <strong className="font-semibold">{amount}</strong> to the
            account below, then send us the screenshot on WhatsApp so we can
            confirm it.
          </>
        ) : (
          <>
            Transfer your plan amount to the account below, then send us the
            screenshot on WhatsApp so we can confirm it.
          </>
        )}
      </p>

      {/* Approved disclosure — sits directly above the bank block so the
          personal account name is never a surprise at the payment step. */}
      <p className="mt-3 rounded-xl bg-brand-lavender/25 px-3.5 py-2.5 text-xs leading-relaxed text-brand-gray sm:text-[0.8125rem]">
        {PAYMENT.ownerDisclosure}
      </p>

      <div className="mt-3">
        <DetailRow label="Bank" value={PAYMENT.bank} />
        <DetailRow label="Title" value={PAYMENT.accountTitle} />
        <DetailRow
          label="Account"
          value={PAYMENT.accountNumber}
          copyable
          mono
        />
        <DetailRow label="IBAN" value={PAYMENT.iban} copyable mono />
        {amount ? <DetailRow label="Amount" value={amount} /> : null}
      </div>

      {reference ? (
        <div className="mt-4 rounded-xl border border-brand-light/60 bg-brand-light/10 px-3.5 py-3">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-brand-primary">
            Include this reference
          </p>
          <div className="mt-1.5 flex items-center justify-between gap-3">
            <span className="font-mono text-lg font-semibold tracking-tight text-brand-primary sm:text-xl">
              {reference}
            </span>
            <CopyButton value={reference} label="reference" />
          </div>
          <p className="mt-1.5 text-xs leading-relaxed text-brand-gray">
            Put it in the transfer note — it&apos;s how we match your payment
            to your assessment.
          </p>
        </div>
      ) : null}

      <a
        href={whatsappHref}
        target="_blank"
        rel="noopener noreferrer"
        className="subscribe-fill-btn min-h-12 mt-4 block w-full rounded-full bg-brand-light px-6 py-3 text-center text-xs font-normal uppercase tracking-[0.08em] text-white sm:py-3.5 sm:text-sm"
      >
        Send payment screenshot on WhatsApp
      </a>

      <p className="mt-3 text-xs leading-relaxed text-brand-gray sm:text-[0.8125rem]">
        We confirm payments within {PAYMENT.confirmationWindow}. Once
        confirmed, your assessment is written and sent within 24 hours.
      </p>
    </section>
  );
}
