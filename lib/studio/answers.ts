import { BOOKING_ANSWER_LABELS } from "@/lib/funnel/formatBookingSummary";

const HIDDEN_KEYS = new Set([
  "onboarding.photos",
  "booking.selfie",
  "booking.locationLat",
  "booking.locationLon",
]);

const ANSWER_QUESTIONS: Record<string, string> = {
  "booking.skinType": "What is your skin type?",
  "booking.improveArea": "What areas would you like to improve?",
  "booking.skinTone": "What is the color closest to your skin tone?",
  "booking.dailyRoutine": "Do you have a daily skincare routine?",
  "booking.skincareProducts": "Which skincare products do you use?",
  "booking.location": "Where do you live?",
  "booking.improveGoals": "I hope Glam will help me improve my…",
  "booking.journeyFeel": "During my Glam skincare journey, I want to feel…",
  "booking.specialEvent": "Do you have a special event coming up?",
  "booking.eventDate": "When is your event?",
  "onboarding.firstName": "What is your name?",
  "onboarding.email": "What is your email?",
  "onboarding.age": "How old are you?",
  "onboarding.gender": "What is your gender?",
  "onboarding.city": "Which city do you live in?",
  "onboarding.primaryConcern": "What is your main skin concern right now?",
  "onboarding.primaryConcernOther": "If other, what is your main skin concern?",
  "onboarding.concernDuration": "How long have you been dealing with this?",
  "onboarding.worseningFactors":
    "Is there anything that makes it worse? (e.g. stress, food, season, products)",
  "onboarding.sleep": "How much sleep do you usually get?",
  "onboarding.water": "What is your daily water intake?",
  "onboarding.stress": "What is your stress level?",
  "onboarding.diet": "Diet (select all that apply)",
  "onboarding.consentPrivateReview": "Do you consent to a private skin review?",
  // HOTFIX-7 §3: this label was backwards — the checkbox is "my photos will
  // NOT be used for marketing", so "Do you consent to marketing updates?"
  // read as the opposite of what was agreed. Renamed key to match.
  "onboarding.photoMarketingRestriction":
    "Do you require photos not be used for marketing?",
};

const QUESTION_ORDER = [
  "onboarding.firstName",
  "onboarding.age",
  "onboarding.gender",
  "onboarding.email",
  "onboarding.city",
  "booking.location",
  "booking.skinType",
  "booking.skinTone",
  "booking.improveArea",
  "onboarding.primaryConcern",
  "onboarding.primaryConcernOther",
  "onboarding.concernDuration",
  "onboarding.worseningFactors",
  "booking.dailyRoutine",
  "booking.skincareProducts",
  "onboarding.sleep",
  "onboarding.water",
  "onboarding.stress",
  "onboarding.diet",
  "booking.improveGoals",
  "booking.journeyFeel",
  "booking.specialEvent",
  "booking.eventDate",
  "onboarding.consentPrivateReview",
  "onboarding.photoMarketingRestriction",
];

const VALUE_LABELS: Record<string, string> = {
  dry: "Dry",
  normal: "Normal",
  oily: "Oily",
  combination: "Combination",
  "whole-face": "Whole face",
  forehead: "Forehead",
  eyes: "Eyes / under-eye",
  cheeks: "Cheeks",
  "nose-tzone": "Nose & T-zone",
  "chin-jawline": "Chin & jawline",
  neck: "Neck",
  "acne-breakouts": "Acne & breakouts",
  "dark-spots": "Dark spots & pigmentation",
  dryness: "Dryness & flakiness",
  oiliness: "Oiliness & large pores",
  "uneven-tone": "Uneven skin tone",
  "acne-scars": "Acne scars & marks",
  sensitivity: "Sensitivity & redness",
  "fine-lines": "Fine lines & dullness",
  "under-1-month": "Just started (under 1 month)",
  "1-6-months": "A few months (1–6 months)",
  "about-a-year": "About a year",
  "several-years": "Several years",
  "most-of-life": "Most of my life",
  "morning-and-evening": "Morning and evening",
  "morning-only": "Morning only",
  "evening-only": "Evening only",
  none: "None",
  low: "Low",
  moderate: "Moderate",
  high: "High",
  "very-high": "Very high",
  dairy: "I eat a lot of dairy",
  "sugar-fried": "I eat a lot of sugar / fried food",
  "tea-coffee": "I drink tea or coffee daily",
  "home-cooked": "I eat mostly home-cooked food",
  "skip-meals": "I skip meals regularly",
  female: "Female",
  male: "Male",
  "prefer-not-to-say": "Prefer not to say",
  "very-fair": "Very fair",
  fair: "Fair",
  medium: "Medium",
  olive: "Olive",
  brown: "Brown",
  "dark-brown": "Dark brown",
  vacation: "Vacation",
  wedding: "Wedding",
  holiday: "Holiday",
  "sporting-event": "Sporting event",
  reunion: "Reunion",
  "family-occasion": "Family occasion",
  other: "Other",
};

