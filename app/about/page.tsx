/**
 * MERGED — replaces app/about/page.tsx. Component tree untouched.
 *
 * ⚠️ The title change is not cosmetic. The layout now defines
 * `template: "%s | GlamRepairs"`, so the previous value
 * `title: "About Us | GlamRepairs"` would render as
 * **"About Us | GlamRepairs | GlamRepairs"**. Only the page name goes here now.
 *
 * The description was 129 characters — under the 150–160 range Ahrefs flagged
 * as "Meta description too short". Rewritten to 158.
 */
import type { Metadata } from "next";
import AboutHeroSection from "@/components/about/AboutHeroSection";
import OurStorySection from "@/components/about/OurStorySection";
import FaqSection from "@/components/home/FaqSection";
import Footer from "@/components/home/Footer";

export const metadata: Metadata = {
  title: "About Us",
  description:
    "Glam Repairs bridges professional aesthetics expertise and everyday " +
    "skincare decisions — personalised guidance, reviewed by a certified practitioner.",
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  return (
    <>
      <main>
        <AboutHeroSection />
        <OurStorySection />
        <FaqSection />
      </main>
      <Footer />
    </>
  );
}
