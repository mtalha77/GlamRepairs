/**
 * MERGED — replaces app/pricing/page.tsx.
 *
 * Three changes, all verified against the live site:
 *
 * 1. ⚠️ Title suffix stripped. The layout template appends "| GlamRepairs",
 *    so the old `title: "Pricing | GlamRepairs"` would render
 *    "Pricing | GlamRepairs | GlamRepairs".
 *
 * 2. Description was 55 characters — the shortest on the site. Now 155.
 *
 * 3. **An H1 was added.** Checked live: `/pricing` renders *zero* `<h1>`
 *    elements, which is one of the four "H1 tag missing or empty" errors.
 *
 *    The H1 has to live here rather than inside `PricingSection`, because that
 *    component is also rendered on the homepage — putting an H1 in it would
 *    give the homepage two competing H1s.
 */
import type { Metadata } from "next";
import FaqSection from "@/components/faq/FaqSection";
import PricingSection from "@/components/pricing/PricingSection";
import TestimonialsSection from "@/components/reviews/TestimonialsSection";
import JsonLd from "@/components/seo/JsonLd";
import { resolveFaqs } from "@/lib/faq";
import { getServerPricingRegion } from "@/lib/pricing/geo";
import { formatPlanPrice, getPaidPlan } from "@/lib/plans/plansPublic";
import { faqSchema, graph } from "@/lib/seo/schema";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "Compare our skin assessment plans. Each paid plan is read by a certified " +
    "practitioner and delivered as a written report you keep. One-time, no subscription.",
  alternates: { canonical: "/pricing" },
};

export default async function PricingPage() {
  // HANDOVER-13 §1/§2 — the FAQ list, the FAQPage markup and the price in
  // the cost answer all come from one place. The region is resolved here
  // rather than hardcoded: HOTFIX-7 made changing a price a database update,
  // and an FAQ quoting a stale number would quietly undo that.
  const region = await getServerPricingRegion();
  // HANDOVER-27 §1.2 — the paid price comes from `plans_public`, never from
  // pricing_regions.price_*, which are stale and still hold the old numbers.
  const paidPlan = await getPaidPlan(region.code);
  const faqs = resolveFaqs("pricing", {
    paid: paidPlan ? formatPlanPrice(paidPlan) : "",
    videoMinutes: paidPlan?.videoMinutes ?? 15,
  });

  return (
    <>
      <JsonLd data={graph(faqSchema(
        faqs.map((faq) => ({ question: faq.q, answer: faq.a })),
        "/pricing",
      ))} />
      <main>
        {/* Page H1. Sits above PricingSection, whose own heading is an h2. */}
        <header className="mx-auto max-w-3xl px-6 pt-10 text-center">
          <h1 className="font-[family-name:var(--font-playfair)] text-4xl leading-tight text-[#2a1140] md:text-5xl">
            Skin assessment plans
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-lg text-black/65">
            Skin Transform is read by a certified practitioner and comes back
            as a written report you keep, with a 15 minute video consultation
            included. One payment, no subscription.
          </p>
        </header>
        {/* HANDOVER-22 §5a/§3 — the comparison strip and the sample link
            belong here more than anywhere: this is the page where someone
            is looking at a number and deciding whether it is worth it. */}
        <PricingSection showCompareStrip showSampleLink />
        {/*
          HANDOVER-27 §1.2, §1.4 — FeaturesComparisonSection is gone.

          It was a hardcoded three-column table restating each tier's
          features: "do not hardcode feature bullets anywhere" is exactly
          what it did, and it is how a table can go on describing Skin
          Clarity after Clarity is retired.

          Nothing replaces it, deliberately. The cards above already render
          all fourteen features from `plan_features`, and the compare strip
          below answers "why you and not a clinic". With one paid plan and a
          free sample, a side-by-side tier table compares nothing a reader
          can act on — it existed to help someone choose between Clarity and
          Transform, and that choice no longer exists.
        */}
        {/* HANDOVER-12 §5 — after the price comparison, before the FAQ. */}
        <TestimonialsSection />
        <FaqSection faqs={faqs} />
      </main>
    </>
  );
}