const SLEEP_LABELS: Record<string, string> = {
  "under-5": "Less than 5 hours",
  "5-6": "5–6 hours",
  "7-8": "7–8 hours",
  "over-8": "More than 8 hours",
};

const WATER_LABELS: Record<string, string> = {
  "under-4": "Less than 4 glasses",
  "4-6": "4–6 glasses",
  "7-8": "7–8 glasses",
  "over-8": "More than 8 glasses",
};

function humanizeSlug(value: string) {
  return value
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[-_]+/g, " ")
    .trim()
    .replace(/\s+/g, " ")
    .replace(/^./, (char) => char.toUpperCase());
}

function formatScalar(key: string, value: string): string {
  if (key === "onboarding.sleep") return SLEEP_LABELS[value] ?? value;
  if (key === "onboarding.water") return WATER_LABELS[value] ?? value;
  if (value === "true" || value === "false") {
    return value === "true" ? "Yes" : "No";
  }
  return VALUE_LABELS[value] ?? humanizeSlug(value);
}

function formatValue(key: string, value: unknown): string | null {
  if (value == null) return null;
  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed || trimmed.startsWith("data:")) return null;
    return formatScalar(key, trimmed);
  }
  if (typeof value === "number") {
    return String(value);
  }
  if (Array.isArray(value)) {
    const parts = value
      .map((item) => formatValue(key, item))
      .filter((item): item is string => Boolean(item));
    return parts.length > 0 ? parts.join(", ") : null;
  }
  if (typeof value === "object") {
    try {
      return JSON.stringify(value);
    } catch {
      return null;
    }
  }
  return null;
}

function questionForKey(key: string) {
  if (ANSWER_QUESTIONS[key]) return ANSWER_QUESTIONS[key];
  const label = BOOKING_ANSWER_LABELS[key];
  if (label) return `What is your ${label.toLowerCase()}?`;
  const last = key.split(".").pop() ?? key;
  return `What is your ${humanizeSlug(last).toLowerCase()}?`;
}

export function getCustomerAnswerValue(
  answers: Record<string, unknown> | null | undefined,
  key: string,
): string | null {
  if (!answers) return null;
  return formatValue(key, answers[key]);
}

export type AnswerRow = {
  key: string;
  label: string;
  value: string;
};

export function formatCustomerAnswers(
  answers: Record<string, unknown> | null | undefined,
): AnswerRow[] {
  if (!answers) return [];

  const rows = Object.entries(answers)
    .filter(([key]) => !HIDDEN_KEYS.has(key))
    .map(([key, raw]) => {
      const value = formatValue(key, raw);
      if (!value) return null;
      return {
        key,
        label: questionForKey(key),
        value,
      };
    })
    .filter((row): row is AnswerRow => row !== null);

  const rank = new Map(QUESTION_ORDER.map((key, index) => [key, index]));
  return rows.sort((a, b) => {
    const aRank = rank.get(a.key) ?? QUESTION_ORDER.length;
    const bRank = rank.get(b.key) ?? QUESTION_ORDER.length;
    if (aRank !== bRank) return aRank - bRank;
    return a.key.localeCompare(b.key);
  });
}
