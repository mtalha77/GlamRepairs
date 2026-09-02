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
import FaqSection from "@/components/home/FaqSection";
import Footer from "@/components/home/Footer";

export const metadata: Metadata = {
  title: "Contact Us",
  description:
    "Questions about a skin assessment, your report, or how Glam Repairs " +
    "works? Get in touch and someone from our team will reply within one working day.",
  alternates: { canonical: "/contact" },
};

export default function ContactPage() {
  return (
    <>
      <main>
        <ContactHeroSection />
        <ContactSection />
        <FaqSection />
      </main>
      <Footer />
    </>
  );
}
