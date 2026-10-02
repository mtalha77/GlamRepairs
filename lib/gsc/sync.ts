import "server-only";

import sitemap from "@/app/sitemap";
import { gscConfigured, inspectUrl, searchAnalytics, type GscRow } from "@/lib/gsc/client";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

/**
 * Search Console → Supabase — HANDOVER-46 §3.
 *
 * ── Why a rolling window and not "yesterday" ─────────────────────────────
 * Google keeps revising the last few days after first reporting them. A
 * job that fetches one day once stores the first, low draft of every day
 * forever. The daily run re-fetches today-6 … today-2 and overwrites, so
 * each day is rewritten five times and settles on Google's final figure.
 *
 * ── Overwrite, not merge ─────────────────────────────────────────────────
 * Rows are upserted with the run's timestamp, then rows in the same window
 * still carrying an older timestamp are deleted: a query Google stopped
 * reporting for a day (anonymised, or revised away) disappears here too.
 * The delete only runs after every upsert in the window succeeded, so a
 * failed run leaves yesterday's data rather than a hole.
 *
 * ── Every run is written down ────────────────────────────────────────────
 * One `gsc_sync_log` row per dimension per run, success or failure. The
 * Search page reads it, so "is the sync running?" has an answer on screen.
 */

/** Search Console keeps 16 months. */
export const HISTORY_DAYS = 486;
/** Backfill chunk size: small enough to stay well inside one function call. */
const CHUNK_DAYS = 93;
const BATCH = 1000;

type Kind = "totals" | "queries" | "pages";

const DIMENSIONS: Record<Kind, ("date" | "query" | "page")[]> = {
  totals: ["date"],
  queries: ["date", "query"],
  pages: ["date", "page"],
};

const TABLE = {
  totals: "gsc_daily",
  queries: "gsc_query_daily",
  pages: "gsc_page_daily",
} as const;

export const isoDate = (d: Date) => d.toISOString().slice(0, 10);

export function daysAgo(n: number, from = new Date()) {
  const d = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate()));
  d.setUTCDate(d.getUTCDate() - n);
  return d;
}

export type SyncResult = { kind: string; from?: string; to?: string; rows: number; ok: boolean; error?: string };

function toRecord(kind: Kind, r: GscRow, syncedAt: string) {
  const base = {
    date: r.keys[0],
    clicks: Math.round(r.clicks),
    impressions: Math.round(r.impressions),
    ctr: r.ctr,
    position: r.position,
    synced_at: syncedAt,
  };
  if (kind === "queries") return { ...base, query: r.keys[1] };
  if (kind === "pages") return { ...base, page: r.keys[1] };
  return base;
}

async function log(entry: {
  kind: Kind | "index";
  date_from?: string | null;
  date_to?: string | null;
  rows_written: number;
  ok: boolean;
  error?: string | null;
}) {
  // Best effort: a sync that stored its data must not be reported as
  // failed because the audit row would not insert.
  const { error } = await createAdminSupabaseClient().from("gsc_sync_log").insert(entry);
  if (error) console.error("[gsc log]", error.message);
}

async function syncKind(kind: Kind, from: string, to: string): Promise<SyncResult> {
  const supabase = createAdminSupabaseClient();
  const syncedAt = new Date().toISOString();
  try {
    const rows = await searchAnalytics({ startDate: from, endDate: to, dimensions: DIMENSIONS[kind] });
    const records = rows.map((r) => toRecord(kind, r, syncedAt));
    const onConflict = kind === "totals" ? "date" : kind === "queries" ? "date,query" : "date,page";
    for (let i = 0; i < records.length; i += BATCH) {
      const { error } = await supabase
        .from(TABLE[kind])
        .upsert(records.slice(i, i + BATCH) as never, { onConflict });
      if (error) throw new Error(`upsert ${TABLE[kind]}: ${error.message}`);
    }
    const { error: delError } = await supabase
      .from(TABLE[kind])
      .delete()
      .gte("date", from)
      .lte("date", to)
      .lt("synced_at", syncedAt);
    if (delError) throw new Error(`prune ${TABLE[kind]}: ${delError.message}`);

    await log({ kind, date_from: from, date_to: to, rows_written: records.length, ok: true });
    return { kind, from, to, rows: records.length, ok: true };
  } catch (err) {
    const message = (err as Error).message.slice(0, 1000);
    await log({ kind, date_from: from, date_to: to, rows_written: 0, ok: false, error: message });
    return { kind, from, to, rows: 0, ok: false, error: message };
  }
}

