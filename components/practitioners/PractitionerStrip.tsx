import Link from "next/link";

import PractitionerDeck from "@/components/practitioners/PractitionerDeck";
import { DIRECTORY_MIN_PRACTITIONERS, listPublicPractitioners, visitorPrice } from "@/lib/practitioners/directory";
import { getServerPricingRegion } from "@/lib/pricing/geo";

/**
 * The homepage strip (Handover 63 Part 1): the deck, a short argument beside
 * it, and one link. No filters; the link is right there for anyone who wants
 * them. It sits directly above the reviews drum, so the proof that the
 * people are real is followed at once by the proof that clients liked them.
 *
 * Gated on the count, not a flag: below three approved practitioners it
 * renders nothing, because "you pick the person" is false with one person.
 */
export default async function PractitionerStrip() {
  const practitioners = await listPublicPractitioners(visitorPrice(await getServerPricingRegion()));
  if (practitioners.length < DIRECTORY_MIN_PRACTITIONERS) return null;

  return (
    <section aria-labelledby="practitioners-heading" className="px-6 pb-6 pt-16">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-center gap-12">
        <div className="max-w-[360px]">
          <p className="gr-eyebrow mb-3">Your practitioner</p>
          <h2
            id="practitioners-heading"
            className="font-serif text-[1.7rem] font-semibold leading-[1.18] tracking-[-0.015em] text-brand-ink sm:text-[2rem]"
          >
            You pick the person who <em className="italic text-brand-primary">reads your skin.</em>
          </h2>
          <p className="mt-3 text-[15px] leading-relaxed text-brand-gray">
            Every practitioner publishes their qualification with its reference number, the languages they work in, and
            how soon they can take you. Read them, then choose.
          </p>
          <p className="mt-5 hidden items-center gap-2 text-[13px] text-brand-gray/80 sm:flex">
            <kbd className="rounded border border-brand-lavender px-2 py-0.5 font-sans text-[11.5px] font-semibold">←</kbd>
            <kbd className="rounded border border-brand-lavender px-2 py-0.5 font-sans text-[11.5px] font-semibold">→</kbd>
            or drag the card
          </p>
          <p className="mt-5">
            <Link href="/practitioners" className="text-[14.5px] font-semibold text-brand-primary hover:underline">
              See all practitioners →
            </Link>
          </p>
        </div>
        <PractitionerDeck practitioners={practitioners} />
      </div>
    </section>
  );
}
