"use client";

import Image from "next/image";
import Link from "next/link";
import { BOOKING_START_HREF } from "@/components/booking/bookingConfig";

const heroBackground = "/images,svgs/hero_skin.webp";

/**
 * The two-line headline, from whatever H1 text Studio → SEO holds.
 *
 * The design sets the last two words as the second line, with the first of
 * them in sans. Any H1 wording keeps that shape, so an edit in the studio
 * never needs a code change.
 *
 * The space between the lines is a real text node. The previous markup put
 * the two lines in adjacent block spans with nothing between them, so the
 * heading's actual text, the thing a crawler and a screen reader get, was
 * "Everyone DeservesHealthy Skin".
 */
function HeroHeading({ text }: { text: string }) {
  // Handover 64: a two-sentence H1 ("A person reads your skin. Not an
  // algorithm.") breaks between the sentences, with the second line's first
  // word in sans. Otherwise the last two words make the second line.
  const sentences = text.trim().match(/^(.+?[.!?])\s+(\S+)\s+(.+)$/);
  if (sentences) {
    const [, first, plain, rest] = sentences;
    return (
      <>
        <span className="block">{first}</span>{" "}
        <span className="block">
          <span className="font-sans font-medium not-italic">{plain}</span> {rest}
        </span>
      </>
    );
  }
  const words = text.trim().split(/\s+/);
  if (words.length < 3) return <>{text}</>;
  const lead = words.slice(0, -2).join(" ");
  const [plain, accent] = words.slice(-2);
  return (
    <>
      <span className="block">{lead}</span>{" "}
      <span className="block">
        <span className="font-sans font-medium not-italic">{plain}</span>{" "}
        {accent}
      </span>
    </>
  );
}

export default function Hero({ h1 = "A person reads your skin. Not an algorithm." }: { h1?: string }) {
  return (
    /*
     * HOTFIX-41 §1 — no full-bleed scrim.
     *
     * The section used to lay a 30% near-black wash over the whole
     * photograph so white text could sit on it. On a 375px screen the text
     * covers most of the image, so the wash read as a grey film over the top
     * of the site.
     *
     * Below `sm` the image and the words no longer compete: the photograph
     * sits at its own 3:2 ratio, untinted, and the copy is on a cream panel
     * beneath it in the site's own ink-on-cream pairing (about 13:1). The
     * only tint left on mobile is a short fade at the very top, behind the
     * white logo and menu button that float over every hero.
     *
     * From `sm` the text overlays the image again. The tint is a soft
     * ellipse behind the text block (`.gr-hero-veil`), not a wash over the
     * whole photograph. A bottom-up gradient was tried first and measured
     * 2.1:1 behind the headline at 1280px, because the headline sits in the
     * upper-middle of the image where the skin is brightest.
     */
    <section className="relative flex flex-col overflow-hidden bg-brand-cream sm:block sm:min-h-[60svh] sm:bg-white lg:min-h-[100svh]">
      <div className="relative aspect-[3/2] w-full sm:absolute sm:inset-0 sm:aspect-auto">
        <Image
          src={heroBackground}
          alt="Close-up of a face with freckles and natural skin texture, eyes closed"
          fill
          priority
          sizes="100vw"
          className="object-cover object-center"
        />
        <div
          aria-hidden
          className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-brand-ink/45 to-transparent sm:hidden"
        />
        <div
          aria-hidden
          className="gr-hero-veil absolute inset-0 hidden sm:block"
        />
      </div>

      <div className="relative z-10 flex flex-col items-center px-6 pb-10 pt-8 text-center sm:min-h-[60svh] sm:justify-center sm:pb-12 sm:pt-[92px] lg:min-h-[100svh] lg:pb-16 lg:pt-[72px]">
        {/* Handover 64 Part 1: the eyebrow carries the credential, so the
            headline can carry the claim. Both statements are true today:
            the qualification and its reference are on /credentials. */}
        <p className="mb-4 font-sans text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-primary sm:mb-5 sm:text-xs sm:text-white/90">
          Certified Aesthetics Practitioner · Qualification published with its reference number
        </p>
        <h1 className="font-serif text-[40px] italic leading-[1.05] tracking-[-0.32px] text-brand-primary sm:text-[56px] sm:text-white lg:text-[72px]">
          <HeroHeading text={h1} />
        </h1>

        <p className="mt-5 max-w-[659px] font-sans text-base font-normal leading-[1.35] text-brand-ink sm:mt-6 sm:text-lg sm:text-white lg:mt-[54px] lg:text-[24px]">
          Share your concerns &amp; receive a personalized skincare routine from
          a certified{" "}
          <span className="font-serif italic">Aesthetics Practitioner</span>, with
          complete privacy, delivered to you within{" "}
          <span className="font-serif italic">24&nbsp;hours</span>.
        </p>

        <Link
          href={BOOKING_START_HREF}
          className="group relative mt-7 inline-flex min-h-12 items-center justify-center gap-2 overflow-hidden rounded-[30px] bg-brand-primary px-[35px] py-[15px] font-sans text-sm font-medium uppercase leading-none tracking-[-0.54px] text-white transition-all duration-300 ease-out hover:scale-[1.04] hover:bg-brand-primary-dark active:scale-95 motion-reduce:transition-none motion-reduce:hover:scale-100 sm:mt-8 sm:bg-white/10 sm:backdrop-blur-sm sm:hover:bg-white/20 sm:hover:shadow-[0_10px_30px_rgba(255,255,255,0.22)] lg:mt-9 lg:text-[18px]"
        >
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/30 to-transparent transition-transform duration-700 ease-out group-hover:translate-x-full"
          />
          <span className="relative">Get My Skin Assessment</span>
          <span
            aria-hidden
            className="relative inline-block transition-transform duration-300 ease-out group-hover:translate-x-1"
          >
            →
          </span>
        </Link>
      </div>
    </section>
  );
}
