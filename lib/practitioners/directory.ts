import "server-only";

import { unstable_cache } from "next/cache";

import { formatMoney } from "@/lib/pricing/money";
import type { PricingRegion } from "@/lib/pricing/regions";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { RECOMMENDED_SLUG, showRecommendedBadge, type CardPractitioner, type SampleAvatar } from "@/lib/practitioners/card";

/**
 * Handover 63 (and 61 Part 1): who appears on the practitioner card.
 *
 * Real practitioners come only from `practitioner_public`, the view that is
 * the boundary: approved, consented, accepting clients, country never city,
 * no contact details or rates. Sample profiles come from their own table and
 * are read only by the test portal, so they can never reach the public
 * directory, the homepage or the three-practitioner count.
 */

/**
 * Below this many public practitioners the directory and its "choose" deck
 * do not exist. Talha, 30 October 2026: two for now (Handover 63 said
 * three). Below it the homepage still shows the recommended practitioner's
 * card on its own.
 */
export const DIRECTORY_MIN_PRACTITIONERS = 2;

type PublicRow = {
  id: string;
  slug: string;
  display_name: string;
  role_title: string;
  country_code: string | null;
  country_name: string | null;
  photo_path: string | null;
  avatar_initials: string | null;
  years_practising: number | null;
  assessments_count: number | null;
  rating: number | null;
  rating_count: number;
  focus_areas: string[] | null;
  practitioner_quote: string | null;
  credential_title: string | null;
  credential_ref: string | null;
  languages: string[] | null;
  next_available_at: string | null;
  bio: string | null;
  profile_story: string | null;
  focus_notes: Record<string, string> | null;
  timezone: string | null;
  degree_verified: boolean;
};

/** What the full profile page reads beyond the card. */
export type PublicProfile = {
  id: string;
  card: CardPractitioner;
  bio: string | null;
  story: string[];
  /** Focus area to the practitioner's own sentence on it, in card order. */
  focusNotes: { area: string; note: string | null }[];
  timezone: string | null;
  degreeVerified: boolean;
};

/** The price a visitor would pay, from their own market. Never from the view. */
export function visitorPrice(region: PricingRegion): string | null {
  const minor = region.pricesMinor.transform;
  return minor > 0 ? formatMoney(minor, region.currency, region.minorUnits, region.code) : null;
}

function fromPublic(row: PublicRow, price: string | null): CardPractitioner {
  return {
    slug: row.slug,
    name: row.display_name,
    role: row.role_title,
    countryCode: row.country_code,
    countryName: row.country_name,
    photo: row.photo_path,
    initials: row.avatar_initials ?? row.display_name.slice(0, 2).toUpperCase(),
    avatar: null,
    sample: false,
    recommended: row.slug === RECOMMENDED_SLUG,
    years: row.years_practising,
    reads: row.assessments_count,
    rating: row.rating_count >= 10 ? row.rating : null,
    focus: (row.focus_areas ?? []).slice(0, 3),
    quote: row.practitioner_quote,
    credentialTitle: row.credential_title,
    credentialRef: row.credential_ref,
    languages: row.languages ?? [],
    nextAvailableAt: row.next_available_at,
    price,
  };
}

/**
 * The view's rows, shared across requests for five minutes (Handover 65
 * §3.2). practitioner_public runs correlated counts over reports and
 * feedback per row, and every public page that shows a card read it fresh
 * on every request, the directory twice (metadata and page). The rows hold
 * no visitor-specific data; the visitor's price is applied after. Studio
 * changes that affect them call revalidateTag(PRACTITIONERS_TAG).
 */
export const PRACTITIONERS_TAG = "practitioner-public";

const publicRows = unstable_cache(
  async (): Promise<PublicRow[]> => {
    const { data, error } = await createAdminSupabaseClient()
      .from("practitioner_public")
      .select("*")
      .order("next_available_at", { ascending: true, nullsFirst: false })
      .order("display_name");
    // Thrown, not returned, so a failed read is never cached.
    if (error) throw new Error(error.message);
    return (data ?? []) as PublicRow[];
  },
  ["practitioner-public-rows"],
  { revalidate: 300, tags: [PRACTITIONERS_TAG] },
);

async function readPublicRows(): Promise<PublicRow[] | null> {
  try {
    return await publicRows();
  } catch (err) {
    console.error("[practitioners] list", (err as Error).message);
    return null;
  }
}

