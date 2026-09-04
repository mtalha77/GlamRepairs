import AnimatedSlideIn from "@/components/home/AnimatedSlideIn";
import { howItWorks } from "@/components/about/aboutContent";

/** "How a consultation works" — the four-step process, in order. */
export default function HowItWorksSection() {
  return (
    <section className="bg-brand-surface px-4 py-16 sm:px-6 sm:py-20 lg:py-24">
      <div className="mx-auto max-w-3xl">
        <AnimatedSlideIn direction="up">
          <h2 className="font-serif italic text-[2rem] text-brand-primary sm:text-[2.5rem]">
            How a consultation works
          </h2>
        </AnimatedSlideIn>

        <ol className="mt-8 space-y-6">
          {howItWorks.map((step, i) => (
            <li key={step.title}>
              <AnimatedSlideIn direction="up" delay={i * 100}>
                <div className="flex gap-4">
                  <span
                    aria-hidden
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-primary font-sans text-sm font-bold text-white"
                  >
                    {i + 1}
                  </span>
                  <p className="font-sans text-base leading-relaxed text-brand-ink sm:text-lg">
                    <span className="font-semibold text-brand-primary">
                      {step.title}
                    </span>{" "}
                    {step.body}
                  </p>
                </div>
              </AnimatedSlideIn>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
