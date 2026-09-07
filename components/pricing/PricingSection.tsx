import CurrencySwitcher from "@/components/pricing/CurrencySwitcher";
import PricingCard from "@/components/pricing/PricingCard";
import { pricingPlans } from "@/components/pricing/pricingPlans";
import { getServerPricingRegion } from "@/lib/pricing/geo";
import { formatRegionPrice, listActivePricingRegions } from "@/lib/pricing/regions";

type PricingSectionProps = {
  title?: string;
  subtitle?: string;
  showTrustLine?: boolean;
};

const defaultTitle = "Pricing";
const defaultSubtitle =
  "Skincare consultations built around your skin — not a one-size-fits-all routine.";

const trustLine =
  "Every paid assessment is manually reviewed by a certified aesthetics professional with a degree in Cosmetology & Dermatology Science.";

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
export default async function PricingSection({
  title = defaultTitle,
  subtitle = defaultSubtitle,
  showTrustLine = false,
}: PricingSectionProps) {
  const [region, regions] = await Promise.all([
    getServerPricingRegion(),
    listActivePricingRegions(),
  ]);

  return (
    <section
      id="pricing"
      className="bg-white px-4 pb-16 pt-10 sm:px-6 sm:pb-20 sm:pt-12 lg:px-10 lg:pb-24 lg:pt-14 xl:px-12"
    >
      <div className="mx-auto max-w-[86rem]">
        <header className="mx-auto max-w-2xl text-center">
          <h2 className="font-serif italic tracking-normal text-brand-primary text-[2.5rem] sm:text-5xl lg:text-[3.875rem]">
            {title}
          </h2>
          <p className="mt-4 font-sans leading-snug text-brand-ink text-base sm:mt-5 sm:text-lg lg:text-2xl">
            {subtitle}
          </p>
          <div className="mt-4 flex justify-center">
            <CurrencySwitcher region={region} regions={regions} />
          </div>
        </header>

        <div className="mt-10 grid gap-6 sm:mt-12 lg:mt-14 lg:grid-cols-3 lg:items-stretch lg:gap-5 xl:gap-6">
          {pricingPlans.map((plan) => (
            <PricingCard
              key={plan.name}
              {...plan}
              price={formatRegionPrice(region, plan.planId)}
            />
          ))}
        </div>

        {showTrustLine ? (
          <p className="mx-auto mt-10 max-w-3xl text-center text-sm leading-relaxed text-brand-gray sm:mt-12 sm:text-[0.9375rem]">
            {trustLine}
          </p>
        ) : null}
      </div>
    </section>
  );
}
