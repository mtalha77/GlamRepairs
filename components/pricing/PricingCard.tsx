import Image from "next/image";
import Link from "next/link";
import type { FunnelPlanId } from "@/lib/funnel/plans";
import { getOnboardingStartHref } from "@/lib/funnel/plans";

type PricingFeature = {
  title: string;
  description: string;
};

type PricingCardProps = {
  planId: FunnelPlanId;
  name: string;
  price: string;
  cta: string;
  description: string;
  features: PricingFeature[];
  exclusions?: string;
  badge?: string;
};

const crownIcon = "/svgs/Group 2085660721.svg";

function CheckIcon() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 16 12"
      className="mt-1 h-3 w-3.5 shrink-0 text-brand-success sm:h-3.5 sm:w-4"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M1 6.2L5.4 10.6L15 1"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function formatFeatureText(feature: PricingFeature) {
  if (feature.description) {
    return `${feature.title} (${feature.description})`;
  }

  return feature.title;
}

export default function PricingCard({
  planId,
  name,
  price,
  cta,
  description,
  features,
  exclusions,
  badge,
}: PricingCardProps) {
  const isFeatured = Boolean(badge);
  const ctaHref = getOnboardingStartHref(planId);
  const ctaClassName =
    "subscribe-fill-btn flex w-full cursor-pointer items-center justify-center rounded-full bg-[#A88EC3] py-3.5 font-sans text-sm font-medium uppercase tracking-[0.04em] text-white sm:text-[15px]";

  return (
    <article
      className={`flex h-full flex-col overflow-hidden rounded-[25px] bg-[#F6EDFF] ${
        isFeatured ? "border-2 border-[#C38EBE]" : "border border-white"
      }`}
    >
      <div className="p-3 sm:p-3.5">
        <div
          className={`relative overflow-hidden rounded-[20px] bg-[#F6EDFF] px-5 py-5 sm:px-6 sm:py-6 ${
            isFeatured ? "border-2 border-[#A88EC3]" : ""
          }`}
        >
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "radial-gradient(130% 95% at 50% -8%, #FFFFFF 0%, #EFE2FB 42%, #F6EDFF 100%)",
            }}
          />
          <div className="relative z-10">
            <div className="flex items-start justify-between gap-3">
              <h3 className="rounded-full bg-[#F6EDFF] px-3.5 py-1 font-serif text-xs italic text-[#662D91] sm:px-4 sm:text-[13px]">
                {name}
              </h3>
              {badge ? (
                <div className="inline-flex shrink-0 items-center gap-1.5">
                  <Image
                    src={crownIcon}
                    alt=""
                    width={23}
                    height={20}
                    className="h-4 w-auto sm:h-5"
                    aria-hidden
                  />
                  <span className="rounded-full bg-[#f5d042] px-2.5 py-1 text-[10px] font-semibold text-brand-ink sm:px-3 sm:text-[11px]">
                    {badge}
                  </span>
                </div>
              ) : null}
            </div>

            {/* HOTFIX-7 §1: `price` now arrives fully formatted with its
                region's own symbol (formatRegionPrice) — a hardcoded "Rs"
                suffix here would be wrong for every non-PKR region, and
                "/monthly" was wrong for every region: these are one-time
                payments (see the page's own "One payment, no subscription"
                copy). */}
            <p className="mt-4 font-serif not-italic leading-none tracking-[-2px] text-[#A88EC3] text-[2.5rem] sm:text-[3rem]">
              {price}
            </p>

            <p className="mt-4 font-serif italic leading-[1.3] tracking-[-0.44px] text-[#662D91] text-lg sm:text-[22px]">
              {description}
            </p>
          </div>
        </div>
      </div>

      <ul className="flex flex-1 flex-col gap-3 px-5 py-2 sm:gap-3.5 sm:px-6 sm:py-3">
        {features.map((feature) => (
          <li key={feature.title} className="flex items-start gap-2.5">
            <CheckIcon />
            <span className="font-sans leading-snug text-[#242424] text-sm sm:text-[15px] lg:text-base">
              {formatFeatureText(feature)}
            </span>
          </li>
        ))}
      </ul>

      <div className="px-5 pb-6 pt-3 sm:px-6 sm:pb-7 sm:pt-4">
        {exclusions ? (
          <p className="mb-3 text-center font-sans text-xs italic text-black/45 sm:mb-4 sm:text-sm">
            {exclusions}
          </p>
        ) : null}

        <Link href={ctaHref} className={ctaClassName}>
          {cta}
        </Link>
      </div>
    </article>
  );
}
