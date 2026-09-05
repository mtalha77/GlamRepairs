"use client";

import Image from "next/image";
import AnimatedSlideIn from "@/components/home/AnimatedSlideIn";

export default function CeoSection() {
  return (
    <section className="overflow-hidden bg-[#fdf6e4]">
      <div className="mx-auto grid max-w-7xl grid-cols-1 items-end gap-8 pl-0 pr-4 sm:pl-2 sm:pr-6 lg:grid-cols-[1.35fr_0.95fr] lg:gap-10 lg:pl-0 lg:pr-12">
        <AnimatedSlideIn
          direction="left"
          className="order-2 w-full lg:order-1 lg:-ml-6 xl:-ml-10"
        >
          <Image
            src="/images,svgs/ceo_doctor.png"
            alt="Ayma Arif, aesthetics and dermatology expert holding a tablet"
            width={660}
            height={694}
            sizes="(max-width: 1024px) 95vw, 68vw"
            className="mx-auto block h-auto w-full max-w-[44rem] object-contain object-bottom sm:max-w-[52rem] lg:mx-0 lg:max-w-none lg:origin-bottom-left lg:scale-[1.1]"
            priority={false}
          />
        </AnimatedSlideIn>

        <AnimatedSlideIn
          direction="right"
          className="order-1 min-w-0 pl-4 pt-12 sm:pl-6 sm:pt-16 md:pl-8 lg:order-2 lg:pl-0 lg:py-16 lg:pt-16"
        >
          <header>
            <span className="relative inline-block">
              <Image
                src="/svgs/meet-expert-ellipse.svg"
                alt=""
                width={294}
                height={58}
                aria-hidden
                className="pointer-events-none absolute left-1/2 top-1/2 h-[165%] w-[120%] max-w-none -translate-x-1/2 -translate-y-1/2"
              />
              <span className="relative font-sans text-brand-ink text-2xl sm:text-[1.75rem] lg:text-[2rem]">
                Meet Your Expert
              </span>
            </span>

            <h2 className="mt-5 font-serif italic leading-none text-brand-primary text-[2.5rem] sm:mt-6 sm:text-6xl lg:text-[4.5rem]">
              Ayma Arif
            </h2>
          </header>

          <p className="mt-4 font-sans italic tracking-[-0.03em] text-brand-ink text-lg sm:text-xl lg:text-[1.375rem]">
            Certified Aesthetics Practitioner
          </p>
          <p className="mt-1 font-sans italic text-[rgba(31,31,31,0.55)] text-sm sm:text-[15px] lg:text-base">
            (BS Cosmetology &amp; Dermatology Science &middot; KFU &middot;
            Clinic-trained)
          </p>

          <p className="mt-6 w-full text-justify font-sans leading-relaxed text-brand-ink text-base sm:text-lg lg:text-xl">
            <span className="font-serif italic">Ayma Arif</span>{" "}is a
            certified aesthetics practitioner with a Bachelor&apos;s degree in
            Cosmetology and Dermatology Science. With hands-on experience across
            multiple clinics in Pakistan, she has helped clients with skin
            assessments, treatment planning, and evidence-based skincare
            routines for a wide range of concerns.
          </p>
          <p className="mt-5 w-full text-justify font-sans leading-relaxed text-brand-ink text-base sm:text-lg lg:text-xl">
            She co-founded Glam Repairs because she saw firsthand how many people
            were struggling with their skin, not from a lack of care, but from a
            lack of access to clear, personalized guidance. Glam Repairs is her
            answer to that gap.
          </p>

          <a
            href="https://www.linkedin.com/company/glamrepairs/"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Connect with Ayma Arif on LinkedIn"
            className="mt-6 inline-flex items-center gap-2.5 rounded-full bg-[#0A66C2] px-4 py-2.5 text-white transition-opacity hover:opacity-90 sm:mt-7 sm:px-5"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="currentColor"
              aria-hidden
            >
              <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.225 0z" />
            </svg>
            <span className="font-sans text-sm font-medium sm:text-[15px]">
              Ayma Arif
            </span>
          </a>
        </AnimatedSlideIn>
      </div>
    </section>
  );
}
