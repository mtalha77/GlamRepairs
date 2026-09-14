import type { AirQualityBandKey } from "@/lib/airQuality/provider";

/**
 * HANDOVER-22 §6 — what a reading means for skin, written once per band.
 *
 * "Write the guidance once per AQI band and reuse it across cities. The
 * city-specific content is the live data plus the seasonal note. That keeps
 * it honest and maintainable." Per-city guidance would be the same sentences
 * with a place name substituted, which is the doorway-page pattern this
 * whole approach exists to avoid.
 *
 * ⚠️ Medical boundary, non-negotiable. These lines describe what particulate
 * pollution does to skin and what to do about it on the surface. Nothing
 * here says anything about breathing, masks, respiratory symptoms, exercise
 * or who should stay indoors. That is health advice about a body system this
 * business has no standing to advise on, and the fact that every air-quality
 * site gives it is not a reason for us to.
 */

export type AirQualityBand = {
  key: AirQualityBandKey;
  /** OpenWeather's own wording for its 1–5 index. */
  label: string;
  /** Plain-language summary, in our voice. */
  summary: string;
  /** Practitioner-written, three or four lines. Skin only. */
  skinGuidance: string[];
  /** Tailwind classes for the reading card. */
  tone: string;
};

export const AIR_QUALITY_BANDS: Record<AirQualityBandKey, AirQualityBand> = {
  good: {
    key: "good",
    label: "Good",
    summary: "Particulate levels are low today.",
    skinGuidance: [
      "Nothing about your routine needs to change for the air today.",
      "Sunscreen still matters — UV is unrelated to particulate pollution, and on clear days it is usually higher, not lower.",
      "A day like this is a good one to judge whether a new product is suiting you, because the air is not adding a variable.",
    ],
    tone: "border-emerald-200 bg-emerald-50",
  },
  fair: {
    key: "fair",
    label: "Fair",
    summary: "Particulate levels are mild.",
    skinGuidance: [
      "Cleanse properly at night. Particulates settle on skin through the day and sit in the oil on the surface; a gentle cleanser removes them and a rinse does not.",
      "Keep the barrier intact — moisturiser morning and night. Skin with a compromised barrier reacts to pollution far more than skin with a working one.",
      "No need to add anything. Pollution is not a reason to buy an extra product; it is a reason to do the basics properly.",
    ],
    tone: "border-lime-200 bg-lime-50",
  },
  moderate: {
    key: "moderate",
    label: "Moderate",
    summary: "Particulate levels are raised.",
    skinGuidance: [
      "Cleanse thoroughly tonight, and do not skip it however late it is. This is the single step that matters most on a day like today.",
      "If you are prone to breakouts, expect a few more over the next several days — raised particulates and clogged pores travel together, and the spots usually arrive after the bad air, not during it.",
      "Hold off starting a new active today. An irritated barrier and dirty air together is how a reasonable product gets blamed for a reaction it did not cause.",
      "Moisturiser and sunscreen as normal. Neither becomes more or less important because of the air.",
    ],
    tone: "border-amber-200 bg-amber-50",
  },
  poor: {
    key: "poor",
    label: "Poor",
    summary: "Particulate levels are high.",
    skinGuidance: [
      "Cleanse as soon as you are home rather than at bedtime, if the day has been spent outside or in traffic.",
      "Keep the routine simple for a few days — cleanser, moisturiser, sunscreen. This is not the week to introduce an exfoliant or a retinoid.",
      "If your skin feels tight, itchy or looks blotchy, that is the barrier reacting. Moisturise more often and stop the actives rather than treating the redness with something new.",
      "Existing pigmentation may look darker for a few days. It usually settles; it is not the treatment failing.",
    ],
    tone: "border-orange-200 bg-orange-50",
  },
  veryPoor: {
    key: "veryPoor",
    label: "Very poor",
    summary: "Particulate levels are very high.",
    skinGuidance: [
      "Cleanse after being outside, every time. Nothing else in a routine does as much on a day like this.",
      "Pause every active — acids, retinoids, vitamin C — until the air improves. Cleanser, moisturiser, sunscreen only.",
      "Expect the week after a spell like this to be a bad one for breakouts and for dullness. That is the air, not your routine collapsing, and reacting to it by changing everything is how people end up worse off.",
      "If skin becomes painful, swollen or broken rather than simply irritated, that is beyond what a routine addresses — see a doctor.",
    ],
    tone: "border-red-200 bg-red-50",
  },
};
