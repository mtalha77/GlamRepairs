import Link from "next/link";

import AnimatedSlideIn from "@/components/home/AnimatedSlideIn";
import { youChoose } from "@/components/about/aboutContent";

/** "Pakistan and Nigeria", "Pakistan, Nigeria and Kenya". */
function joinCountries(countries: string[]): string {
  if (countries.length <= 1) return countries[0] ?? "";
  return `${countries.slice(0, -1).join(", ")} and ${countries[countries.length - 1]}`;
}

/**
 * "You choose who reads your skin" (About page, 10 November 2026). The
 * countries line is generated from practitioner_public, so it changes with
 * the roster and cannot go stale. The directory link shows only while the
 * directory is open.
 */
export default function YouChooseSection({ countries, directoryOpen }: { countries: string[]; directoryOpen: boolean }) {
  return (
    <section className="bg-brand-purple-soft px-4 py-16 sm:px-6 sm:py-20">
      <div className="mx-auto max-w-3xl">
        <AnimatedSlideIn direction="up">
          <h2 className="text-brand-primary">
            <span className="font-sans text-[1.75rem] tracking-[-0.36px] sm:text-[2.25rem]">{youChoose.headingLead} </span>
            <span className="font-serif italic text-[1.75rem] sm:text-[2.25rem]">{youChoose.headingEmphasis}</span>
          </h2>
        </AnimatedSlideIn>

        <AnimatedSlideIn direction="up" delay={120}>
          <div className="mt-6 space-y-5">
            {youChoose.paragraphs.map((p) => (
              <p key={p} className="font-sans text-base leading-relaxed text-brand-ink sm:text-lg lg:leading-[1.7]">
                {p}
              </p>
            ))}
            {countries.length ? (
              <p className="font-sans text-base leading-relaxed text-brand-ink sm:text-lg lg:leading-[1.7]">
                Our practitioners work from {joinCountries(countries)}. {youChoose.countriesNote}
              </p>
            ) : null}
          </div>
          {directoryOpen ? (
            <Link
              href={youChoose.cta.href}
              className="mt-7 inline-flex min-h-11 items-center gap-2 rounded-full bg-brand-primary px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-brand-primary-dark"
            >
              {youChoose.cta.label}
              <span aria-hidden>→</span>
            </Link>
          ) : null}
        </AnimatedSlideIn>
      </div>
    </section>
  );
}
