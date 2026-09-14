/**
 * HANDOVER-22 §6 — live air quality, from OpenWeather.
 *
 * ── The licensing check the handover asked for, and what it changed ──────
 * §6 recommends Open-Meteo and says "check licensing before committing.
 * The commercial-use clause is the part that matters." Checked on 14 Sep
 * 2026, and it reverses the recommendation:
 *
 * • Open-Meteo's free API is explicitly **non-commercial only** — its own
 *   terms say the free service may be used for non-commercial purposes and
 *   that commercial use requires a paid subscription. A page that exists to
 *   sell skin assessments is commercial use, so the free tier is not
 *   available to us however generous its limits are.
 *   https://open-meteo.com/en/terms
 *
 * • OpenWeather permits commercial use on the free tier, under the ODbL,
 *   with **mandatory visible attribution**: "Weather data provided by
 *   OpenWeather", linked, on the page where the data appears — not buried
 *   in a legal page. That attribution is rendered by the city page and must
 *   not be removed.
 *   https://openweathermap.org/full-price · https://openweathermap.org/terms
 *
 * So OpenWeather it is, and this module is the only place the API is
 * called.
 *
 * ── Why the whole feature is off without a key ───────────────────────────
 * A city page with no live reading is a templated "skincare in {city}"
 * page, which is the doorway-page pattern §6 itself warns about. The live
 * data is the entire justification for the page existing, so with no key
 * configured the route 404s and the sitemap omits it, rather than
 * publishing the thin version.
 */

export type AirQualityBandKey =
  | "good"
  | "fair"
  | "moderate"
  | "poor"
  | "veryPoor";

export type AirQualityReading = {
  /** OpenWeather's own 1–5 index. NOT the US 0–500 AQI — never label it so. */
  index: 1 | 2 | 3 | 4 | 5;
  band: AirQualityBandKey;
  /** µg/m³. */
  pm25: number;
  pm10: number;
  /** When the reading itself was taken, from the API. */
  measuredAt: string;
};

const BAND_BY_INDEX: Record<number, AirQualityBandKey> = {
  1: "good",
  2: "fair",
  3: "moderate",
  4: "poor",
  5: "veryPoor",
};

export function isAirQualityConfigured(): boolean {
  return Boolean(process.env.OPENWEATHER_API_KEY?.trim());
}

/**
 * One reading for a coordinate.
 *
 * Cached for 30 minutes at the fetch layer rather than called per page
 * view: air quality does not change minute to minute, and caching is what
 * keeps a popular page inside a free-tier rate limit and off the critical
 * path when the upstream is slow.
 *
 * Returns null rather than throwing on any failure — the page then says the
 * reading is unavailable, which is honest, instead of showing a stale or
 * invented number.
 */
export async function fetchAirQuality(
  lat: number,
  lon: number,
): Promise<AirQualityReading | null> {
  const key = process.env.OPENWEATHER_API_KEY?.trim();
  if (!key) return null;

  const url = new URL("https://api.openweathermap.org/data/2.5/air_pollution");
  url.searchParams.set("lat", String(lat));
  url.searchParams.set("lon", String(lon));
  url.searchParams.set("appid", key);

  try {
    const response = await fetch(url, {
      next: { revalidate: 1800 },
      signal: AbortSignal.timeout(6000),
    });
    if (!response.ok) {
      console.error("[fetchAirQuality]", response.status, response.statusText);
      return null;
    }

    const payload = (await response.json()) as {
      list?: {
        main?: { aqi?: number };
        components?: { pm2_5?: number; pm10?: number };
        dt?: number;
      }[];
    };

    const entry = payload.list?.[0];
    const index = entry?.main?.aqi;
    const pm25 = entry?.components?.pm2_5;
    const pm10 = entry?.components?.pm10;

    if (
      typeof index !== "number" ||
      !(index in BAND_BY_INDEX) ||
      typeof pm25 !== "number" ||
      typeof pm10 !== "number" ||
      typeof entry?.dt !== "number"
    ) {
      console.error("[fetchAirQuality] unexpected payload shape");
      return null;
    }

    return {
      index: index as AirQualityReading["index"],
      band: BAND_BY_INDEX[index],
      pm25,
      pm10,
      measuredAt: new Date(entry.dt * 1000).toISOString(),
    };
  } catch (error) {
    console.error("[fetchAirQuality]", (error as Error).message);
    return null;
  }
}
