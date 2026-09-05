import Image from "next/image";
import { preload } from "react-dom";

import { aboutHero, aboutHeroBackground } from "@/components/about/aboutContent";
import Navbar from "@/components/home/Navbar";

preload(aboutHeroBackground, { as: "image", fetchPriority: "high" });

export default function AboutHeroSection() {
  return (
    <section className="relative min-h-[80svh] overflow-hidden bg-white lg:min-h-[100svh]">
      <Image
        src={aboutHeroBackground}
        alt=""
        fill
        priority
        // Decorative full-bleed background. Capped per breakpoint rather than
        // a flat "100vw" — on a `fill` image `sizes` is what keeps the
        // browser from picking the largest candidate in next.config's
        // deviceSizes on a high-DPR phone (this was requesting the 3840px
        // variant on mobile). The mobile bucket targets the ~1200px tier
        // even at 3x DPR (400 * 3 = 1200).
        sizes="(max-width: 640px) 400px, (max-width: 1024px) 800px, 1920px"
        className="object-cover object-center"
      />

      <div className="absolute inset-0 bg-[#1b1b1b]/40" aria-hidden />

      <Navbar />

      <div className="relative z-10 flex min-h-[80svh] flex-col items-center justify-center px-5 pb-12 pt-[92px] text-center sm:px-6 lg:min-h-[100svh] lg:pb-16 lg:pt-[72px]">
        <h1 className="mx-auto max-w-[46rem] font-sans text-[40px] leading-[1.1] tracking-[-0.72px] text-white sm:text-[56px] lg:text-[72px] lg:leading-[0.95]">
          {aboutHero.headlineLead}{" "}
          <span className="font-serif italic">{aboutHero.headlineEmphasis}</span>
        </h1>
        <p className="mx-auto mt-6 max-w-[34rem] font-sans text-base font-normal leading-[1.4] text-white sm:text-lg lg:mt-7 lg:text-[24px]">
          {aboutHero.subtitle}
        </p>
      </div>
    </section>
  );
}
