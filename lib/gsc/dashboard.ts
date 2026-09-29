import "server-only";

import { unstable_cache } from "next/cache";

import { gscConfigured, searchAnalytics } from "@/lib/gsc/client";
import { daysAgo, isoDate } from "@/lib/gsc/sync";
import { createServerSupabaseClient } from "@/lib/supabase/server";

/**
 * Everything Studio → Search reads — HANDOVER-46 §4.
 *
 * Reads go through the signed-in member's client, so RLS decides who sees
 * search data. The one live Google call (which page ranks for each
 * striking-distance query) is cached for six hours: it is the only way to
 * turn "position 11 for X" into "edit this page", and the stored tables
 * keep queries and pages separate.
 */

const num = (v: number | string | null | undefined) => (v == null ? null : Number(v));

export type Summary = {
  clicks: number;
  impressions: number;
  ctrPct: number;
  avgPosition: number;
  clicksDelta: number;
  impressionsDelta: number;
  /** Positive = improved (the position number fell). Null without a prior period. */
  positionDelta: number | null;
};

export type TrendPoint = { date: string; clicks: number; impressions: number };

export type Row = {
  key: string;
  clicks: number;
  impressions: number;
  ctrPct: number | null;
  position: number | null;
  fix?: { href: string; label: string } | null;
  firstSeen?: string | null;
};

export type IndexRow = {
  url: string;
  verdict: string | null;
  coverageState: string | null;
  lastCrawled: string | null;
  checkedAt: string;
};

export type SyncLogRow = {
  id: number;
  kind: string;
  dateFrom: string | null;
  dateTo: string | null;
  rows: number;
  ok: boolean;
  error: string | null;
  ranAt: string;
};

/** Where to go to change what Google shows for a URL. */
export type EditorIndex = { pagePaths: Set<string>; postIds: Map<string, string> };

export function editorFor(url: string, idx: EditorIndex): { href: string; label: string } | null {
  let path: string;
  try {
    path = new URL(url).pathname.replace(/\/+$/, "") || "/";
  } catch {
    return null;
  }
  if (idx.pagePaths.has(path)) return { href: `/studio/seo#page-${path}`, label: "Edit title" };
  const blog = path.match(/^\/blog\/([^/]+)$/);
  if (blog) {
    const id = idx.postIds.get(blog[1]);
    if (id) return { href: `/studio/blog/${id}`, label: "Edit post" };
  }
  return { href: path, label: "View page" };
}

export function pathOf(url: string) {
  try {
    return new URL(url).pathname;
  } catch {
    return url;
  }
}

/**
 * The best page for each query over the last 28 settled days, by
 * impressions. Cached: the dashboard is opened far more often than the
 * data changes, and each call spends Search Console quota.
 */
const rankingPages = unstable_cache(
  async (): Promise<Record<string, string>> => {
    const rows = await searchAnalytics({
      startDate: isoDate(daysAgo(30)),
      endDate: isoDate(daysAgo(3)),
      dimensions: ["query", "page"],
    });
    const best: Record<string, { page: string; impressions: number }> = {};
    for (const r of rows) {
      const [query, page] = r.keys;
      if (!best[query] || r.impressions > best[query].impressions) best[query] = { page, impressions: r.impressions };
    }
    return Object.fromEntries(Object.entries(best).map(([q, b]) => [q, b.page]));
  },
  ["gsc-ranking-pages"],
  { revalidate: 21_600 },
);

