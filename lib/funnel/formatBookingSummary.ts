/**
 * Natural first-person WhatsApp summary for the current onboarding flow only.
 */

/** Labels kept for reference / any non-message use. */
export const BOOKING_ANSWER_LABELS: Record<string, string> = {
  "booking.skinType": "Skin type",
  "booking.improveArea": "Improve area",
  "booking.skinTone": "Skin tone",
  "booking.dailyRoutine": "Daily routine",
  "booking.skincareProducts": "Skincare products",
  "booking.location": "Location",
  "booking.improveGoals": "Improve goals",
  "booking.journeyFeel": "Journey feel",
  "booking.specialEvent": "Special event",
  "booking.eventDate": "Event date",
  "onboarding.firstName": "Name",
  "onboarding.email": "Email",
  "onboarding.age": "Age",
  "onboarding.gender": "Gender",
  "onboarding.city": "City",
  "onboarding.primaryConcern": "Primary concern",
  "onboarding.primaryConcernOther": "Primary concern (other)",
  "onboarding.concernDuration": "Concern duration",
  "onboarding.worseningFactors": "Worsening factors",
  "onboarding.sleep": "Sleep",
  "onboarding.water": "Water intake",
  "onboarding.stress": "Stress",
  "onboarding.diet": "Diet",
  "onboarding.photos": "Photos",
  "onboarding.consentPrivateReview": "Private review consent",
  "onboarding.consentMarketing": "Marketing consent",
};

/** Friendlier wording for common slug values in sentences. */
const VALUE_PHRASES: Record<string, string> = {
  dry: "dry",
  normal: "normal",
  oily: "oily",
  combination: "combination",
  "whole-face": "my whole face",
  forehead: "my forehead",
  eyes: "my eyes / under-eye area",
  cheeks: "my cheeks",
  "nose-tzone": "my nose & T-zone",
  "chin-jawline": "my chin & jawline",
  neck: "my neck",
  "acne-breakouts": "acne & breakouts",
  "dark-spots": "dark spots & pigmentation",
  dryness: "dryness & flakiness",
  oiliness: "oiliness & large pores",
  "uneven-tone": "uneven skin tone",
  "acne-scars": "acne scars & marks",
  sensitivity: "sensitivity & redness",
  "fine-lines": "fine lines & dullness",
  "under-1-month": "under 1 month",
  "1-6-months": "1–6 months",
  "about-a-year": "about a year",
  "several-years": "several years",
  "most-of-life": "most of my life",
  "morning-and-evening": "a morning and evening routine",
  "morning-only": "only a morning routine",
  "evening-only": "only an evening routine",
  none: "no regular skincare routine",
  low: "low",
  moderate: "moderate",
  high: "high",
  "very-high": "very high",
  dairy: "a lot of dairy",
  "sugar-fried": "a lot of sugar / fried food",
  "tea-coffee": "tea or coffee daily",
  "home-cooked": "mostly home-cooked food",
  "skip-meals": "skipping meals regularly",
  "ingredient-knowledge": "knowledge of skincare ingredients",
  "skincare-consistency": "skincare consistency",
  "skincare-health": "skincare health",
  "self-care-routine": "a better self-care routine",
  "self-confidence": "more self confidence",
  "better-choices": "make better skincare choices",
  "relaxed-stress-free": "feel relaxed and stress-free",
  "control-skincare": "feel in control of my skincare",
  "confident-in-skin": "feel confident in my skin",
  "radiant-glowing": "have radiant, glowing skin",
  vacation: "a vacation",
  wedding: "a wedding",
  holiday: "a holiday",
  "sporting-event": "a sporting event",
  reunion: "a reunion",
  "family-occasion": "a family occasion",
  other: "something else",
  cleanser: "cleanser",
  "makeup-remover": "makeup remover",
  toner: "toner",
  moisturizer: "moisturizer",
  "treatment-eye": "eye treatment",
  "treatment-face": "face treatment",
  spf: "SPF",
  exfoliator: "exfoliator",
};

function humanizeSlug(value: string) {
  return value
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[-_]+/g, " ")
    .trim()
    .replace(/\s+/g, " ")
    .replace(/^./, (char) => char.toUpperCase());
}

function phrase(value: string) {
  if (VALUE_PHRASES[value]) return VALUE_PHRASES[value];
  return humanizeSlug(value).toLowerCase();
}

