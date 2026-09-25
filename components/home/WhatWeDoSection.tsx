"use client";

import Image from "next/image";
import AnimatedSlideIn from "@/components/home/AnimatedSlideIn";
import BeforeAfterSlider from "@/components/home/BeforeAfterSlider";
import ShareSkinStepImage from "@/components/home/ShareSkinStepImage";

const steps = [
  {
    image: "/images,svgs/woman-hand-.webp",
    alt: "Hands holding a phone with skin concern tags for acne scars, pimples, and blackheads",
    number: "01",
    title: "Share your Skin",
    description:
      "Fill out your skin intake form and upload clear photos of your concern areas. Takes under 5 minutes.",
  },
  {
    image: "/images,svgs/face_pimples.webp",
    alt: "Close-up face photo with expert markers for sebaceous filaments, pustules, papules, and acne scars",
    number: "02",
    title: "Experts Review",
    description:
      "Our qualified aesthetics expert manually reviews your submission - no AI shortcuts, no automated reports.",
  },
  {
    image: "/images,svgs/men_face_pimple.webp",
    alt: "Side profile with personalized skincare guidance for moisture, cleansing, and product recommendations",
    number: "03",
    title: "Your Personalized Plan",
    description:
      "Receive a detailed skin report, a step-by-step routine, ingredient and product-type guidance tailored to your skin, and follow-up support to track your progress.",
  },
];

/*
 * HOTFIX-41 §2 — "What we do" and "What you get" are one section.
 *
 * They were two sections, 2,005px and 1,940px tall at 375px, four sections
 * apart, describing the same process twice: both opened with a paragraph
 * about sharing photos and receiving a personalised plan. What "What you
 * get" had that this did not was the progress-tracking detail and the
 * before/after, so those two moved here. What did not move carried nothing
 * new: a card of concern pills already shown in the Skin Concerns section
 * and on step 01's image, and a "Skin Analysis" card that was a tagline and
 * a fourth identical CTA.
 */
const progressItems = [
  "Customized Weekly Routine",
  "Treatment Tracking",
  "Expert Adjustments",
  "Goal-Oriented Care",
];

const weeks = [
  { label: "Week 1", className: "left-[3.7%] top-[49.3%] -rotate-[55deg]" },
  { label: "Week 2", className: "left-[21.2%] top-[12.3%] -rotate-[33deg]" },
  { label: "Week 3", className: "left-1/2 top-0" },
  { label: "Week 4", className: "left-[79.3%] top-[12.3%] rotate-[33deg]" },
  { label: "Week 5", className: "left-[95.4%] top-[49.3%] rotate-[55deg]" },
];

