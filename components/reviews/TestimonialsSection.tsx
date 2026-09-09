import TestimonialDeck from "@/components/reviews/TestimonialDeck";
import { REVIEWS } from "@/lib/reviews";

/**
 * HANDOVER-12 §5 — the section wrapper.
 *
 * A server component around a client deck, so the heading and the section
 * chrome cost no JavaScript; only the deck itself hydrates.
 *
 * Compact on purpose: ~56px of top padding. This is a trust beat sitting
 * between two larger sections, not a feature block, and giving it the
 * padding of a feature block is what would make it read as filler.
 *
 * Renders nothing at all when there are no reviews — better an absent
 * section than an empty frame promising social proof that isn't there.
 */
export default function TestimonialsSection() {
  if (REVIEWS.length === 0) return null;

  return (
    <section
      aria-labelledby="testimonials-heading"
      className="bg-brand-purple-tint px-6 pb-16 pt-14"
    >
      <div className="mx-auto max-w-5xl">
        <header className="mb-[34px] text-center">
          <h2
            id="testimonials-heading"
            className="font-serif text-[1.7rem] font-semibold leading-[1.18] tracking-[-0.015em] text-brand-ink sm:text-[2.1rem]"
          >
            What our clients{" "}
            <em className="italic text-brand-primary">are saying</em>
          </h2>
          <p className="mt-2 font-sans text-[0.9375rem] text-brand-gray">
            Every assessment is written by hand, for one person.
          </p>
        </header>

        <TestimonialDeck />
      </div>
    </section>
  );
}
