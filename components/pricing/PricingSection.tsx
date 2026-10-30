import Link from "next/link";

import CurrencySwitcher from "@/components/pricing/CurrencySwitcher";
import PricingCard from "@/components/pricing/PricingCard";
import { getServerPricingRegion, getVisitorCountry } from "@/lib/pricing/geo";
import { listActivePricingRegions } from "@/lib/pricing/regions";
import { listOfferedPlans, PAID_PLAN_KEY } from "@/lib/plans/plansPublic";

type PricingSectionProps = {
  title?: string;
  subtitle?: string;
  showTrustLine?: boolean;
  /**
   * HANDOVER-22 §1 — the link to /sample-assessment, directly under the
   * cards. This is the moment the reader has just seen a number and is
   * asking what it buys, and the sample answers that better than any line
   * of copy on this section can.
   */
  showSampleLink?: boolean;
};

const defaultTitle = "Pricing";
const defaultSubtitle =
  "Skincare consultations built around your skin, not a one-size-fits-all routine.";

const trustLine =
  "Every paid assessment is manually reviewed by a certified aesthetics practitioner with a degree in Cosmetology & Dermatology Science.";

/**
 * HOTFIX-7 §1 — regional pricing.
 *
 * This is an async Server Component that calls getServerPricingRegion(),
 * which reads cookies()/headers(). That's what opts every route rendering
 * this section (the homepage and /pricing) out of static caching — trap (a)
 * in the handover: a statically cached pricing section would serve the
 * first visitor's currency to everyone after that. Do not memoize or hoist
 * the region lookup above this component in a way that could get cached.
 */
function currencyName(code: string): string {
  try {
    return new Intl.DisplayNames(["en"], { type: "currency" }).of(code) ?? code;
  } catch {
    return code;
  }
}

export default async function PricingSection({
  title = defaultTitle,
  subtitle = defaultSubtitle,
  showTrustLine = false,
  showSampleLink = false,
}: PricingSectionProps) {
  const [region, regions, visitorCountry] = await Promise.all([
    getServerPricingRegion(),
    listActivePricingRegions(),
    getVisitorCountry(),
  ]);
  // HANDOVER-62 Part 2: someone outside the quoted country is told what
  // they are looking at, rather than assuming it is their own currency.
  // Logged so demand by country shows up in the runtime logs.
  const elsewhere = visitorCountry !== null && visitorCountry !== region.code;
  if (elsewhere) console.info("[pricing] visitor outside a priced country", visitorCountry);
  // Only plans a visitor can actually buy today. Once the free tier's
  // `available_until` passes, `currently_offered` goes false and the card
  // stops rendering with no deploy — see HANDOVER-27 §1.3.
  const plans = await listOfferedPlans(region.code);

  return (
    <section
      id="pricing"
      className="bg-white px-4 pb-16 pt-10 sm:px-6 sm:pb-20 sm:pt-12 lg:px-10 lg:pb-24 lg:pt-14 xl:px-12"
    >
      <div className="mx-auto max-w-[86rem]">
        <header className="mx-auto max-w-2xl text-center">
          <h2 className="font-serif italic leading-[1.1] tracking-normal text-brand-primary text-[2.125rem] sm:text-5xl sm:leading-normal lg:text-[3.875rem]">
            {title}
          </h2>
          <p className="mt-4 font-sans leading-snug text-brand-ink text-base sm:mt-5 sm:text-lg lg:text-2xl">
            {subtitle}
          </p>
          <div className="mt-4 flex justify-center">
            <CurrencySwitcher region={region} regions={regions} />
          </div>
          {region.code !== "PK" ? (
            <p className="mt-3 font-sans text-sm text-brand-gray">
              Prices in {currencyName(region.currency)}. Paying from outside Pakistan is by international bank
              transfer: message us on WhatsApp and we will send the details.
            </p>
          ) : null}
        </header>

        {/*
          HANDOVER-27 §1.4 — two cards, not three, and the paid one dominates.

          The grid was `lg:grid-cols-3`. Dropping a plan and leaving that in
          place would have stretched two cards across three columns, which
          reads as a page missing something rather than as a page offering a
          choice. `[0.85fr_1.15fr]` gives the paid card the extra width, so
          the free tier reads as the sample it is and the paid plan reads as
          the product.

          It degrades correctly if the free tier expires: one plan in a
          two-column grid would look stranded, so a single card centres at
          its natural width instead.
        */}
        <div
          className={`mt-10 grid gap-6 sm:mt-12 lg:mt-14 lg:items-stretch lg:gap-5 xl:gap-6 ${
            plans.length > 1
              ? "mx-auto max-w-[68rem] lg:grid-cols-[0.85fr_1.15fr]"
              : "mx-auto max-w-[34rem]"
          }`}
        >
          {plans.map((plan) => (
            <PricingCard
              key={plan.planKey}
              plan={plan}
              featured={plan.planKey === PAID_PLAN_KEY && plans.length > 1}
            />
          ))}
        </div>

        {/* Handover 61 Part 9 (30 October 2026): the homepage comparison
            strip is gone, so this sentence is the route to the sample
            everywhere. The full comparison lives on /compare. */}
        {showSampleLink ? (
          <p className="mt-8 text-center text-sm leading-relaxed text-brand-ink sm:mt-10 sm:text-[0.9375rem]">
            Not sure what you get for that?{" "}
            <Link
              href="/sample-assessment"
              className="font-medium text-brand-primary underline underline-offset-4 hover:opacity-80"
            >
              Read a full sample assessment
            </Link>
            : the whole document, before you pay.
          </p>
        ) : null}

        {showTrustLine ? (
          <p className="mx-auto mt-10 max-w-3xl text-center text-sm leading-relaxed text-brand-gray sm:mt-12 sm:text-[0.9375rem]">
            {trustLine}
          </p>
        ) : null}
      </div>
    </section>
  );
}
