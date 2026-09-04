import AnimatedSlideIn from "@/components/home/AnimatedSlideIn";
import { whyPakistan } from "@/components/about/aboutContent";

/**
 * "Why skin in Pakistan needs advice written for Pakistan" — the section that
 * targets the Pakistan-environment keyword space (hard water, humidity, air
 * quality, sun exposure) rather than competing on medical-intent queries.
 */
export default function WhyPakistanSection() {
  return (
    <section className="bg-white px-4 py-16 sm:px-6 sm:py-20 lg:py-24">
      <div className="mx-auto max-w-3xl">
        <AnimatedSlideIn direction="up">
          <h2 className="text-brand-primary">
            <span className="font-sans text-[1.75rem] tracking-[-0.36px] sm:text-[2.25rem]">
              {whyPakistan.headingLead}{" "}
            </span>
            <span className="font-serif italic text-[1.75rem] sm:text-[2.25rem]">
              {whyPakistan.headingEmphasis}
            </span>
          </h2>
        </AnimatedSlideIn>

        <AnimatedSlideIn direction="up" delay={120}>
          <div className="mt-6 space-y-5">
            {whyPakistan.paragraphs.map((p) => (
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
