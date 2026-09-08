import AnimatedSlideIn from "@/components/home/AnimatedSlideIn";
import { whatWeWontDo } from "@/components/about/aboutContent";

/**
 * "What we will not do" — the boundary statements. These are the trust
 * signals that make the disclaimers elsewhere on the site credible: a page
 * that states its own limits plainly is harder to accuse of overreach.
 */
export default function WhatWeWontDoSection() {
  return (
    <section className="bg-brand-surface px-4 py-16 sm:px-6 sm:py-20 lg:py-24">
      <div className="mx-auto max-w-3xl">
        <AnimatedSlideIn direction="up">
          <h2 className="font-serif italic text-[2rem] text-brand-primary sm:text-[2.5rem]">
            What we will not do
          </h2>
        </AnimatedSlideIn>

        <ul className="mt-8 space-y-5">
          {whatWeWontDo.map((item, i) => (
            <li key={item.lead}>
              <AnimatedSlideIn direction="up" delay={i * 70}>
                <p className="font-sans text-base leading-relaxed text-brand-ink sm:text-lg">
                  <span className="font-semibold text-brand-primary">
                    {item.lead}
                  </span>{" "}
                  {item.body}
                </p>
              </AnimatedSlideIn>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
