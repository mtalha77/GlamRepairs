import "server-only";

import { createAdminSupabaseClient } from "@/lib/supabase/admin";

/**
 * Area pages, read from the database — HANDOVER-35.
 *
 * ── Why this replaces the old provider path ──────────────────────────────
 * There were two parallel implementations of the same feature. The page
 * fetched OpenWeather live, per request, from a city list hardcoded in
 * TypeScript. Meanwhile a cron was populating `air_quality_latest` from
 * WeatherAPI, and thirteen cities with zone essays were sitting in
 * `area_pages`. The site rendered one and the content lived in the other.
 *
 * The database side wins on every count: it is the one with the content, it
 * is the one the cron feeds (`source = 'weatherapi.com'`, verified against
 * production), and reading a row is not a third-party call on the request
 * path — so a provider outage cannot slow or break a page render.
 *
 * ── One view, one query ──────────────────────────────────────────────────
 * `area_page_data` pre-joins the city, its zone, the latest reading, the
 * three-day forecast, the band advice and the published siblings. A page
 * needs exactly one round trip.
 *
 * ⚠️ `zone_siblings` contains only PUBLISHED siblings. With nothing
 * published it is empty, which is correct rather than broken — see
 * HANDOVER-35 §4.3 on publish order.
 */

export type AirReading = {
  observedAt: string;
  fetchedAt: string;
  band: string;
  isStale: boolean;
  source: string | null;
  pm25: number | null;
  pm10: number | null;
  epaIndex: number | null;
  usAqi: number | null;
  uvIndex: number | null;
  tempC: number | null;
  humidity: number | null;
  conditionText: string | null;
};

export type ForecastDay = {
  date: string;
  maxTempC: number | null;
  minTempC: number | null;
  avgHumidity: number | null;
  uvIndex: number | null;
  pm25: number | null;
  conditionText: string | null;
};

export type AreaPage = {
  slug: string;
  city: string;
  province: string | null;
  latitude: number;
  longitude: number;
  title: string;
  h1: string;
  metaDescription: string;
  introMarkdown: string | null;
  cityMarkdown: string | null;
  seasonalMarkdown: string | null;
  waterNote: string | null;
  relatedSlugs: string[];
  covers: string | null;
  status: string;
  zoneSlug: string | null;
  zoneName: string | null;
  zoneSummary: string | null;
  zoneGuidance: string | null;
  dominantFactor: string | null;
  /** Null when the cron has never succeeded for this city. */
  latest: AirReading | null;
  forecast: ForecastDay[];
  advice: { headline: string; advice: string } | null;
  zoneSiblings: { slug: string; city: string }[];
};

/** PostgREST returns numerics as strings; every number crosses that wire. */
function num(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

type RawRow = Record<string, unknown>;

function mapRow(r: RawRow): AreaPage {
  const latest = r.latest as RawRow | null;
  const forecast = (r.forecast ?? []) as RawRow[];
  const advice = r.advice as { headline?: string; advice?: string } | null;
  const siblings = (r.zone_siblings ?? []) as RawRow[];

  return {
    slug: String(r.slug),
    city: String(r.city),
    province: (r.province as string) ?? null,
    latitude: num(r.latitude) ?? 0,
    longitude: num(r.longitude) ?? 0,
    title: String(r.title ?? ""),
    h1: String(r.h1 ?? ""),
    metaDescription: String(r.meta_description ?? ""),
    introMarkdown: (r.intro_markdown as string) ?? null,
    cityMarkdown: (r.city_markdown as string) ?? null,
    seasonalMarkdown: (r.seasonal_markdown as string) ?? null,
    waterNote: (r.water_note as string) ?? null,
    relatedSlugs: Array.isArray(r.related_slugs)
      ? (r.related_slugs as string[])
      : [],
    covers: (r.covers as string) ?? null,
    status: String(r.status ?? "draft"),
    zoneSlug: (r.zone_slug as string) ?? null,
    zoneName: (r.zone_name as string) ?? null,
    zoneSummary: (r.zone_summary as string) ?? null,
    zoneGuidance: (r.zone_guidance as string) ?? null,
    dominantFactor: (r.dominant_factor as string) ?? null,
    latest: latest
      ? {
          observedAt: String(latest.observed_at),
          fetchedAt: String(latest.fetched_at),
          band: String(latest.band ?? "unknown"),
          isStale: Boolean(latest.is_stale),
          source: (latest.source as string) ?? null,
          pm25: num(latest.pm2_5),
          pm10: num(latest.pm10),
          epaIndex: num(latest.epa_index),
          usAqi: num(latest.us_aqi),
          uvIndex: num(latest.uv_index),
          tempC: num(latest.temp_c),
          humidity: num(latest.humidity),
          conditionText: (latest.condition_text as string) ?? null,
        }
      : null,
    // Three days, enforced here as well as in the query — §5.2 is explicit
    // that the API's hourly data must not reach the page.
    forecast: forecast.slice(0, 3).map((d) => ({
      date: String(d.forecast_date),
      maxTempC: num(d.max_temp_c),
      minTempC: num(d.min_temp_c),
      avgHumidity: num(d.avg_humidity),
      uvIndex: num(d.uv_index),
      pm25: num(d.pm2_5),
      conditionText: (d.condition_text as string) ?? null,
    })),
    advice:
      advice && advice.headline
        ? { headline: String(advice.headline), advice: String(advice.advice ?? "") }
        : null,
    zoneSiblings: siblings.map((s) => ({
      slug: String(s.slug),
      city: String(s.city),
    })),
  };
}

/**
 * One published city, or null.
 *
 * Draft cities return null so the route 404s rather than rendering an empty
 * page — HANDOVER-35 §1.1.
 */
export async function getAreaPage(slug: string): Promise<AreaPage | null> {
  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase
    .from("area_page_data")
    .select("*")
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();

  if (error) {
    console.error("[getAreaPage]", error.message);
    return null;
  }
  return data ? mapRow(data as RawRow) : null;
}

/** Published cities, for the index, the sitemap and generateStaticParams. */
export async function listPublishedAreaPages(): Promise<AreaPage[]> {
  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase
    .from("area_page_data")
    .select("*")
    .eq("status", "published")
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("[listPublishedAreaPages]", error.message);
    return [];
  }
  return ((data ?? []) as RawRow[]).map(mapRow);
}

/**
 * Whether the live panel may be rendered — HANDOVER-35 §6.
 *
 * Both conditions hide it: no reading at all, and a reading the database has
 * marked stale. The editorial half of the page renders either way, because a
 * page with no number still answers the question it was written for, and a
 * 500 on a URL Google is actively crawling is far worse than a quiet page.
 */
export function canShowLivePanel(page: AreaPage): boolean {
  return page.latest !== null && !page.latest.isStale;
}
