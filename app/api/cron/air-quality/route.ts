import { NextResponse } from "next/server";

import { refreshAirQuality } from "@/lib/airQuality/refresh";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

/**
 * Refresh every published city's reading and forecast.
 *
 * ── Why this route did not exist ─────────────────────────────────────────
 * HANDOVER-35 lists "cron by coordinate" as order step 2, and nothing in
 * this repository was doing it: vercel.json scheduled only the photo
 * cleanup, there were no Supabase edge functions, and pg_cron is not
 * installed. Something external had been writing three cities. Ten of the
 * thirteen published cities had no reading and no forecast as a result.
 *
 * ── The gate is the cleanup job's, deliberately ──────────────────────────
 * Same shape as /api/cron/cleanup-photos: honour CRON_SECRET when it is
 * set, otherwise fall back to Vercel's own `x-vercel-cron` marker, which
 * Vercel sets on scheduled invocations and strips from inbound requests so
 * it cannot be forged. Refusing to run without a secret would mean one
 * missing environment variable silently freezing every city page's data,
 * with a status code nobody reads as the only evidence.
 *
 * The response names each city and its outcome rather than returning
 * `ok: true`, so a partial failure is visible the first time it happens.
 *
 * ── And it writes that outcome down ──────────────────────────────────────
 * Naming the outcome in the response only helps someone holding the
 * response. When readings stopped arriving there was no way to tell whether
 * this endpoint was being called and failing or never called at all: the
 * job wrote nothing on failure, and Vercel's runtime-log queries time out
 * before returning. So every invocation now leaves a row in
 * `air_quality_cron_runs` — success or failure, with the per-city detail.
 * "Is the cron firing?" is a SELECT rather than an inference.
 *
 * The log write is best-effort and never fails the run: a refresh that
 * fetched thirteen cities must not be reported as broken because its
 * audit row would not insert.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");
  const isVercelCron = request.headers.get("x-vercel-cron") !== null;

  if (secret) {
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }
  } else if (!isVercelCron) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const results = await refreshAirQuality();
  const failed = results.filter((r) => !r.ok);

  try {
    await createAdminSupabaseClient().from("air_quality_cron_runs").insert({
      ok: failed.length === 0,
      refreshed: results.filter((r) => r.ok).length,
      failed: failed.length,
      detail: results,
      trigger: secret ? "secret" : isVercelCron ? "vercel-cron" : "unknown",
    });
  } catch (e) {
    console.error(
      "[cron/air-quality] could not write run log",
      e instanceof Error ? e.message : e,
    );
  }

  /*
   * 200 even when some cities failed. This endpoint reports; it is not a
   * health check, and a non-2xx here would have Vercel retry a job that
   * already wrote the cities it could reach. The body carries the detail.
   */
  return NextResponse.json({
    ok: failed.length === 0,
    refreshed: results.filter((r) => r.ok).length,
    failed: failed.length,
    results,
  });
}
