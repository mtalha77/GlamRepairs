/**
 * HOTFIX 4 — full content rewrite. Component tree extended (see below); the
 * hero and "who reviews" components are the pre-existing ones with new copy,
 * plus four new sections for the content that did not exist on this page
 * before.
 *
 * Keyword targeting: primary "online skin consultation Pakistan"; secondary
 * "personalised skincare routine Pakistan", "skin assessment online",
 * "certified aesthetician Pakistan", "skincare for Pakistani skin".
 * Deliberately not "online dermatologist Pakistan" — that query carries
 * medical intent this service does not offer and cannot compete for against
 * the established doctor-marketplace platforms. See PR description for the
 * full strategy note.
 *
 * ⚠️ Credential accuracy: every mention of the reviewing practitioner on this
 * page says "Ayma Arif, BS Cosmetology & Dermatology Science" — never "Dr."
 * That title implies PMDC registration in a health context, which is not the
 * qualification held, and it undercuts the site's own Terms (no diagnosis, no
 * prescription). An overstated credential is an E-E-A-T liability, not an
 * asset, on a YMYL page. lib/seo/authors.ts carries the same correction.
 *
 * FAQ: ABOUT_FAQS in components/about/aboutContent.ts is the single source
 * for both the visible accordion below and (once available) the FAQPage
 * schema — they must never diverge. The current faqSchema() helper in
 * lib/seo/schema.ts has a fixed @id and no per-page id param, so the FAQ node
 * is intentionally NOT added to this page's JSON-LD yet; add
 * faqSchema(ABOUT_FAQS, "/about#faq") once that param ships.
 */
import type { Metadata } from "next";
import AboutHeroSection from "@/components/about/AboutHeroSection";
import WhatWeAreSection from "@/components/about/WhatWeAreSection";
import OurStorySection from "@/components/about/OurStorySection";
import HowItWorksSection from "@/components/about/HowItWorksSection";
import WhyPakistanSection from "@/components/about/WhyPakistanSection";
import WhatWeWontDoSection from "@/components/about/WhatWeWontDoSection";
import { ABOUT_FAQS } from "@/components/about/aboutContent";
import FaqSection from "@/components/home/FaqSection";
import Footer from "@/components/home/Footer";
import JsonLd from "@/components/seo/JsonLd";
import { breadcrumbSchema, graph } from "@/lib/seo/schema";

export const metadata: Metadata = {
  title: "About",
  description:
    "Glam Repairs provides online skin consultations in Pakistan — a personalised " +
    "skincare routine built for your skin, your climate and your budget, reviewed " +
    "by a certified aesthetics professional. No brand bias, no AI-generated advice.",
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  return (
    <>
      <JsonLd
        data={graph(
          breadcrumbSchema([
            { name: "Home", path: "/" },
            { name: "About", path: "/about" },
          ]),
        )}
      />
      <main>
        <AboutHeroSection />
        <WhatWeAreSection />
        <OurStorySection />
        <HowItWorksSection />
        <WhyPakistanSection />
        <WhatWeWontDoSection />
        <FaqSection items={ABOUT_FAQS} />
      </main>
      <Footer />
    </>
  );
}
