import AnimatedSlideIn from "@/components/home/AnimatedSlideIn";
import { whereYouLive } from "@/components/about/aboutContent";

/**
 * "Why a routine has to know where you live". Keeps every Pakistani example
 * (hard water, humidity, air quality, sun) and carries the reasoning to the
 * other places clients write from, so the service reads as one that takes
 * climate seriously rather than one that only serves Pakistan.
 */
export default function WhereYouLiveSection() {
  return (
    <section className="bg-white px-4 py-16 sm:px-6 sm:py-20 lg:py-24">
      <div className="mx-auto max-w-3xl">
        <AnimatedSlideIn direction="up">
          <h2 className="text-brand-primary">
            <span className="font-sans text-[1.75rem] tracking-[-0.36px] sm:text-[2.25rem]">
              {whereYouLive.headingLead}{" "}
            </span>
            <span className="font-serif italic text-[1.75rem] sm:text-[2.25rem]">
              {whereYouLive.headingEmphasis}
            </span>
          </h2>
        </AnimatedSlideIn>

        <AnimatedSlideIn direction="up" delay={120}>
          <div className="mt-6 space-y-5">
            {whereYouLive.paragraphs.map((p) => (
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
