/**
 * MERGED — replaces app/page.tsx.
 *
 * The component tree is untouched. The only change is the added `metadata`
 * export: the homepage previously had none at all, so it inherited the
 * layout's placeholder `title: "GlamRepairs" / description: "GlamRepairs"`.
 *
 * The FAQ schema is wired here rather than in the layout because FAQPage
 * markup must only appear on a page that actually shows those questions.
 * `FaqSection` renders on several routes; the homepage is the canonical home
 * for the FAQ, so it gets the structured data.
 */
import type { Metadata } from "next";
import FaqSection from "@/components/home/FaqSection";
import Footer from "@/components/home/Footer";
import Hero from "@/components/home/Hero";
import ProblemSection from "@/components/home/ProblemSection";
import SkinAssessment from "@/components/home/SkinAssessment";
import TrustPrivacySection from "@/components/home/TrustPrivacySection";
import WhatWeDoSection from "@/components/home/WhatWeDoSection";
import WhatYouGetSection from "@/components/home/WhatYouGetSection";
import PricingSection from "@/components/pricing/PricingSection";

export const metadata: Metadata = {
  // No `title` here on purpose — the layout's `default` already renders
  // "GlamRepairs — Online skin assessment, read by a certified practitioner".
  // Setting one here would replace that with a worse version.
  description:
    "Answer a few questions, send a few photos, and a certified practitioner " +
    "reads your skin and writes you a plan you keep. No clinic, no waiting room.",
  alternates: { canonical: "/" },
};

export default function Home() {
  return (
    <>
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
      <FaqSection />
      <Footer />
    </>
  );
}
