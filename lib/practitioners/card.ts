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
