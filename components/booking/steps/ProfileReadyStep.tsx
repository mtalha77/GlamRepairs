"use client";

import Image from "next/image";
import ProfileGlowMeter from "@/components/booking/ProfileGlowMeter";
import { StepHeader } from "@/components/steps";
import { useFunnelStore } from "@/lib/funnel/useFunnelStore";

const profileAvatar = "/images,svgs/women_porler.jpg";

const ANSWER_LABELS: Record<string, Record<string, string>> = {
  "booking.sleep": {
    minimal: "Minimal rest (less than 5 hours)",
    some: "I get some shut-eye (5-6 hours)",
    "long-well": "I sleep long and well (7-8 hours)",
    "like-to-sleep": "I like to sleep (8+ hours)",
  },
  "booking.stress": {
    "yes-every-day": "Yes, every day",
    often: "Often",
    rarely: "Rarely",
    never: "Never",
  },
  "booking.waterIntake": {
    "coffee-tea-only": "I only have coffee or tea",
    "two-glasses": "About 2 glasses (16 oz.)",
    "two-to-six": "2 to 6 glasses (16 - 48 oz.)",
    "more-than-six": "More than 6 glasses",
  },
  "booking.dailyRoutine": {
    "morning-and-evening": "Yes, I have a morning and an evening routine",
    "morning-only": "Only a morning one",
    "evening-only": "Only an evening one",
    none: "No, I don't have any routine",
  },
  "booking.moisturized": {
    yes: "Yes",
    "sometimes-tight": "Sometimes feel tightness",
    no: "No, can't live without moisturizer",
    "dont-know": "I don't know",
  },
  "booking.sunscreen": {
    always: "Always",
    sometimes: "Sometimes",
    rarely: "Rarely",
    never: "Never",
  },
};

const summaryFields: { label: string; answerKey: string }[] = [
  { label: "Sleep", answerKey: "booking.sleep" },
  { label: "Stress", answerKey: "booking.stress" },
  { label: "Water intake", answerKey: "booking.waterIntake" },
  { label: "Daily skincare routine", answerKey: "booking.dailyRoutine" },
  { label: "Skin well moisturized", answerKey: "booking.moisturized" },
  { label: "Sunscreen outdoors", answerKey: "booking.sunscreen" },
];

// Higher = healthier habit. Used to compute the overall glow score.
const ANSWER_SCORES: Record<string, Record<string, number>> = {
  "booking.sleep": {
    minimal: 20,
    some: 55,
    "long-well": 90,
    "like-to-sleep": 85,
  },
  "booking.stress": {
    "yes-every-day": 20,
    often: 45,
    rarely: 75,
    never: 95,
  },
  "booking.waterIntake": {
    "coffee-tea-only": 20,
    "two-glasses": 50,
    "two-to-six": 80,
    "more-than-six": 95,
  },
  "booking.dailyRoutine": {
    "morning-and-evening": 95,
    "morning-only": 60,
    "evening-only": 60,
    none: 20,
  },
  "booking.moisturized": {
    yes: 90,
    "sometimes-tight": 55,
    no: 30,
    "dont-know": 40,
  },
  "booking.sunscreen": {
    always: 95,
    sometimes: 60,
    rarely: 35,
    never: 15,
  },
};

function computeGlowScore(answers: Record<string, unknown>) {
  const scores: number[] = [];
  for (const key of Object.keys(ANSWER_SCORES)) {
    const answer = answers[key];
    if (typeof answer === "string" && ANSWER_SCORES[key][answer] !== undefined) {
      scores.push(ANSWER_SCORES[key][answer]);
    }
  }
  if (scores.length === 0) return 84;
  return Math.round(scores.reduce((sum, value) => sum + value, 0) / scores.length);
}

function getGlowZone(score: number) {
  if (score >= 70) {
    return {
      title: "Balanced glow",
      bg: "#4CD964",
      description:
        "Your routine is generally strong, with only minor adjustments needed. Focusing on consistent hydration and SPF can elevate your skin health further.",
    };
  }
  if (score >= 45) {
    return {
      title: "Getting there",
      bg: "#F9B233",
      description:
        "You have a solid foundation. A few consistent habits (better hydration, sleep, and daily sunscreen) will noticeably improve your skin health.",
    };
  }
  return {
    title: "Needs attention",
    bg: "#F7931E",
    description:
      "Your current habits are putting stress on your skin. Building a consistent routine with hydration, quality sleep, and sun protection will make a big difference.",
  };
}

function SummaryField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="mb-1.5 text-sm text-brand-gray sm:text-[0.9375rem]">{label}</p>
      <div className="rounded-2xl border border-brand-border-light/60 bg-white px-4 py-3.5 shadow-sm sm:px-5 sm:py-4">
        <p className="text-sm leading-snug text-brand-ink sm:text-[0.9375rem]">
          {value}
        </p>
      </div>
    </div>
  );
}

export default function ProfileReadyStep() {
  const answers = useFunnelStore((state) => state.answers);
  const glowScore = computeGlowScore(answers);
  const zone = getGlowZone(glowScore);

  return (
    <div>
      <StepHeader title="Your profile is ready" />

      <div className="mt-5 sm:mt-6">
        <ProfileGlowMeter position={glowScore} />
      </div>

      <div
        className="rounded-2xl px-4 py-4 text-white sm:px-5 sm:py-5"
        style={{ backgroundColor: zone.bg }}
      >
        <h2 className="text-base font-semibold sm:text-lg">{zone.title}</h2>
        <p className="mt-2 text-sm leading-relaxed sm:text-[0.9375rem]">
          {zone.description}
        </p>
      </div>

      <div className="mt-5 flex justify-center sm:mt-6">
        <div className="relative h-24 w-24 overflow-hidden rounded-full border-2 border-white shadow-sm sm:h-28 sm:w-28">
          <Image
            src={profileAvatar}
            alt="Your profile"
            fill
            sizes="(max-width: 640px) 96px, 112px"
            className="object-cover object-center"
          />
        </div>
      </div>

      <div className="mt-5 space-y-3 sm:mt-6 sm:space-y-3.5">
        {summaryFields.map((field) => {
          const answer = answers[field.answerKey];
          const value =
            typeof answer === "string"
              ? ANSWER_LABELS[field.answerKey]?.[answer] ?? answer
              : "Not answered yet";

          return (
            <SummaryField key={field.answerKey} label={field.label} value={value} />
          );
        })}
      </div>
    </div>
  );
}