/** All three dimension sets for one date range. */
export async function syncRange(from: string, to: string): Promise<SyncResult[]> {
  const results: SyncResult[] = [];
  for (const kind of ["totals", "queries", "pages"] as Kind[]) {
    results.push(await syncKind(kind, from, to));
  }
  return results;
}

/**
 * Has the 16-month history ever been fetched? Search Console drops a day
 * off the back of its history every day, so a missed backfill loses data
 * for good. The daily run checks and backfills itself the first time, so
 * this does not depend on someone remembering to press a button.
 */
async function hasBackfilled(): Promise<boolean> {
  const { data } = await createAdminSupabaseClient()
    .from("gsc_sync_log")
    .select("id")
    .eq("kind", "totals")
    .eq("ok", true)
    .lte("date_from", isoDate(daysAgo(HISTORY_DAYS - 7)))
    .limit(1);
  return Boolean(data && data.length > 0);
}

/** The daily job: re-fetch today-6 … today-2, and backfill once. */
export async function syncDaily(): Promise<SyncResult[]> {
  if (!gscConfigured()) return [await notConfigured("totals")];
  const results = await syncRange(isoDate(daysAgo(6)), isoDate(daysAgo(2)));
  if (results.every((r) => r.ok) && !(await hasBackfilled())) {
    results.push(...(await syncBackfill()));
  }
  return results;
}

/** Oldest first, in chunks, up to where the daily window takes over. */
export async function syncBackfill(from?: string, to?: string): Promise<SyncResult[]> {
  if (!gscConfigured()) return [await notConfigured("totals")];
  const start = from ? new Date(`${from}T00:00:00Z`) : daysAgo(HISTORY_DAYS);
  const end = to ? new Date(`${to}T00:00:00Z`) : daysAgo(2);
  const results: SyncResult[] = [];
  for (let cur = start; cur <= end; ) {
    const chunkEnd = new Date(Math.min(end.getTime(), cur.getTime() + (CHUNK_DAYS - 1) * 86_400_000));
    results.push(...(await syncRange(isoDate(cur), isoDate(chunkEnd))));
    cur = new Date(chunkEnd.getTime() + 86_400_000);
  }
  return results;
}

/**
 * Weekly URL Inspection of every URL in the sitemap (§3.5). Sequential:
 * the API allows 600 a minute and this site has a few dozen URLs, so there
 * is nothing to gain from parallel calls and a rate-limit error to lose.
 */
export async function syncIndexStatus(): Promise<SyncResult> {
  if (!gscConfigured()) return notConfigured("index");
  const supabase = createAdminSupabaseClient();
  const urls = [...new Set((await sitemap()).map((e) => e.url))].slice(0, 1500);
  let written = 0;
  const failures: string[] = [];
  for (const url of urls) {
    try {
      const r = await inspectUrl(url);
      const { error } = await supabase.from("gsc_index_status").upsert({
        url,
        verdict: r.verdict,
        coverage_state: r.coverageState,
        robots_state: r.robotsTxtState,
        indexing_state: r.indexingState,
        last_crawled: r.lastCrawlTime,
        checked_at: new Date().toISOString(),
      });
      if (error) throw new Error(error.message);
      written++;
    } catch (err) {
      failures.push(`${url}: ${(err as Error).message}`);
      // A permissions error will fail every URL the same way.
      if (/403|refused access/.test((err as Error).message)) break;
    }
  }
  // URLs no longer in the sitemap would otherwise sit in the panel forever.
  if (urls.length > 0 && failures.length === 0) {
    const { data: stored } = await supabase.from("gsc_index_status").select("url");
    const gone = (stored ?? []).map((s) => s.url).filter((u) => !urls.includes(u));
    if (gone.length > 0) await supabase.from("gsc_index_status").delete().in("url", gone);
  }
  const ok = failures.length === 0;
  const error = ok ? null : `${failures.length} of ${urls.length} failed. ${failures.slice(0, 3).join(" | ")}`.slice(0, 1000);
  await log({ kind: "index", rows_written: written, ok, error });
  return { kind: "index", rows: written, ok, ...(error ? { error } : {}) };
}

/**
 * HOTFIX-49: a run without the key is still a run, so it is logged. It used
 * to return early with no row, which made "the job ran but has no key"
 * indistinguishable from "nothing ever calls the job" in gsc_sync_log and
 * on the Search page, and sent the diagnosis looking for a missing cron.
 */
async function notConfigured(kind: "totals" | "index"): Promise<SyncResult> {
  const error = "GSC_SERVICE_ACCOUNT_KEY is not set in this deployment.";
  await log({ kind, rows_written: 0, ok: false, error });
  return { kind: "config", rows: 0, ok: false, error };
}
