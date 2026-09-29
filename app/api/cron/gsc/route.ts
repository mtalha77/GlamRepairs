import { NextResponse } from "next/server";

import { syncBackfill, syncDaily, syncIndexStatus } from "@/lib/gsc/sync";

/**
 * Search Console sync — HANDOVER-46 §3.
 *
 *   ?mode=daily              re-fetch today-6 … today-2 (and the one-time
 *                            16-month backfill, if it has never run)
 *   ?mode=backfill&from&to   a date range, YYYY-MM-DD; both optional
 *   ?mode=inspect            URL Inspection for every sitemap URL
 *
 * Called by .github/workflows/gsc-sync.yml, because Vercel cron does not
 * fire on this project (see air-quality-refresh.yml). Same gate as the
 * other cron routes: a CRON_SECRET bearer, or Vercel's unforgeable
 * x-vercel-cron header. Every run is written to gsc_sync_log by the sync
 * itself, so the response is a convenience, not the record.
 */
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const DATE = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const hasSecret = Boolean(secret) && request.headers.get("authorization") === `Bearer ${secret}`;
  const isVercelCron = request.headers.get("x-vercel-cron") !== null;
  if (!hasSecret && !isVercelCron) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const params = new URL(request.url).searchParams;
  const mode = params.get("mode") ?? "daily";
  const from = params.get("from") ?? undefined;
  const to = params.get("to") ?? undefined;
  if ((from && !DATE.test(from)) || (to && !DATE.test(to))) {
    return NextResponse.json({ ok: false, error: "from and to must be YYYY-MM-DD." }, { status: 400 });
  }

  const results =
    mode === "inspect"
      ? [await syncIndexStatus()]
      : mode === "backfill"
        ? await syncBackfill(from, to)
        : mode === "daily"
          ? await syncDaily()
          : null;
  if (!results) {
    return NextResponse.json({ ok: false, error: `Unknown mode "${mode}".` }, { status: 400 });
  }

  // 200 with ok:false on failure: this reports, the workflow decides.
  return NextResponse.json({
    ok: results.every((r) => r.ok),
    mode,
    rows: results.reduce((n, r) => n + r.rows, 0),
    results,
  });
}
