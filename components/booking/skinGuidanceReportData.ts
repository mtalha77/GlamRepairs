export const reportPatient = {
  clientName: "Ayesha",
  concern: "Dark patches and uneven tone",
  plan: "Core Skin Plan",
  reportDate: "24/05/2026",
  gender: "Female",
  age: "26 years",
  duration: "14-day starter",
  location: "City, Country",
} as const;

export const reportPhotos = [
  "/images,svgs/Rectangle 3467729.webp",
  "/images,svgs/Rectangle 3467730.webp",
] as const;

export const reportNoticedItems = [
  {
    title: "Sun protection gap",
    description:
      "Low sunscreen use may be making dark marks more stubborn over time.",
    icon: "/svgs/Sun_Allergy.svg",
  },
  {
    title: "Sensitive areas",
    description:
      "Some sensitivity noted, including past fairness cream use. A gentle approach is safest.",
    icon: "/svgs/Group 2085660851.svg",
  },
] as const;

export const morningRoutine = [
  {
    week: "Week 1",
    text: "Cleanse with a gentle, fragrance-free face wash.",
  },
  {
    week: "Week 2",
    text: "Apply a light moisturiser if skin feels dry or tight.",
  },
  {
    week: "Week 2",
    text: "Broad-spectrum sunscreen every single morning. Reapply outdoors.",
  },
] as const;

export const nightRoutine = [
  {
    week: "Week 1",
    text: "Cleanse gently to remove the day's buildup.",
  },
  {
    week: "Week 2",
    text: "Apply a basic moisturiser and let skin rest.",
  },
  {
    week: "Week 2",
    text: "Keep it to two products for the first two weeks. Simplicity is the goal.",
  },
] as const;

export const avoidItems = [
  "Unlabelled creams",
  "Steroid creams",
  "Harsh scrubs",
  "Lemon or toothpaste",
  "Mixed home remedies",
  "Multiple active serums at once",
] as const;

export const monitoringNote = {
  title: "Sun protection gap",
  description:
    "Take photos in the same light at the same time each week. If you notice irritation, burning, swelling, or fast-spreading patches, pause and seek in-person care.",
  icon: "/svgs/Sun_Allergy.svg",
} as const;
