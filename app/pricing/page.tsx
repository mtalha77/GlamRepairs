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
import Footer from "@/components/home/Footer";
import FaqSection from "@/components/faq/FaqSection";
import Navbar from "@/components/home/Navbar";
import FeaturesComparisonSection from "@/components/pricing/FeaturesComparisonSection";
import PricingSection from "@/components/pricing/PricingSection";
import TestimonialsSection from "@/components/reviews/TestimonialsSection";
import JsonLd from "@/components/seo/JsonLd";
import { resolveFaqs } from "@/lib/faq";
import { getServerPricingRegion } from "@/lib/pricing/geo";
import { formatRegionPrice } from "@/lib/pricing/regions";
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
  const faqs = resolveFaqs("pricing", {
    clarity: formatRegionPrice(region, "clarity"),
    transform: formatRegionPrice(region, "transform"),
  });

  return (
    <>
      <JsonLd data={graph(faqSchema(
        faqs.map((faq) => ({ question: faq.q, answer: faq.a })),
        "/pricing",
      ))} />
      <section className="relative bg-white">
        <Navbar theme="light" />
        <div className="h-[4.5rem] md:h-20 xl:h-24" aria-hidden />
      </section>
      <main>
        {/* Page H1. Sits above PricingSection, whose own heading is an h2. */}
        <header className="mx-auto max-w-3xl px-6 pt-10 text-center">
          <h1 className="font-[family-name:var(--font-playfair)] text-4xl leading-tight text-[#2a1140] md:text-5xl">
            Skin assessment plans
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-lg text-black/65">
            Every paid plan is read by a certified practitioner and comes back as
            a written report you keep. One payment, no subscription.
          </p>
        </header>
        <PricingSection />
        <FeaturesComparisonSection />
        {/* HANDOVER-12 §5 — after the price comparison, before the FAQ. */}
        <TestimonialsSection />
        <FaqSection faqs={faqs} />
      </main>
      <Footer />
    </>
  );
}
