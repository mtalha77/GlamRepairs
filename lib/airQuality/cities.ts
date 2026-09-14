/**
 * HANDOVER-22 §6 — cities, Lahore only.
 *
 * "Build Lahore first and only. Add Karachi and Islamabad once Lahore
 * proves it gets traffic." So this is a one-entry list on purpose. Adding a
 * city is an object here plus a seasonal note that is actually true of that
 * city — if the seasonal note would just be Lahore's with the name changed,
 * the page should not exist.
 */

export type AirQualityCity = {
  slug: string;
  name: string;
  /** Shown in copy: "Lahore, Pakistan". */
  region: string;
  lat: number;
  lon: number;
  /** City-specific, and the only per-city prose on the page. */
  seasonalNote: string;
  /** Slug of the blog post this city's readers most need. */
  relatedPostSlug: string;
};

export const AIR_QUALITY_CITIES: AirQualityCity[] = [
  {
    slug: "lahore",
    name: "Lahore",
    region: "Punjab, Pakistan",
    lat: 31.5204,
    lon: 74.3587,
    seasonalNote:
      "Lahore's worst air arrives with the smog season — roughly late October through January, when crop-residue burning, cooler air and low wind trap particulates near the ground. Skin complaints follow the same curve: clinics see more breakouts, more dullness and more barrier irritation in November and December than at any other point in the year. Summer brings a different problem — heat, sweat and humidity rather than particulates — so a routine that suits you in July is often the wrong one in December.",
    relatedPostSlug: "why-skin-worse-in-pakistan-pollution-humidity-hard-water",
  },
];

export function getAirQualityCity(slug: string): AirQualityCity | undefined {
  return AIR_QUALITY_CITIES.find((city) => city.slug === slug);
}
