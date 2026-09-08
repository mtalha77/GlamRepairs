"use client";

import Link from "next/link";
import type { ComponentProps } from "react";
import AnimatedSlideIn from "@/components/home/AnimatedSlideIn";

import { BOOKING_START_HREF } from "@/components/booking/bookingConfig";

const guidanceSizeStyles = {
  sm: "w-full px-8 py-3.5 text-xs tracking-[0.12em] sm:w-auto sm:px-12 sm:py-4 sm:text-base sm:tracking-[0.15em] lg:whitespace-nowrap",
  md: "w-full px-8 py-3.5 text-sm tracking-[0.12em] sm:w-auto sm:px-12 sm:py-4 sm:text-[1.2rem] sm:tracking-[0.15em] lg:whitespace-nowrap",
  lg: "w-full px-10 py-4 text-sm tracking-[0.12em] sm:w-auto sm:px-16 sm:py-5 sm:text-lg sm:tracking-[0.15em] lg:whitespace-nowrap",
} as const;

type GuidanceSize = keyof typeof guidanceSizeStyles;
type SkinAssessmentCtaVariant = "guidance" | "analysis" | "hero";

type SkinAssessmentCtaProps = Omit<ComponentProps<typeof Link>, "href"> & {
  variant?: SkinAssessmentCtaVariant;
  label?: string;
  size?: GuidanceSize;
  className?: string;
  href?: string;
};

export default function SkinAssessmentCta({
  variant = "guidance",
  label = "GET MY SKIN ASSESSMENT",
  size = "sm",
  className = "",
  href = BOOKING_START_HREF,
  ...props
}: SkinAssessmentCtaProps) {
  if (variant === "hero") {
    return (
      <AnimatedSlideIn
        direction="up"
        className={`mx-auto mt-8 w-full max-w-sm sm:mt-10 sm:w-auto sm:max-w-none lg:mx-0 ${className}`.trim()}
      >
        <Link
          href={href}
          className="gr-btn cta-fill-btn inline-block w-full cursor-pointer rounded-full bg-white/20 px-8 py-3.5 text-center text-sm font-medium tracking-[0.15em] text-white backdrop-blur-sm sm:w-auto sm:px-10 sm:py-4 sm:text-base lg:whitespace-nowrap"
          {...props}
        >
          {label}
        </Link>
      </AnimatedSlideIn>
    );
  }

  if (variant === "analysis") {
    return (
      <Link
        href={href}
        className={`gr-btn analysis-fill-btn inline-block cursor-pointer whitespace-nowrap rounded-full bg-white px-6 py-3 text-xs font-normal tracking-[0.15em] sm:px-8 sm:py-3.5 sm:text-sm ${className}`.trim()}
        {...props}
      >
        {label}
      </Link>
    );
  }

  return (
    <Link
      href={href}
      className={`gr-btn guidance-fill-btn mx-auto block cursor-pointer rounded-full border border-brand-border-light bg-white text-center font-normal tracking-[0.15em] text-brand-light ${guidanceSizeStyles[size]} ${className}`.trim()}
      {...props}
    >
      {label}
    </Link>
  );
}
