import AnimatedSlideIn from "@/components/home/AnimatedSlideIn";
import { whatWeAre } from "@/components/about/aboutContent";

/** "What Glam Repairs is" — states the cosmetic-vs-medical boundary early. */
export default function WhatWeAreSection() {
  return (
    <section className="bg-white px-4 py-16 sm:px-6 sm:py-20 lg:py-24">
      <div className="mx-auto max-w-3xl">
        <AnimatedSlideIn direction="up">
          <h2 className="text-brand-primary">
            <span className="font-sans text-[2rem] tracking-[-0.48px] sm:text-[2.5rem]">
              {whatWeAre.headingLead}{" "}
            </span>
            <span className="font-serif italic text-[2rem] sm:text-[2.5rem]">
              {whatWeAre.headingEmphasis}
            </span>
          </h2>
        </AnimatedSlideIn>

        <AnimatedSlideIn direction="up" delay={120}>
          <div className="mt-6 space-y-5">
            {whatWeAre.paragraphs.map((p) => (
              <p
                key={p}
                className="font-sans text-base leading-relaxed text-brand-ink sm:text-lg lg:leading-[1.7]"
              >
                {p}
              </p>
            ))}
          </div>
        </AnimatedSlideIn>
      </div>
    </section>
  );
}
