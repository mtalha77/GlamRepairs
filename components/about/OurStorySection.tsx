import AnimatedSlideIn from "@/components/home/AnimatedSlideIn";
import { whoReviews } from "@/components/about/aboutContent";

/**
 * "Who reviews your skin" — the named, credentialed practitioner behind every
 * assessment. This is the page's E-E-A-T anchor, so the credential wording
 * here must match lib/seo/authors.ts exactly: BSc Cosmetology & Dermatology
 * Science, never a medical title.
 */
export default function OurStorySection() {
  return (
    <section className="bg-white px-4 py-16 sm:px-6 sm:py-20 lg:py-24">
      <div className="mx-auto max-w-4xl text-center">
        <AnimatedSlideIn direction="up">
          <h2 className="text-brand-primary">
            <span className="font-sans text-[2rem] tracking-[-0.48px] sm:text-[2.75rem] lg:text-[3.5rem]">
              {whoReviews.headingLead}
            </span>{" "}
            <span className="font-serif italic text-[2rem] sm:text-[2.75rem] lg:text-[3.5rem]">
              {whoReviews.headingEmphasis}
            </span>
          </h2>
        </AnimatedSlideIn>

        <AnimatedSlideIn direction="up" delay={120}>
          <p className="mx-auto mt-4 max-w-2xl tracking-[-0.03em] sm:mt-6">
            <span className="font-sans text-[1.5rem] text-brand-ink sm:text-[2rem] lg:text-[2.5rem]">
              {whoReviews.subheadingLead}{" "}
            </span>
            <span className="font-serif italic text-[1.5rem] text-brand-primary sm:text-[2rem] lg:text-[2.5rem]">
              {whoReviews.subheadingEmphasis}
            </span>
          </p>
        </AnimatedSlideIn>

        <AnimatedSlideIn direction="up" delay={240}>
          <div className="mx-auto mt-8 max-w-3xl space-y-5 sm:mt-10">
            <p className="font-sans text-base leading-relaxed text-brand-ink sm:text-lg lg:text-xl lg:leading-[1.6]">
              <span className="font-serif italic">{whoReviews.expertName}</span>{" "}
              {whoReviews.paragraphs[0]}
            </p>
            <p className="font-sans text-base leading-relaxed text-brand-ink sm:text-lg lg:text-xl lg:leading-[1.6]">
              {whoReviews.paragraphs[1]}
            </p>
          </div>
        </AnimatedSlideIn>
      </div>
    </section>
  );
}