const SLEEP_PHRASES: Record<string, string> = {
  "under-5": "less than 5 hours",
  "5-6": "5–6 hours",
  "7-8": "7–8 hours",
  "over-8": "more than 8 hours",
};

const WATER_PHRASES: Record<string, string> = {
  "under-4": "less than 4 glasses",
  "4-6": "4–6 glasses",
  "7-8": "7–8 glasses",
  "over-8": "more than 8 glasses",
};

function asString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed.startsWith("data:")) return null;
  return trimmed;
}

function asList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string" && item.length > 0)
    .map((item) => phrase(item));
}

function joinNatural(parts: string[]) {
  if (parts.length === 0) return null;
  if (parts.length === 1) return parts[0];
  if (parts.length === 2) return `${parts[0]} and ${parts[1]}`;
  return `${parts.slice(0, -1).join(", ")}, and ${parts[parts.length - 1]}`;
}

function formatEventDate(iso: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!match) return iso;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export type BookingWhatsAppSummaryInput = {
  answers: Record<string, unknown>;
  fullName?: string;
  email?: string;
  sessionId?: string;
  selectedPlan?: string | null;
  planName?: string | null;
  planPrice?: string | null;
  /** Optional first line; defaults to a friendly greeting. */
  intro?: string;
};

/**
 * Conversational WhatsApp message from current-flow answers only.
 */
