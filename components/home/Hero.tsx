"use client";

import Image from "next/image";
import Link from "next/link";
import { BOOKING_START_HREF } from "@/components/booking/bookingConfig";

const heroBackground = "/images,svgs/hero_skin.webp";

export default function Hero() {
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
          alt=""
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
        <h1 className="font-serif text-[40px] italic leading-[1.05] tracking-[-0.32px] text-brand-primary sm:text-[56px] sm:text-white lg:text-[72px]">
          <span className="block">Everyone Deserves</span>
          <span className="block">
            <span className="font-sans font-medium not-italic">Healthy</span>{" "}
            Skin
          </span>
        </h1>

        <p className="mt-5 max-w-[659px] font-sans text-base font-normal leading-[1.35] text-brand-ink sm:mt-6 sm:text-lg sm:text-white lg:mt-[54px] lg:text-[24px]">
          Share your concerns &amp; receive a personalized skincare routine from
          a certified{" "}
          <span className="font-serif italic">Aesthetics Expert</span>, with
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
