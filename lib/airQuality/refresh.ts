import "server-only";

import { createAdminSupabaseClient } from "@/lib/supabase/admin";

/**
 * Fetching readings for every published city — HANDOVER-35 order step 2.
 *
 * ── Why this exists at all ───────────────────────────────────────────────
 * Something outside this repository was writing WeatherAPI readings for
 * three cities. There is no air-quality cron here: `vercel.json` schedules
 * only the photo cleanup, there are no Supabase edge functions, and pg_cron
 * is not installed. So ten of the thirteen published cities had no reading
 * and no forecast, and nothing in the codebase was ever going to give them
 * one.
 *
 * ── By coordinate, never by name ─────────────────────────────────────────
 * §5.1 and the §8 checklist are both explicit. A name lookup is ambiguous
 * (Hyderabad is a much larger city in India) and it silently returns the
 * wrong place rather than failing, which is the worst kind of wrong: the
 * page renders, the number looks plausible, and it is for somewhere else.
 * `area_pages` carries lat/lon per city and that is what gets sent.
 */

const API = "https://api.weatherapi.com/v1/forecast.json";

export type RefreshOutcome = {
  slug: string;
  ok: boolean;
  error?: string;
};

type WeatherApiResponse = {
  current?: {
    last_updated_epoch?: number;
    temp_c?: number;
    humidity?: number;
    uv?: number;
    condition?: { text?: string };
    air_quality?: Record<string, number | undefined>;
  };
  forecast?: {
    forecastday?: {
      date?: string;
      day?: {
        maxtemp_c?: number;
        mintemp_c?: number;
        avghumidity?: number;
        uv?: number;
        condition?: { text?: string };
        air_quality?: Record<string, number | undefined>;
      };
    }[];
  };
};

/**
 * The band a reading falls into.
 *
 * Keyed on PM2.5 rather than on WeatherAPI's `us-epa-index`, because the
 * advice rows in `air_quality_advice` are written against these names and
 * the concentration is the thing the guidance actually reasons about. The
 * thresholds are the US EPA's published PM2.5 breakpoints.
 */
export function bandForPm25(pm25: number | null): string {
  if (pm25 === null || !Number.isFinite(pm25)) return "unknown";
  if (pm25 <= 12) return "good";
  if (pm25 <= 35.4) return "moderate";
  if (pm25 <= 55.4) return "unhealthy_sensitive";
  if (pm25 <= 150.4) return "unhealthy";
  if (pm25 <= 250.4) return "very_unhealthy";
  return "hazardous";
}

function n(v: unknown): number | null {
  const x = Number(v);
  return Number.isFinite(x) ? x : null;
}

async function fetchCity(
  lat: number,
  lon: number,
  key: string,
): Promise<WeatherApiResponse | null> {
  const url = new URL(API);
  url.searchParams.set("key", key);
  // Coordinates, per §5.1. Three days is what the page renders; asking for
  // more would be fetching data to throw away.
  url.searchParams.set("q", `${lat},${lon}`);
  url.searchParams.set("days", "3");
  url.searchParams.set("aqi", "yes");

  const res = await fetch(url, {
    // The cron writes the cache; this call must never read one.
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) return null;
  return (await res.json()) as WeatherApiResponse;
}

/**
 * Refresh every published city.
 *
 * ── Failures are per city, and they never overwrite ──────────────────────
 * §6: "API errors during cron: keep last reading, do not overwrite." A city
 * whose fetch fails is skipped entirely rather than written as null, so a
 * partial outage degrades to slightly older numbers instead of thirteen
 * pages losing their panels at once. One city failing also does not abort
 * the rest, which is why each is caught individually.
 */
export async function refreshAirQuality(): Promise<RefreshOutcome[]> {
  const key = process.env.WEATHERAPI_KEY?.trim();
  if (!key) return [{ slug: "*", ok: false, error: "WEATHERAPI_KEY is not set" }];

  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase
    .from("area_pages")
    .select("slug, latitude, longitude")
    .eq("status", "published");

  if (error || !data) {
    return [{ slug: "*", ok: false, error: error?.message ?? "no cities" }];
  }

  const results: RefreshOutcome[] = [];

  for (const row of data as { slug: string; latitude: number; longitude: number }[]) {
    try {
      const body = await fetchCity(Number(row.latitude), Number(row.longitude), key);
      if (!body?.current) {
        results.push({ slug: row.slug, ok: false, error: "no current reading" });
        continue;
      }

      const aq = body.current.air_quality ?? {};
      const pm25 = n(aq.pm2_5);
      const observedAt = body.current.last_updated_epoch
        ? new Date(body.current.last_updated_epoch * 1000).toISOString()
        : new Date().toISOString();

      const reading = {
        slug: row.slug,
        observed_at: observedAt,
        pm2_5: pm25,
        pm10: n(aq.pm10),
        no2: n(aq.no2),
        so2: n(aq.so2),
        o3: n(aq.o3),
        co: n(aq.co),
        epa_index: n(aq["us-epa-index"]),
        us_aqi: null,
        uv_index: n(body.current.uv),
        temp_c: n(body.current.temp_c),
        humidity: n(body.current.humidity),
        condition_text: body.current.condition?.text ?? null,
        source: "weatherapi.com",
        fetched_at: new Date().toISOString(),
      };

      const { error: insertError } = await supabase
        .from("air_quality_readings")
        .insert(reading);
      if (insertError) {
        results.push({ slug: row.slug, ok: false, error: insertError.message });
        continue;
      }

      // `air_quality_latest` carries the band and the staleness flag the
      // page reads, so it is written alongside rather than derived at read
      // time — one row per city, replaced in place.
      await supabase.from("air_quality_latest").upsert(
        { ...reading, band: bandForPm25(pm25), is_stale: false },
        { onConflict: "slug" },
      );

      const days = (body.forecast?.forecastday ?? []).slice(0, 3);
      for (const d of days) {
        if (!d.date) continue;
        await supabase.from("air_quality_forecast").upsert(
          {
            slug: row.slug,
            forecast_date: d.date,
            max_temp_c: n(d.day?.maxtemp_c),
            min_temp_c: n(d.day?.mintemp_c),
            avg_humidity: n(d.day?.avghumidity),
            uv_index: n(d.day?.uv),
            pm2_5: n(d.day?.air_quality?.pm2_5),
            epa_index: n(d.day?.air_quality?.["us-epa-index"]),
            condition_text: d.day?.condition?.text ?? null,
            fetched_at: new Date().toISOString(),
          },
          { onConflict: "slug,forecast_date" },
        );
      }

      results.push({ slug: row.slug, ok: true });
    } catch (e) {
      // Caught per city so one failure cannot abort the other twelve.
      results.push({
        slug: row.slug,
        ok: false,
        error: e instanceof Error ? e.message : "fetch failed",
      });
    }
  }

  return results;
}