/** Every public practitioner: the recommended one first, then soonest available. */
export async function listPublicPractitioners(price: string | null): Promise<CardPractitioner[]> {
  const rows = (await readPublicRows()) ?? [];
  const cards = rows
    .map((row) => fromPublic(row, price))
    .sort((a, b) => Number(b.slug === RECOMMENDED_SLUG) - Number(a.slug === RECOMMENDED_SLUG));
  // Ayma still leads every list; the badge only appears once there is a
  // real choice to recommend within (Handover 65 §2.3).
  const badge = showRecommendedBadge(cards.length);
  return cards.map((c) => ({ ...c, recommended: badge && c.recommended }));
}

export async function getPublicPractitioner(slug: string, price: string | null): Promise<PublicProfile | null> {
  const row = ((await readPublicRows()) ?? []).find((r) => r.slug === slug);
  if (!row) return null;
  const card = fromPublic(row, price);
  const notes = row.focus_notes ?? {};
  return {
    id: row.id,
    card,
    bio: row.bio,
    story: (row.profile_story ?? "")
      .split(/\n\s*\n/)
      .map((para) => para.trim())
      .filter(Boolean),
    focusNotes: card.focus.map((area) => ({ area, note: typeof notes[area] === "string" ? notes[area] : null })),
    timezone: row.timezone,
    degreeVerified: row.degree_verified,
  };
}

/**
 * The next few open video call times, for display on the profile. Same
 * window as the view's `next_available_at`: nothing inside the lead time.
 */
export async function nextOpenSlots(practitionerId: string, limit = 3): Promise<string[]> {
  const { data, error } = await createAdminSupabaseClient()
    .from("availability_slots")
    .select("starts_at")
    .eq("practitioner_id", practitionerId)
    .eq("status", "open")
    .gt("starts_at", new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString())
    .order("starts_at")
    .limit(limit);
  if (error) console.error("[practitioners] slots", error.message);
  return (data ?? []).map((s) => s.starts_at as string);
}

/** The gate, counted from the same view the cards read. */
export async function directoryIsOpen(): Promise<boolean> {
  const rows = await readPublicRows();
  return (rows?.length ?? 0) >= DIRECTORY_MIN_PRACTITIONERS;
}

type SampleRow = {
  slug: string;
  display_name: string;
  role_title: string;
  country_code: string;
  country_name: string;
  avatar: SampleAvatar;
  years_practising: number;
  assessments_count: number;
  rating: number | null;
  rating_count: number;
  focus_areas: string[];
  practitioner_quote: string;
  credential_title: string;
  credential_ref: string;
  languages: string[];
  next_in_days: number;
};

/**
 * The five sample profiles, for the test portal. Each carries the anchor
 * price set for its own country (Handover 62), read from country_pricing,
 * so the demo shows what a visitor there would actually be quoted.
 */
export async function listSamplePractitioners(): Promise<CardPractitioner[]> {
  const admin = createAdminSupabaseClient();
  const [{ data: samples, error }, { data: prices }] = await Promise.all([
    admin.from("practitioner_samples").select("*").order("sort_order"),
    admin
      .from("country_pricing")
      .select("country_code, currency, amount_minor, minor_units")
      .eq("plan_key", "transform")
      .eq("active", true),
  ]);
  if (error) console.error("[practitioners] samples", error.message);
  const priceBy = new Map(
    (prices ?? []).map((p) => [p.country_code, p.amount_minor ? formatMoney(p.amount_minor, p.currency, p.minor_units, p.country_code) : null]),
  );
  const day = 24 * 60 * 60 * 1000;
  return ((samples ?? []) as SampleRow[]).map((s) => ({
    slug: s.slug,
    name: s.display_name,
    role: s.role_title,
    countryCode: s.country_code,
    countryName: s.country_name,
    photo: null,
    initials: s.display_name
      .split(" ")
      .slice(0, 2)
      .map((w) => w[0])
      .join("")
      .toUpperCase(),
    avatar: s.avatar,
    sample: true,
    recommended: false,
    years: s.years_practising,
    reads: s.assessments_count,
    rating: s.rating_count >= 10 ? s.rating : null,
    focus: s.focus_areas.slice(0, 3),
    quote: s.practitioner_quote,
    credentialTitle: s.credential_title,
    credentialRef: s.credential_ref,
    languages: s.languages,
    nextAvailableAt: new Date(Date.now() + s.next_in_days * day).toISOString(),
    price: priceBy.get(s.country_code) ?? null,
  }));
}
