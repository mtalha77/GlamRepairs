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
import { resolveFaqs } from "@/lib/faq";
import { pageH1, pageMetadata } from "@/lib/seo/pageSeo";

// HANDOVER-45 — from `page_seo` ('/contact'), edited in Studio → SEO. The
// strings here are only the fallback for a missing row or failed read.
export async function generateMetadata(): Promise<Metadata> {
  return pageMetadata("/contact", {
    title: "Contact Glam Repairs, Skin Advice in Lahore",
    description:
      "Questions about a skin assessment, your report, or how Glam Repairs " +
    "works? Get in touch and someone from our team will reply within one working day.",
  });
}

export default async function ContactPage() {
  // HANDOVER-13 §1/§2 — one array, filtered by tag, rendered and marked up
  // from the same value. No pricing context passed, so the price question is
  // omitted rather than guessed, and this page stays static.
  const faqs = resolveFaqs("contact");

  return (
    <>
      {/* Handover 73 Part 8: no FAQPage here. The homepage carries the one
          FAQPage for these shared questions; marking them up again on
          /contact and /about made the pages compete. */}
      <main>
        <ContactHeroSection h1={await pageH1("/contact", "Get in Touch")} />
        <ContactSection />
        <FaqSection faqs={faqs} />
      </main>
    </>
  );
}
