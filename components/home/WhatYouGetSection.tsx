import Image from "next/image";
import Link from "next/link";
import BeforeAfterSlider from "@/components/home/BeforeAfterSlider";

import { BOOKING_START_HREF } from "@/components/booking/bookingConfig";

const concerns = [
  {
    label: "Acne Scars",
    icon: "/svgs/Vector (5).svg",
    className: "right-[4%] top-[16%]",
  },
  {
    label: "Pimples",
    icon: "/svgs/Vector (6).svg",
    className: "right-[14%] top-[42%]",
  },
  {
    label: "Black Heads",
    icon: "/svgs/Group 2085660670.svg",
    className: "right-[4%] top-[68%]",
  },
];

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

function ConcernPill({
  label,
  icon,
  className,
}: {
  label: string;
  icon: string;
  className: string;
}) {
  return (
    <div
      className={`absolute flex items-center gap-2 whitespace-nowrap rounded-full bg-white py-[5px] pl-[5px] pr-5 shadow-sm ${className}`}
    >
      <span className="flex size-[38px] shrink-0 items-center justify-center rounded-full bg-gradient-to-b from-[#f1e7ff] to-[#e3d2fb]">
        <Image src={icon} alt="" width={22} height={22} className="h-4 w-auto" />
      </span>
      <span className="font-sans text-[18px] uppercase leading-none tracking-tight text-brand-primary lg:text-[20px]">
        {label}
      </span>
    </div>
  );
}

export default function WhatYouGetSection() {
  return (
    <section className="w-full bg-white py-12 sm:py-16 lg:py-20">
      <div className="mx-auto w-full max-w-[1440px] px-5 sm:px-8 lg:px-[50px]">
        <header className="max-w-[1034px]">
          <h2 className="font-serif text-[34px] uppercase leading-[1.05] text-brand-primary sm:text-[48px] lg:text-[62px]">
            <span className="font-sans not-italic">What You</span>{" "}
            <span className="italic">get</span>
          </h2>
          <p className="mt-3 font-sans text-[15px] font-normal leading-[1.35] text-[#1b1b1b] sm:text-[17px] lg:mt-4 lg:text-[20px] lg:leading-[1.2]">
            Our skin guidance process is designed to make professional skincare
            support more accessible. Share your concerns, upload clear photos,
            and receive a personalized skin report with routine recommendations,
            lifestyle tips, and guidance on the next steps for your skin journey.
          </p>
        </header>

        <div className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-2 lg:mt-12 lg:grid-cols-3">
          {/* Column 1: Get rid + Skin Analysis */}
          <div className="flex flex-col gap-5 lg:h-[650px]">
            {/* Get rid of your Skin issues */}
            <article className="relative min-h-[260px] overflow-hidden rounded-[10px] bg-[#ead7ff] lg:h-[291px]">
              <Image
                src="/images,svgs/wyg_texture.webp"
                alt=""
                fill
                sizes="(max-width: 1024px) 90vw, 434px"
                className="rotate-180 object-cover mix-blend-color-burn"
              />
              <p className="absolute left-5 top-1/2 z-10 w-[7.25rem] -translate-y-1/2 font-serif text-[24px] leading-[1.15] max-[380px]:w-[6.5rem] lg:left-6 lg:w-auto lg:text-[28px]">
                <span className="block font-sans not-italic font-normal tracking-tight text-[#1b1b1b]">
                  Get rid of your
                </span>
                <span className="block italic text-brand-primary">
                  Skin issues
                </span>
              </p>
              {concerns.map((c) => (
                <ConcernPill
                  key={c.label}
                  label={c.label}
                  icon={c.icon}
                  className={c.className}
                />
              ))}
            </article>

            {/* Skin Analysis */}
            <article className="relative flex min-h-[300px] flex-1 flex-col items-center justify-center overflow-hidden rounded-[10px] bg-[#ead7ff] px-6 py-10 text-center lg:h-[339px]">
              <h3 className="font-serif text-[28px] italic text-brand-primary lg:text-[32px]">
                Skin Analysis
              </h3>
              <p className="mt-2 font-sans text-[16px] italic text-brand-primary lg:text-[18px]">
                Real advice. Real skin. Real results
              </p>
              <Link
                href={BOOKING_START_HREF}
                className="relative mt-6 inline-flex items-center justify-center rounded-full bg-white px-[35px] py-3 font-sans text-[15px] font-medium uppercase leading-none tracking-tight text-brand-accent shadow-[0_0_18px_4px_rgba(255,243,218,0.9)] transition-colors hover:bg-brand-cream lg:text-[16px]"
              >
                Get my skin Assessment
              </Link>
            </article>
          </div>

          {/* Column 2: Progress Tracking */}
          <article className="relative min-h-[560px] overflow-hidden rounded-[10px] bg-[#fdf6e4] px-5 pt-8 sm:px-6 lg:h-[650px]">
            <h3 className="font-serif text-[28px] italic text-brand-primary lg:text-[32px]">
              Progress Tracking
            </h3>
            <p className="mt-3 max-w-[369px] font-sans text-[16px] font-normal leading-[1.35] text-[#242424] lg:text-[18px]">
              A structured weekly skincare plan designed around your unique skin
              concerns, helping you build healthy habits, maintain consistency,
              and achieve visible results over time.
            </p>
            <ul className="mt-5 space-y-2.5">
              {progressItems.map((item) => (
                <li key={item} className="flex items-center gap-3">
                  <span className="size-2 shrink-0 rounded-full bg-brand-accent" />
                  <span className="font-serif text-[15px] italic text-[#242424] lg:text-[16px]">
                    {item}
                  </span>
                </li>
              ))}
            </ul>

            {/* Weekly progress arc */}
            <div className="pointer-events-none absolute bottom-0 left-1/2 aspect-[1206/586] w-[109%] -translate-x-1/2">
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
                  className={`absolute -translate-x-1/2 -translate-y-1/2 font-sans text-[7px] font-medium tracking-tight text-[#242424]/60 lg:text-[8px] ${w.className}`}
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

          {/* Column 3: Before / After */}
          <article className="relative min-h-[460px] overflow-hidden rounded-[10px] bg-[#ead7ff] sm:min-h-[560px] md:col-span-2 lg:col-span-1 lg:h-[650px]">
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
