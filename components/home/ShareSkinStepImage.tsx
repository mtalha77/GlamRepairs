"use client";

import Image from "next/image";
import AnimatedSlideIn from "@/components/home/AnimatedSlideIn";
import ConcernPill from "@/components/home/ConcernPill";

const concernLabels: {
  label: string;
  icon: string;
  className: string;
  delay: number;
  pillWidthClassName?: string;
}[] = [
  {
    label: "ACNE SCARS",
    icon: "/svgs/Vector (5).svg",
    className: "absolute left-[38%] top-[4%] z-10",
    delay: 200,
  },
  {
    label: "PIMPLES",
    icon: "/svgs/Vector (6).svg",
    className: "absolute left-[50%] top-[32%] z-10 sm:top-[34%]",
    delay: 350,
  },
  {
    label: "BLACK HEADS",
    icon: "/svgs/Group 2085660670.svg",
    className: "absolute left-[34%] top-[66%] z-10",
    pillWidthClassName: "w-auto sm:w-[11.5rem]",
    delay: 500,
  },
];

type ShareSkinStepImageProps = {
  alt: string;
};

export default function ShareSkinStepImage({ alt }: ShareSkinStepImageProps) {
  return (
    <div className="relative aspect-square w-full overflow-hidden rounded-2xl bg-brand-light/30 sm:aspect-[433/415] sm:rounded-[25px]">
      <Image
        src="/images,svgs/woman-hand-.webp"
        alt={alt}
        fill
        sizes="(max-width: 1024px) 100vw, 400px"
        className="object-cover"
      />

      {concernLabels.map((item) => (
        <AnimatedSlideIn
          key={item.label}
          direction="right"
          delay={item.delay}
          className={`${item.className} max-sm:hidden`}
        >
          <ConcernPill
            label={item.label}
            icon={item.icon}
            widthClassName={item.pillWidthClassName}
          />
        </AnimatedSlideIn>
      ))}
    </div>
  );
}
