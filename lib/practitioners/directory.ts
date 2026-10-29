import "server-only";

import { formatMoney } from "@/lib/pricing/money";
import type { PricingRegion } from "@/lib/pricing/regions";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import type { CardPractitioner, SampleAvatar } from "@/lib/practitioners/card";

/**
 * Handover 63 (and 61 Part 1): who appears on the practitioner card.
 *
 * Real practitioners come only from `practitioner_public`, the view that is
 * the boundary: approved, consented, accepting clients, country never city,
 * no contact details or rates. Sample profiles come from their own table and
 * are read only by the test portal, so they can never reach the public
 * directory, the homepage or the three-practitioner count.
 */

/** Below this many approved practitioners the deck and the directory do not exist. */
export const DIRECTORY_MIN_PRACTITIONERS = 3;

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

/** Every public practitioner, soonest available first. */
export async function listPublicPractitioners(price: string | null): Promise<CardPractitioner[]> {
  const { data, error } = await createAdminSupabaseClient()
    .from("practitioner_public")
    .select("*")
    .order("next_available_at", { ascending: true, nullsFirst: false })
    .order("display_name");
  if (error) {
    console.error("[practitioners] list", error.message);
    return [];
  }
  return ((data ?? []) as PublicRow[]).map((row) => fromPublic(row, price));
}

export async function getPublicPractitioner(
  slug: string,
  price: string | null,
): Promise<{ card: CardPractitioner; bio: string | null } | null> {
  const { data, error } = await createAdminSupabaseClient()
    .from("practitioner_public")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();
  if (error) console.error("[practitioners] get", error.message);
  return data ? { card: fromPublic(data as PublicRow, price), bio: (data as PublicRow).bio } : null;
}

/** The gate, counted from the same view the cards read. */
export async function directoryIsOpen(): Promise<boolean> {
  const { count, error } = await createAdminSupabaseClient()
    .from("practitioner_public")
    .select("id", { count: "exact", head: true });
  if (error) {
    console.error("[practitioners] count", error.message);
    return false;
  }
  return (count ?? 0) >= DIRECTORY_MIN_PRACTITIONERS;
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
