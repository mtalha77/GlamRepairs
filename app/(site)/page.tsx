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
import PricingSection from "@/components/pricing/PricingSection";
import TestimonialsSection from "@/components/reviews/TestimonialsSection";
import JsonLd from "@/components/seo/JsonLd";
import { resolveFaqs } from "@/lib/faq";
import { hasReviewingTeam } from "@/lib/practitioners/authorship";
import { getServerPricingRegion } from "@/lib/pricing/geo";
import { formatPlanPrice, getPaidPlan } from "@/lib/plans/plansPublic";
import { pageH1, pageMetadata } from "@/lib/seo/pageSeo";
import { faqSchema, graph } from "@/lib/seo/schema";

/*
 * HANDOVER-45 — title, description and H1 come from `page_seo` ('/'), edited
 * in Studio → SEO. The strings below are only the fallback for a missing
 * row or a failed read.
 */
export async function generateMetadata(): Promise<Metadata> {
  return pageMetadata("/", {
    title: "Online Skin Assessment Pakistan, Read by Hand",
    description:
      "Answer a few questions, send a few photos, and a certified practitioner " +
      "reads your skin and writes you a plan you keep. No clinic, no waiting room.",
  });
}

export default async function Home() {
  // HANDOVER-13 §1/§2 — the FAQ list, the FAQPage markup and the price in
  // the cost answer all come from one place. The region is resolved here
  // rather than hardcoded: HOTFIX-7 made changing a price a database update,
  // and an FAQ quoting a stale number would quietly undo that.
  const region = await getServerPricingRegion();
  // HANDOVER-27 §1.2 — the paid price comes from `plans_public`, never from
  // pricing_regions.price_*, which are stale and still hold the old numbers.
  const paidPlan = await getPaidPlan(region.code);
  const faqs = resolveFaqs(
    "home",
    {
      paid: paidPlan ? formatPlanPrice(paidPlan) : "",
      videoMinutes: paidPlan?.videoMinutes ?? 15,
    },
    { team: await hasReviewingTeam() },
  );

  return (
    <>
      <JsonLd data={graph(faqSchema(
        faqs.map((faq) => ({ question: faq.q, answer: faq.a })),
        "/",
      ))} />
      <Hero h1={await pageH1("/", "Everyone Deserves Healthy Skin")} />
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
      <FaqSection faqs={faqs} />
      {/* HOTFIX-10 §1a — sits above the footer CTA so the blog finally has
          an internal route in from the highest-authority page on the site. */}
      <LatestPostsSection />
    </>
  );
}