export async function loadSearchDashboard(range: 28 | 90) {
  const supabase = await createServerSupabaseClient();
  const [summary, trend, striking, lowCtr, topQueries, topPages, fresh, index, logs, earliest, pages, posts] =
    await Promise.all([
      supabase.from("gsc_summary_28d").select("*").maybeSingle(),
      supabase
        .from("gsc_daily")
        .select("date, clicks, impressions")
        .gte("date", isoDate(daysAgo(range + 2)))
        .order("date"),
      supabase.from("gsc_striking_distance").select("*").limit(25),
      supabase.from("gsc_low_ctr_pages").select("*").limit(20),
      supabase.from("gsc_top_queries_28d").select("*").order("clicks", { ascending: false }).order("impressions", { ascending: false }).limit(20),
      supabase.from("gsc_top_pages_28d").select("*").order("clicks", { ascending: false }).order("impressions", { ascending: false }).limit(20),
      supabase.from("gsc_new_queries").select("*").limit(15),
      supabase.from("gsc_index_status").select("url, verdict, coverage_state, last_crawled, checked_at").order("url"),
      supabase.from("gsc_sync_log").select("*").order("ran_at", { ascending: false }).limit(30),
      supabase.from("gsc_daily").select("date").order("date").limit(1).maybeSingle(),
      supabase.from("page_seo").select("path"),
      supabase.from("studio_blog_posts").select("id, slug"),
    ]);

  const idx: EditorIndex = {
    pagePaths: new Set((pages.data ?? []).map((p) => p.path)),
    postIds: new Map((posts.data ?? []).map((p) => [p.slug as string, p.id as string])),
  };

  let ranking: Record<string, string> = {};
  let rankingError: string | null = null;
  if (gscConfigured() && (striking.data ?? []).length > 0) {
    try {
      ranking = await rankingPages();
    } catch (err) {
      rankingError = (err as Error).message;
    }
  }

  const s = summary.data;
  const toRow = (r: {
    query?: string | null;
    page?: string | null;
    clicks: number | null;
    impressions: number | null;
    ctr_pct?: number | string | null;
    avg_position: number | string | null;
  }): Row => ({
    key: (r.query ?? r.page ?? "") as string,
    clicks: Number(r.clicks ?? 0),
    impressions: Number(r.impressions ?? 0),
    ctrPct: num(r.ctr_pct),
    position: num(r.avg_position),
  });

  // New queries mean nothing until there is history to be new against.
  const hasHistory = Boolean(earliest.data && earliest.data.date <= isoDate(daysAgo(40)));

  return {
    summary: s
      ? ({
          clicks: Number(s.clicks ?? 0),
          impressions: Number(s.impressions ?? 0),
          ctrPct: Number(s.ctr_pct ?? 0),
          avgPosition: Number(s.avg_position ?? 0),
          clicksDelta: Number(s.clicks_delta ?? 0),
          impressionsDelta: Number(s.impressions_delta ?? 0),
          positionDelta: num(s.position_delta),
        } satisfies Summary)
      : null,
    trend: (trend.data ?? []).map((t) => ({ date: t.date, clicks: t.clicks, impressions: t.impressions })),
    striking: (striking.data ?? []).map((r) => {
      const row = toRow(r);
      const page = ranking[row.key];
      return { ...row, rankingPage: page ? pathOf(page) : null, fix: page ? editorFor(page, idx) : null };
    }),
    rankingError,
    lowCtr: (lowCtr.data ?? []).map((r) => ({ ...toRow(r), fix: editorFor(r.page ?? "", idx) })),
    topQueries: (topQueries.data ?? []).map(toRow),
    topPages: (topPages.data ?? []).map((r) => ({ ...toRow(r), fix: editorFor(r.page ?? "", idx) })),
    newQueries: hasHistory ? (fresh.data ?? []).map((r) => ({ ...toRow(r), firstSeen: r.first_seen })) : null,
    index: (index.data ?? []).map(
      (r): IndexRow => ({
        url: r.url,
        verdict: r.verdict,
        coverageState: r.coverage_state,
        lastCrawled: r.last_crawled,
        checkedAt: r.checked_at,
      }),
    ),
    logs: (logs.data ?? []).map(
      (l): SyncLogRow => ({
        id: l.id,
        kind: l.kind,
        dateFrom: l.date_from,
        dateTo: l.date_to,
        rows: l.rows_written,
        ok: l.ok,
        error: l.error,
        ranAt: l.ran_at,
      }),
    ),
    earliestDate: earliest.data?.date ?? null,
    /** No successful daily sync in two days: the workflow has stopped. */
    syncStale: (() => {
      const ok = (logs.data ?? []).find((l) => l.kind === "totals" && l.ok);
      return !ok || Date.now() - new Date(ok.ran_at).getTime() > 2 * 86_400_000;
    })(),
  };
}