export default function WhatWeDoSection() {
  return (
    <section className="bg-white px-4 py-12 sm:px-6 sm:py-20 lg:px-12 lg:py-24">
      <div className="mx-auto max-w-7xl">
        <AnimatedSlideIn
          direction="left"
          className="max-w-3xl sm:-ml-3 lg:-ml-5"
        >
          <header>
            <h2 className="flex flex-wrap items-baseline gap-x-2 leading-none text-brand-primary">
              <span className="font-sans font-normal text-[2.5rem] sm:text-[3.25rem] lg:text-[3.875rem]">
                What we
              </span>
              <span className="font-serif italic text-[2.25rem] sm:text-[2.75rem] lg:text-[3.375rem]">
                do
              </span>
            </h2>
            <p className="mt-3 font-sans font-normal text-brand-ink text-lg sm:mt-4 sm:text-2xl lg:text-[2rem]">
              Real experts. Real photos. Real results.
            </p>
            <p className="mt-3 text-sm font-light leading-snug tracking-tighter text-brand-gray sm:mt-4 sm:text-lg lg:text-xl">
              You fill out a detailed intake form and share photos of your skin
              and concern areas. A certified aesthetics professional reviews
              everything manually. You receive a personalized assessment, a
              step-by-step routine, and follow-up support to make sure
              it&apos;s actually working.
            </p>
            <p className="mt-2 text-sm font-light leading-snug tracking-tighter text-brand-gray sm:mt-3 sm:text-lg lg:text-xl">
              This is what a clinic visit should feel like. Minus the commute,
              the cost, and the wait.
            </p>
          </header>
        </AnimatedSlideIn>

        {/* Below `sm` each step is a row, a square thumbnail beside its
            text, instead of a full-width image above it: the three images
            alone were about 1,100px of a phone screen. */}
        <div className="mt-8 grid gap-7 sm:mt-14 sm:gap-10 lg:mt-16 lg:grid-cols-3 lg:gap-8 xl:gap-10">
          {steps.map((step, index) => (
            <AnimatedSlideIn
              key={step.number}
              direction="up"
              delay={index * 70}
            >
              <article className="grid grid-cols-[6.5rem_1fr] items-start gap-4 sm:block">
                {step.number === "01" ? (
                  <ShareSkinStepImage alt={step.alt} />
                ) : (
                  <div className="relative aspect-square w-full overflow-hidden rounded-2xl sm:aspect-[433/415] sm:rounded-[25px]">
                    <Image
                      src={step.image}
                      alt={step.alt}
                      fill
                      sizes="(max-width: 1024px) 100vw, 400px"
                      className="object-cover"
                    />
                  </div>
                )}

                <div>
                  <p className="font-serif italic leading-none text-brand-accent text-xl sm:mt-7 sm:text-[1.875rem] lg:text-[2rem]">
                    {step.number}
                  </p>
                  <h3 className="mt-1.5 font-serif italic leading-tight text-brand-primary text-[1.5rem] sm:mt-3 sm:text-[2.25rem] lg:text-[2.625rem]">
                    {step.title}
                  </h3>
                  <p className="mt-1.5 font-sans leading-normal text-brand-ink text-[0.9375rem] sm:mt-3 sm:text-lg lg:text-[1.25rem]">
                    {step.description}
                  </p>
                </div>
              </article>
            </AnimatedSlideIn>
          ))}
        </div>

        {/* What you get — moved from the retired WhatYouGetSection. */}
        <div className="mt-12 grid gap-5 sm:mt-16 md:grid-cols-2 lg:mt-20">
          <article className="relative overflow-hidden rounded-[10px] bg-brand-cream-card px-5 pb-7 pt-7 sm:min-h-[600px] sm:px-6 sm:pb-0 sm:pt-8 lg:h-[600px]">
            <h3 className="font-serif text-[26px] italic text-brand-primary sm:text-[28px] lg:text-[32px]">
              Progress Tracking
            </h3>
            <p className="mt-3 max-w-[369px] font-sans text-[15px] font-normal leading-[1.35] text-brand-ink sm:text-[16px] lg:text-[18px]">
              A structured weekly skincare plan designed around your unique skin
              concerns, helping you build healthy habits, maintain consistency,
              and achieve visible results over time.
            </p>
            <ul className="mt-4 space-y-2 sm:mt-5 sm:space-y-2.5">
              {progressItems.map((item) => (
                <li key={item} className="flex items-center gap-3">
                  <span aria-hidden className="size-2 shrink-0 rounded-full bg-brand-accent" />
                  <span className="font-serif text-[15px] italic text-brand-ink lg:text-[16px]">
                    {item}
                  </span>
                </li>
              ))}
            </ul>

            {/* Weekly progress arc — decorative, and from `sm` only: on a
                phone it needs ~250px of empty card to clear the list. Capped
                at the width it was drawn for; in this two-column row the
                card is wider than it was, and an uncapped arc grew up into
                the list. */}
            <div
              aria-hidden
              className="pointer-events-none absolute bottom-0 left-1/2 hidden aspect-[1206/586] w-[109%] max-w-[29.5rem] -translate-x-1/2 sm:block"
            >
              <Image
                src="/svgs/wyg_arc2.svg"
                alt=""
                fill
                sizes="540px"
                className="object-contain object-bottom"
              />
              {weeks.map((w) => (
                <span
                  key={w.label}
                  className={`absolute -translate-x-1/2 -translate-y-1/2 font-sans text-[7px] font-medium tracking-tight text-brand-ink/60 lg:text-[8px] ${w.className}`}
                >
                  {w.label}
                </span>
              ))}
              <div className="absolute right-[10%] top-[-34%] h-[74px] w-[64px] rotate-[31deg] overflow-hidden rounded-[10px] border-2 border-white shadow-sm">
                <Image
                  src="/images,svgs/wyg_routine.webp"
                  alt=""
                  fill
                  sizes="90px"
                  className="object-cover"
                />
              </div>
            </div>
          </article>

          <article className="relative aspect-[4/5] overflow-hidden rounded-[10px] bg-brand-lavender-light sm:aspect-auto sm:min-h-[600px] lg:h-[600px]">
            <BeforeAfterSlider
              beforeSrc="/images,svgs/Rectangle 3467729.webp"
              afterSrc="/images,svgs/Rectangle 3467730.webp"
              imageAlt="Before and after skin comparison"
              imagePosition="center"
              contentScale={1}
              showLabels={false}
              handleVariant="arrow-right"
              roundedClassName="rounded-[10px]"
              className="h-full"
            />
            <span className="pointer-events-none absolute left-5 top-5 z-20 font-serif text-[20px] italic text-brand-primary lg:text-[22px]">
              Before
            </span>
            <span className="pointer-events-none absolute right-5 top-5 z-20 font-serif text-[20px] italic text-brand-primary lg:text-[22px]">
              After
            </span>
          </article>
        </div>
      </div>
    </section>
  );
}
