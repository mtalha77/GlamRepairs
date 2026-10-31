/**
 * The practitioner card's data, shared by the homepage deck, the
 * /practitioners grid, the profile page and the test portal. One shape, so
 * the four cannot drift (Handover 61 Part 1, Handover 63 Part 1).
 */

/** Colours for a sample profile's illustrated portrait. Data, not styling. */
export type SampleAvatar = {
  skin: string;
  hair: string;
  cloth: string;
  bg: string;
  shade: string;
  feature: string;
  style: "long" | "bun" | "wrap" | "crop";
};

/**
 * Talha, 30 October 2026: Ayma is always the recommended practitioner. She
 * leads every list and her card carries the badge; anyone can still choose
 * someone else.
 */
export const RECOMMENDED_SLUG = "ayma-arif";

/**
 * Handover 65 §2.3: "Recommended" on one card out of one or two reads as a
 * sales label, not a recommendation. Below three public practitioners she
 * still leads every list, without the badge.
 */
export const RECOMMENDED_BADGE_MIN = 3;
export const showRecommendedBadge = (publicCount: number) => publicCount >= RECOMMENDED_BADGE_MIN;

export type CardPractitioner = {
  slug: string;
  name: string;
  role: string;
  countryCode: string | null;
  countryName: string | null;
  photo: string | null;
  initials: string;
  avatar: SampleAvatar | null;
  sample: boolean;
  /** Carries the "Recommended" badge (see showRecommendedBadge). */
  recommended: boolean;
  years: number | null;
  reads: number | null;
  /** Null below ten real ratings: the stat is hidden, not shown as nothing. */
  rating: number | null;
  focus: string[];
  quote: string | null;
  credentialTitle: string | null;
  credentialRef: string | null;
  languages: string[];
  nextAvailableAt: string | null;
  price: string | null;
};

const DAY = 24 * 60 * 60 * 1000;

/** Whole days from today to the slot, in the reader's own timezone. */
export function daysUntil(iso: string, now = new Date()): number {
  const at = new Date(iso);
  const startOf = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  return Math.round((startOf(at) - startOf(now)) / DAY);
}

export function availabilityLabel(iso: string, now = new Date()): string {
  const days = daysUntil(iso, now);
  if (days <= 0) return "Today";
  if (days === 1) return "Tomorrow";
  if (days < 7) return `In ${days} days`;
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" }).format(new Date(iso));
}

export const firstName = (name: string) => name.split(" ")[0];