export function formatBookingWhatsAppMessage({
  answers,
  fullName,
  email,
  sessionId,
  selectedPlan,
  planName,
  planPrice,
  intro = "Hi Glam Repair!",
}: BookingWhatsAppSummaryInput) {
  const name =
    fullName?.trim() ||
    asString(answers["onboarding.firstName"]) ||
    "";
  const age = asString(answers["onboarding.age"]);
  const gender = asString(answers["onboarding.gender"]);
  const city =
    asString(answers["onboarding.city"]) ||
    asString(answers["booking.location"]);
  const mail =
    email?.trim() || asString(answers["onboarding.email"]) || "";

  const skinType = asString(answers["booking.skinType"]);
  const skinTone = asString(answers["booking.skinTone"]);
  const improveAreas = (() => {
    const raw = answers["booking.improveArea"];
    if (typeof raw === "string" && raw.trim()) return [phrase(raw.trim())];
    return asList(raw);
  })();
  const primaryConcernRaw = answers["onboarding.primaryConcern"];
  const primaryConcerns = (() => {
    if (typeof primaryConcernRaw === "string" && primaryConcernRaw.trim()) {
      return [primaryConcernRaw.trim()];
    }
    if (!Array.isArray(primaryConcernRaw)) return [];
    return primaryConcernRaw.filter(
      (item): item is string => typeof item === "string" && item.length > 0,
    );
  })();
  const concernOther = asString(answers["onboarding.primaryConcernOther"]);
  const duration = asString(answers["onboarding.concernDuration"]);
  const worsening = asString(answers["onboarding.worseningFactors"]);
  const routine = asString(answers["booking.dailyRoutine"]);
  const products = asList(answers["booking.skincareProducts"]).filter(
    (item) => item !== "none",
  );
  const sleep = asString(answers["onboarding.sleep"]);
  const water = asString(answers["onboarding.water"]);
  const stress = asString(answers["onboarding.stress"]);
  const diet = asList(answers["onboarding.diet"]);
  const goals = asList(answers["booking.improveGoals"]);
  const journeyFeel = asList(answers["booking.journeyFeel"]);
  const specialEvent = asString(answers["booking.specialEvent"]);
  const eventDate = asString(answers["booking.eventDate"]);

  const paragraphs: string[] = [intro];

  // Who I am
  const who: string[] = [];
  if (name) who.push(`My name is ${name}.`);
  const ageBits: string[] = [];
  if (age) ageBits.push(`${age} years old`);
  if (gender) ageBits.push(phrase(gender));
  if (ageBits.length) {
    who.push(`I am ${joinNatural(ageBits)}.`);
  }
  if (city) who.push(`I live in ${city}.`);
  if (who.length) paragraphs.push(who.join(" "));

  // Skin issues
  const issueParts: string[] = [];
  if (skinType) {
    let skin = `I have ${phrase(skinType)} skin`;
    if (skinTone) skin += ` (${phrase(skinTone)} tone)`;
    skin += ".";
    issueParts.push(skin);
  } else if (skinTone) {
    issueParts.push(`My skin tone is ${phrase(skinTone)}.`);
  }

  if (primaryConcerns.length) {
    const concernLabels = primaryConcerns.map((item) =>
      item === "other" && concernOther ? concernOther : phrase(item),
    );
    let concern = `I have an issue with ${joinNatural(concernLabels)}`;
    const areas = joinNatural(improveAreas);
    if (areas) concern += ` on ${areas}`;
    concern += ".";
    issueParts.push(concern);
  } else if (improveAreas.length) {
    issueParts.push(`I want to improve ${joinNatural(improveAreas)}.`);
  }

  if (duration) {
    issueParts.push(`I've been dealing with this for ${phrase(duration)}.`);
  }
  if (worsening) {
    issueParts.push(`It gets worse with: ${worsening}.`);
  }
  if (issueParts.length) paragraphs.push(issueParts.join(" "));

  // What I want
  const wantParts: string[] = [];
  if (goals.length) {
    wantParts.push(`I want to improve ${joinNatural(goals)}.`);
  }
  if (journeyFeel.length) {
    wantParts.push(`I also want to ${joinNatural(journeyFeel)}.`);
  }
  if (specialEvent && specialEvent !== "none") {
    let eventLine = `I have ${phrase(specialEvent)} coming up`;
    if (eventDate) eventLine += ` on ${formatEventDate(eventDate)}`;
    eventLine += ".";
    wantParts.push(eventLine);
  } else if (specialEvent === "none") {
    wantParts.push("I don't have a special event — I just want to look and feel my best.");
  }
  if (wantParts.length) paragraphs.push(wantParts.join(" "));

  // Routine
  const routineParts: string[] = [];
  if (routine) {
    if (routine === "none") {
      routineParts.push("I don't have any skincare routine right now.");
    } else {
      routineParts.push(`I currently have ${phrase(routine)}.`);
    }
  }
  if (products.length) {
    routineParts.push(`Products I use: ${joinNatural(products)}.`);
  }
  if (routineParts.length) paragraphs.push(routineParts.join(" "));

  // Lifestyle
  const lifeBits: string[] = [];
  if (sleep) {
    lifeBits.push(`sleep ${SLEEP_PHRASES[sleep] ?? phrase(sleep)}`);
  }
  if (water) {
    lifeBits.push(`drink ${WATER_PHRASES[water] ?? phrase(water)} of water`);
  }
  if (stress) lifeBits.push(`${phrase(stress)} stress`);
  if (lifeBits.length || diet.length) {
    let life = "";
    if (lifeBits.length) {
      life = `My lifestyle: ${joinNatural(lifeBits)}.`;
    }
    if (diet.length) {
      life += life
        ? ` Diet-wise, I have ${joinNatural(diet)}.`
        : `Diet-wise, I have ${joinNatural(diet)}.`;
    }
    paragraphs.push(life);
  }

  // Plan
  if (planName || selectedPlan || planPrice) {
    const planLabel = planName || selectedPlan;
    let planLine = planLabel
      ? `I want the ${planLabel} plan`
      : "I want to continue with a plan";
    if (planPrice) planLine += ` (${planPrice})`;
    planLine += ".";
    paragraphs.push(planLine);
  }

  paragraphs.push("Please guide me with the next steps.");

  // Team extras (short)
  const extras: string[] = [];
  if (mail) extras.push(`Email: ${mail}`);
  if (sessionId) extras.push(`Ref: ${sessionId.slice(0, 8)}`);

  // Deliberately no photo links in this text — see the storage-lockdown
  // handover. A link pasted into WhatsApp becomes a permanent, un-revocable
  // copy of a client's face on Meta's infrastructure, on top of whatever this
  // app's own access controls do. Photos are reviewed inside the studio,
  // signed in, never via a link in a message.
  const photos = answers["onboarding.photos"];
  if (Array.isArray(photos)) {
    const count = photos.filter(
      (item) => typeof item === "string" && item.length > 0,
    ).length;
    if (count > 0) {
      extras.push(
        `Photos submitted with this assessment (${count}) — our team will review them in the portal.`,
      );
    }
  }

  if (extras.length) {
    paragraphs.push(extras.join("\n"));
  }

  return paragraphs.join("\n\n");
}
