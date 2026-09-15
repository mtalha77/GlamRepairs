/**
 * MERGED — replaces app/page.tsx.
 *
 * The component tree is untouched. The only change is the added `metadata`
 * export: the homepage previously had none at all, so it inherited the
 * layout's placeholder `title: "GlamRepairs" / description: "GlamRepairs"`.
 *
 * HANDOVER-13: the FAQ schema is now actually wired here — the previous
 * version of this comment described an intention, not code. `faqSchema()`
 * existed but had zero call sites, so no page on the site emitted FAQPage
 * markup. All four FAQ pages now do, each from the questions it renders.
 */
import type { Metadata } from "next";
import FaqSection from "@/components/faq/FaqSection";
import Hero from "@/components/home/Hero";
import LatestPostsSection from "@/components/home/LatestPostsSection";
import ProblemSection from "@/components/home/ProblemSection";
import SkinAssessment from "@/components/home/SkinAssessment";
import TrustPrivacySection from "@/components/home/TrustPrivacySection";
import WhatWeDoSection from "@/components/home/WhatWeDoSection";
import WhatYouGetSection from "@/components/home/WhatYouGetSection";
import PricingSection from "@/components/pricing/PricingSection";
import TestimonialsSection from "@/components/reviews/TestimonialsSection";
import JsonLd from "@/components/seo/JsonLd";
import { resolveFaqs } from "@/lib/faq";
import { getServerPricingRegion } from "@/lib/pricing/geo";
import { formatRegionPrice } from "@/lib/pricing/regions";
import { faqSchema, graph } from "@/lib/seo/schema";

export const metadata: Metadata = {
  // No `title` here on purpose — the layout's `default` already renders
  // "GlamRepairs — Online skin assessment, read by a certified practitioner".
  // Setting one here would replace that with a worse version.
  description:
    "Answer a few questions, send a few photos, and a certified practitioner " +
    "reads your skin and writes you a plan you keep. No clinic, no waiting room.",
  alternates: { canonical: "/" },
};

export default async function Home() {
  // HANDOVER-13 §1/§2 — the FAQ list, the FAQPage markup and the price in
  // the cost answer all come from one place. The region is resolved here
  // rather than hardcoded: HOTFIX-7 made changing a price a database update,
  // and an FAQ quoting a stale number would quietly undo that.
  const region = await getServerPricingRegion();
  const faqs = resolveFaqs("home", {
    clarity: formatRegionPrice(region, "clarity"),
    transform: formatRegionPrice(region, "transform"),
  });

  return (
    <>
      <JsonLd data={graph(faqSchema(
        faqs.map((faq) => ({ question: faq.q, answer: faq.a })),
        "/",
      ))} />
      <Hero />
      <SkinAssessment />
      <ProblemSection />
      <WhatWeDoSection />
      {/*
        HANDOVER-22 §1 — reviews now come BEFORE the plans.

        They used to sit after pricing, which meant the reader met the price
        with nothing behind it and the proof arrived once the decision was
        already made. Other people's experience is what makes a number
        readable, so it goes first.

        (This supersedes the HANDOVER-12 §5 placement, which put the same
        section after the value proposition and before the FAQ.)
      */}
      <TestimonialsSection />
      <PricingSection
        /*
         * HANDOVER-22 §1 — the headline reframes the price against what the
         * reader has already spent rather than against nothing. Almost
         * everyone arriving here has a shelf of products that did not work;
         * that is the comparison they are actually making.
         */
        title="Less than the products you already bought that didn't work"
        subtitle="No clinic. No commute. Just clarity."
        showTrustLine
        showSampleLink
        showCompareStrip
      />
      <TrustPrivacySection />
      <WhatYouGetSection />
      <FaqSection faqs={faqs} />
      {/* HOTFIX-10 §1a — sits above the footer CTA so the blog finally has
          an internal route in from the highest-authority page on the site. */}
      <LatestPostsSection />
    </>
  );
}
