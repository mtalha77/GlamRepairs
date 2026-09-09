/**
 * MERGED — replaces app/contact/page.tsx. Component tree untouched.
 *
 * ⚠️ Title suffix stripped — the layout template now appends "| GlamRepairs",
 * so the old value would render "Contact Us | GlamRepairs | GlamRepairs".
 *
 * Description was 87 characters. Rewritten to 155.
 *
 * H1 verified present on the live page ("Get in Touch"), so no structural
 * change is needed here.
 */
import type { Metadata } from "next";
import ContactHeroSection from "@/components/contact/ContactHeroSection";
import ContactSection from "@/components/contact/ContactSection";
import FaqSection from "@/components/faq/FaqSection";
import Footer from "@/components/home/Footer";
import JsonLd from "@/components/seo/JsonLd";
import { resolveFaqs } from "@/lib/faq";
import { faqSchema, graph } from "@/lib/seo/schema";

export const metadata: Metadata = {
  title: "Contact Us",
  description:
    "Questions about a skin assessment, your report, or how Glam Repairs " +
    "works? Get in touch and someone from our team will reply within one working day.",
  alternates: { canonical: "/contact" },
};

export default function ContactPage() {
  // HANDOVER-13 §1/§2 — one array, filtered by tag, rendered and marked up
  // from the same value. No pricing context passed, so the price question is
  // omitted rather than guessed, and this page stays static.
  const faqs = resolveFaqs("contact");

  return (
    <>
      <JsonLd data={graph(faqSchema(
        faqs.map((faq) => ({ question: faq.q, answer: faq.a })),
        "/contact",
      ))} />
      <main>
        <ContactHeroSection />
        <ContactSection />
        <FaqSection faqs={faqs} />
      </main>
      <Footer />
    </>
  );
}
