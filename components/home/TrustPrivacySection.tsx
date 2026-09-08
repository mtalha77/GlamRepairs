"use client";

import Image from "next/image";
import AnimatedSlideIn from "@/components/home/AnimatedSlideIn";
import SkinAssessmentCta from "@/components/home/SkinAssessmentCta";
import TrustPrivacyCard from "@/components/home/TrustPrivacyCard";

const cardTopOffsets = ["lg:-mt-20", "lg:-mt-12", "lg:-mt-4"] as const;

/**
 * HOTFIX-10 §3 — "Never Shared Publicly" was a copy-paste of the first
 * card's body, live on the homepage for every visitor. It now has its own
 * copy about not sharing or selling.
 *
 * ⚠️ Accuracy constraint, deliberately observed: every claim here has to be
 * true of the system as it stands TODAY, not only after the storage
 * lockdown finishes. The assessment-photos bucket is still public
 * (HANDOVER-6 §1 shipped the application half — the auth-gated /p/ route,
 * short-lived signed URLs, and no photo links in outbound messages — but
 * the bucket flip itself is still waiting on the owner's go-ahead). So the
 * first card no longer asserts "a private internal system"; it describes
 * the access control that genuinely exists, which is also exactly what
 * stays true once the bucket is flipped. Do not reintroduce a storage
 * claim here until `storage.buckets.public` is false for that bucket.
 */
const privacyCards = [
  {
    title: "Private & Secure Storage",
    description:
      "Your photos are only opened inside our practitioner portal, which requires a sign-in. Only the practitioner assigned to your case can view them.",
    icon: "/icons/guard_icon.svg",
  },
  {
    title: "Never Shared Publicly",
    description:
      "We never publish your photos, use them in marketing, or sell them. They are never attached to messages or shown to anyone outside the practitioner working on your case.",
  },
  {
    title: "Deletion On Request",
    description:
      "After your report is delivered, you can request complete deletion of your photos from our system at any time.",
    icon: "/icons/bin_icon.svg",
  },
];

export default function TrustPrivacySection() {
  return (
    <section className="relative overflow-hidden bg-white px-4 sm:px-6 lg:px-12">
      <div className="relative -mx-4 aspect-[4/3] min-h-[16rem] w-auto sm:-mx-6 sm:aspect-[1440/668] sm:min-h-[26rem] lg:-mx-12 lg:min-h-[32rem]">
        <Image
          src="/images,svgs/privacy_bubbles_bg.png"
          alt=""
          fill
          sizes="100vw"
          className="-scale-x-100 object-cover object-center"
          priority={false}
        />

        <div className="absolute inset-0 px-4 sm:px-6 lg:px-12">
          <div className="mx-auto flex h-full max-w-7xl items-start pt-6 sm:pt-10 lg:pt-12">
            <AnimatedSlideIn
              direction="left"
              className="max-w-full md:mx-auto md:max-w-[34rem] lg:-ml-5 lg:mx-0 lg:max-w-none"
            >
              <header>
                <h2 className="flex flex-wrap items-baseline gap-x-2 leading-none text-[#fdf6e4] text-[1.875rem] sm:text-[3rem] lg:text-[3.875rem]">
                  <span className="font-sans font-normal tracking-[-0.02em]">
                    Trust
                  </span>
                  <span className="font-serif italic">and Privacy</span>
                </h2>
                <p className="mt-2 hidden font-sans font-medium text-brand-ink sm:mt-4 sm:block sm:text-lg lg:text-[1.25rem]">
                  Your privacy is non-negotiable.
                </p>
                <p className="mt-2 hidden font-sans font-normal leading-normal text-brand-ink sm:mt-3 sm:block sm:text-base lg:text-[1.25rem]">
                  You&apos;re sharing photos of your skin. We take that
                  seriously.
                </p>
              </header>
            </AnimatedSlideIn>
          </div>
        </div>
      </div>

      <div className="relative z-10 mx-auto max-w-7xl">
        <div className="-mt-16 grid grid-cols-1 place-items-center gap-12 sm:-mt-32 md:grid-cols-2 md:gap-x-6 md:gap-y-16 lg:-ml-10 lg:-mt-40 lg:flex lg:flex-row lg:items-start lg:gap-0">
          {privacyCards.map((card, index) => (
            <AnimatedSlideIn
              key={card.title}
              direction="up"
              delay={index * 150}
              className={`w-full shrink-0 sm:w-[20rem] lg:w-auto ${
                index === 2 ? "md:col-span-2 md:justify-self-center" : ""
              } ${cardTopOffsets[index]}`}
            >
              <TrustPrivacyCard {...card} />
            </AnimatedSlideIn>
          ))}
        </div>
      </div>

      <div className="relative -mx-4 mt-8 bg-white pb-12 pt-16 sm:-mx-6 sm:mt-12 sm:pb-20 sm:pt-28 lg:-mx-12 lg:pb-24 lg:pt-32">
        <AnimatedSlideIn
          direction="up"
          className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-12"
        >
          <h3 className="text-brand-primary text-2xl leading-snug sm:text-4xl lg:text-[3.25rem] lg:leading-[1.25]">
            <span className="font-sans italic tracking-[-0.015em]">
              The consultation you&apos;ve been putting off
            </span>{" "}
            <span className="font-serif italic">- done in 24 hours.</span>
          </h3>
          <SkinAssessmentCta
            label="GET MY SKIN GUIDANCE"
            size="lg"
            className="mt-8 sm:mt-10"
          />
        </AnimatedSlideIn>
      </div>
    </section>
  );
}
