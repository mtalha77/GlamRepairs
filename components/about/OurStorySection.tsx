import AnimatedSlideIn from "@/components/home/AnimatedSlideIn";
import { whoReviews } from "@/components/about/aboutContent";
import CredentialsCard from "@/components/about/CredentialsCard";
import { PRACTITIONER } from "@/lib/seo/authors";

/**
 * "Who reviews your skin". The client chooses the practitioner (10 November
 * 2026), so this no longer says one named person reads every assessment.
 * Ayma's paragraph and card stay as the page's E-E-A-T anchor; the
 * credential wording must match lib/seo/authors.ts exactly: BS Cosmetology &
 * Dermatology Science, never a medical title.
 */
export default function OurStorySection({ degreeVerified = false }: { degreeVerified?: boolean }) {
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
            {whoReviews.paragraphs.map((p) => (
              <p key={p} className="font-sans text-base leading-relaxed text-brand-ink sm:text-lg lg:text-xl lg:leading-[1.6]">
                {p}
              </p>
            ))}
            {/*
              Ayma's own paragraph, above her card. It connects her clinic
              years to what a client is buying: whether a photograph can be
              read at all.
            */}
            {PRACTITIONER.experienceLong ? (
              <p className="font-sans text-base leading-relaxed text-brand-ink sm:text-lg lg:text-xl lg:leading-[1.6]">
                {PRACTITIONER.experienceLong}
              </p>
            ) : null}
          </div>
        </AnimatedSlideIn>

        <AnimatedSlideIn direction="up" delay={320}>
          {/* HOTFIX-6 §1 / HANDOVER-11 §2 — the page's E-E-A-T anchor.
              Keep it here, not folded into the prose above. Was a flat
              CredentialsBlock; now a three-band card, because four
              credentials of equal visual weight meant the HEC attestation
              read as quietly as the rest. Wider max-width than the old
              block: the two-column credential grid needs the room. */}
          <div className="mx-auto mt-8 max-w-3xl sm:mt-10">
            <CredentialsCard degreeVerified={degreeVerified} />
          </div>
        </AnimatedSlideIn>
      </div>
    </section>
  );
}
