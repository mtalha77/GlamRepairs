import Image from "next/image";
import Link from "next/link";

import { getOnboardingStartHref } from "@/lib/funnel/plans";
import {
  formatOfferEndDate,
  formatPlanPrice,
  PAID_PLAN_KEY,
  type PublicPlan,
} from "@/lib/plans/plansPublic";

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

/**
 * One plan card, rendered entirely from a `plans_public` row — HANDOVER-27.
 *
 * ── Every string here used to be a literal ───────────────────────────────
 * The name, tagline, CTA, badge and all fourteen feature bullets came from
 * components/pricing/pricingPlans.ts, which is deleted. Only the price came
 * from the database, which is precisely the split that broke: repricing
 * Transform from 3,500 to 3,000 changed the number while the bullets still
 * described the old tier, and retiring Clarity left a card describing a plan
 * that no longer existed.
 *
 * `features` is now a flat ordered array of strings from `plan_features`.
 * It is not title/description pairs any more — the old shape existed so the
 * card could render "Title (description)", which is a formatting decision
 * that belongs in the copy, not in a schema.
 *
 * ── The CTA is derived, not authored ─────────────────────────────────────
 * Two plans with one paid option do not need two hand-written CTAs, and a
 * stored one is another string to forget. The free card says "try", the paid
 * card says "start" — that is the only distinction that was ever load-bearing.
 */
export default function PricingCard({
  plan,
  featured = false,
}: {
  plan: PublicPlan;
  /**
   * Visual dominance, not a data property — HANDOVER-27 §1.4 asks for the
   * paid card to dominate rather than for two cards to be stretched across
   * a grid built for three. The caller decides, because on /compare the
   * same card appears in a context where nothing should be featured.
   */
  featured?: boolean;
}) {
  const isPaid = plan.planKey === PAID_PLAN_KEY;
  const ctaHref = getOnboardingStartHref(plan.planKey);
  const cta = isPaid ? "Get my skin assessment" : "Try it free";

  return (
    <article
      className={`flex h-full flex-col overflow-hidden rounded-[25px] bg-[#F6EDFF] ${
        featured
          ? "border-2 border-[#C38EBE] shadow-brand-lg"
          : "border border-white"
      }`}
    >
      <div className="p-3 sm:p-3.5">
        <div
          className={`relative overflow-hidden rounded-[20px] bg-[#F6EDFF] px-5 py-5 sm:px-6 sm:py-6 ${
            featured ? "border-2 border-[#A88EC3]" : ""
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
                {plan.label}
              </h3>
              {featured ? (
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
                    Everything included
                  </span>
                </div>
              ) : null}
            </div>

            {/* The price arrives already carrying its region's own symbol,
                which is stored per region ("Rs. " with a trailing space,
                "$" without). No "/monthly" — these are one-time payments,
                which is what the section's own copy promises. */}
            <p className="mt-4 font-serif not-italic leading-none tracking-[-2px] text-[#A88EC3] text-[2.5rem] sm:text-[3rem]">
              {plan.price === 0 ? "Free" : formatPlanPrice(plan)}
            </p>

            {/*
              HANDOVER-27 §1.3 — the end date, shown rather than left as a
              silent flag. The date does the work; nothing more dramatic is
              needed, and a countdown ticking down to a date the database can
              move is worse than the date itself.

              ⚠️ This is display only. Hiding the card when the offer closes
              is NOT the gate — `?plan=free` has to be rejected at the funnel
              entry too, or an old link walks straight past it.
            */}
            {plan.availableUntil && plan.currentlyOffered ? (
              <p className="mt-2 font-sans text-xs font-medium text-[#8a6d1f] sm:text-[13px]">
                Free until {formatOfferEndDate(plan.availableUntil)}.
              </p>
            ) : null}

            {plan.tagline ? (
              <p className="mt-4 font-serif italic leading-[1.3] tracking-[-0.44px] text-[#662D91] text-lg sm:text-[22px]">
                {plan.tagline}
              </p>
            ) : null}
          </div>
        </div>
      </div>

      <ul className="flex flex-1 flex-col gap-3 px-5 py-2 sm:gap-3.5 sm:px-6 sm:py-3">
        {plan.features.map((feature) => (
          <li key={feature} className="flex items-start gap-2.5">
            <CheckIcon />
            <span className="font-sans leading-snug text-[#242424] text-sm sm:text-[15px] lg:text-base">
              {feature}
            </span>
          </li>
        ))}
      </ul>

      <div className="px-5 pb-6 pt-3 sm:px-6 sm:pb-7 sm:pt-4">
        <Link
          href={ctaHref}
          className="subscribe-fill-btn flex w-full cursor-pointer items-center justify-center rounded-full bg-[#A88EC3] py-3.5 font-sans text-sm font-medium uppercase tracking-[0.04em] text-white sm:text-[15px]"
        >
          {cta}
        </Link>
      </div>
    </article>
  );
}
