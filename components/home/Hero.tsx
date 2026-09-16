"use client";

import Image from "next/image";
import Link from "next/link";
import { BOOKING_START_HREF } from "@/components/booking/bookingConfig";

const heroBackground = "/images,svgs/hero_skin.webp";

export default function Hero() {
  return (
    <section className="relative min-h-[60svh] overflow-hidden bg-white lg:min-h-[100svh]">
      <Image
        src={heroBackground}
        alt=""
        fill
        priority
        sizes="100vw"
        className="object-cover object-center"
      />

      <div className="absolute inset-0 bg-[#1b1b1b]/30" />

      <div className="relative z-10 flex min-h-[60svh] flex-col items-center justify-center px-5 pb-12 pt-[92px] text-center sm:px-6 lg:min-h-[100svh] lg:pb-16 lg:pt-[72px]">
        <h1 className="font-serif text-[40px] italic leading-[1.05] tracking-[-0.32px] text-white sm:text-[56px] lg:text-[72px]">
          <span className="block">Everyone Deserves</span>
          <span className="block">
            <span className="font-sans font-medium not-italic">Healthy</span>{" "}
            Skin
          </span>
        </h1>

        <p className="mt-6 max-w-[659px] font-sans text-base font-normal leading-[1.35] text-white sm:text-lg lg:mt-[54px] lg:text-[24px]">
          Share your concerns &amp; receive a personalized skincare routine from
          a certified{" "}
          <span className="font-serif italic">Aesthetics Expert</span>, with
          complete privacy, delivered to you within{" "}
          <span className="font-serif italic">24&nbsp;hours</span>.
        </p>

        <Link
          href={BOOKING_START_HREF}
          className="group relative mt-8 inline-flex items-center justify-center gap-2 overflow-hidden rounded-[30px] bg-white/10 px-[35px] py-[15px] font-sans text-sm font-medium uppercase leading-none tracking-[-0.54px] text-white backdrop-blur-sm transition-all duration-300 ease-out hover:scale-[1.04] hover:bg-white/20 hover:shadow-[0_10px_30px_rgba(255,255,255,0.22)] active:scale-95 lg:mt-9 lg:text-[18px]"
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
