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
import Footer from "@/components/home/Footer";
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
      <PricingSection
        title="Start free. Glow on your own terms."
        subtitle="No clinic. No commute. Just clarity."
        showTrustLine
      />
      <TrustPrivacySection />
      <WhatYouGetSection />
      {/* HANDOVER-12 §5 — a trust beat directly after the value proposition
          and before the questions, which is where a reader decides whether
          to believe what they have just been told. */}
      <TestimonialsSection />
      <FaqSection faqs={faqs} />
      {/* HOTFIX-10 §1a — sits above the footer CTA so the blog finally has
          an internal route in from the highest-authority page on the site. */}
      <LatestPostsSection />
      <Footer />
    </>
  );
}
