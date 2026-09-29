import Link from "next/link";

import TrendChart from "@/components/studio/search/TrendChart";
import { pathOf, type loadSearchDashboard, type Row, type Summary, type SyncLogRow } from "@/lib/gsc/dashboard";

/**
 * Studio → Search, the view — HANDOVER-46 §4. Data comes from
 * lib/gsc/dashboard.ts via app/studio/(app)/search/page.tsx.
 *
 * Ordered by what to do next, not by what Google's own UI shows first:
 * the numbers and one sentence on what they mean, then the queries one
 * edit away from page one, then pages that rank but do not get clicked,
 * then the reference tables. Every row that can be fixed links to the
 * screen where it is fixed.
 */

const fmt = new Intl.NumberFormat("en-GB");
const pct = (n: number) => `${n > 0 ? "+" : ""}${Math.round(n)}%`;
const signed = (n: number) => `${n > 0 ? "+" : ""}${fmt.format(n)}`;
const when = (iso: string) =>
  new Date(iso).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Karachi",
  });

function change(cur: number, delta: number) {
  const prev = cur - delta;
  return prev > 0 ? (delta / prev) * 100 : null;
}

/** One sentence on what moved, and the lever to pull if it moved the wrong way. */
function interpret(s: Summary): string {
  if (s.impressions === 0) return "No search impressions in the last 28 settled days yet.";
  const parts: string[] = [];
  const c = change(s.clicks, s.clicksDelta);
  const i = change(s.impressions, s.impressionsDelta);
  parts.push(
    c == null
      ? `${fmt.format(s.clicks)} clicks from ${fmt.format(s.impressions)} impressions.`
      : `Clicks ${c >= 0 ? "up" : "down"} ${Math.abs(Math.round(c))}% and impressions ${
          (i ?? 0) >= 0 ? "up" : "down"
        } ${Math.abs(Math.round(i ?? 0))}% on the previous 28 days.`,
  );
  if (s.positionDelta != null && Math.abs(s.positionDelta) >= 0.5) {
    parts.push(
      `Average position ${s.positionDelta > 0 ? "improved" : "slipped"} by ${Math.abs(s.positionDelta)} to ${s.avgPosition}.`,
    );
  }
  if (i != null && c != null && i > 15 && c < i / 2) {
    parts.push("More people see the site but the share who click fell: titles and descriptions are the lever (Low CTR below).");
  } else if (s.avgPosition > 10) {
    parts.push("Most impressions are past page one: the striking-distance list is where to start.");
  }
  return parts.join(" ");
}

function Card({ label, value, delta, tone }: { label: string; value: string; delta: string | null; tone: "up" | "down" | "flat" }) {
  const toneClass = tone === "up" ? "text-emerald-700" : tone === "down" ? "text-red-700" : "text-neutral-500";
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-4">
      <p className="text-sm text-neutral-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
      <p className={`mt-1 text-xs ${toneClass}`}>{delta ?? "No previous period yet"}</p>
    </div>
  );
}

function Table({
  rows,
  first,
  columns,
  empty,
}: {
  rows: (Row & { rankingPage?: string | null })[];
  first: string;
  columns: ("position" | "impressions" | "clicks" | "ctr" | "ranking" | "fix" | "firstSeen")[];
  empty: string;
}) {
  if (rows.length === 0) return <p className="text-sm text-neutral-500">{empty}</p>;
  const head: Record<string, string> = {
    position: "Position",
    impressions: "Impr.",
    clicks: "Clicks",
    ctr: "CTR",
    ranking: "Ranking page",
    fix: "",
    firstSeen: "First seen",
  };
  return (
    <div className="overflow-x-auto rounded-2xl border border-neutral-200 bg-white">
      <table className="w-full text-sm">
        <thead className="bg-neutral-50 text-left text-xs text-neutral-500">
          <tr>
            <th className="px-3 py-2 font-medium">{first}</th>
            {columns.map((c) => (
              <th key={c} className={`px-3 py-2 font-medium ${["position", "impressions", "clicks", "ctr"].includes(c) ? "text-right" : ""}`}>
                {head[c]}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.key} className="border-t border-neutral-100 align-top">
              <td className="max-w-[22rem] break-words px-3 py-2">{first === "Page" ? pathOf(r.key) : r.key}</td>
              {columns.map((c) => (
                <td key={c} className={`px-3 py-2 ${["position", "impressions", "clicks", "ctr"].includes(c) ? "text-right tabular-nums" : ""}`}>
                  {c === "position" && (r.position ?? "—")}
                  {c === "impressions" && fmt.format(r.impressions)}
                  {c === "clicks" && fmt.format(r.clicks)}
                  {c === "ctr" && (r.ctrPct != null ? `${r.ctrPct}%` : "—")}
                  {c === "ranking" && <span className="break-all text-neutral-600">{r.rankingPage ?? "—"}</span>}
                  {c === "firstSeen" && (r.firstSeen ?? "—")}
                  {c === "fix" &&
                    (r.fix ? (
                      <Link href={r.fix.href} className="whitespace-nowrap font-medium underline underline-offset-2">
                        {r.fix.label}
                      </Link>
                    ) : null)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SyncStatus({ logs, configured, stale }: { logs: SyncLogRow[]; configured: boolean; stale: boolean }) {
  const latest = (kind: string) => logs.find((l) => l.kind === kind);
  const lastOk = logs.find((l) => l.kind === "totals" && l.ok);
  const failures = ["totals", "queries", "pages", "index"]
    .map(latest)
    .filter((l): l is SyncLogRow => Boolean(l && !l.ok));
  return (
    <section className="rounded-2xl border border-neutral-200 bg-white p-4 text-sm">
      <h2 className="font-semibold">Sync status</h2>
      <p className={`mt-1 ${stale && configured ? "text-amber-700" : "text-neutral-600"}`}>
        {lastOk
          ? `Last successful daily sync ${when(lastOk.ranAt)} PKT, covering ${lastOk.dateFrom} to ${lastOk.dateTo}.`
          : "No successful sync yet."}
        {stale && configured && lastOk ? " That is more than two days ago: check the Search Console sync workflow in GitHub Actions." : null}
      </p>
      {latest("index") ? (
        <p className="mt-1 text-neutral-600">Last indexing check {when(latest("index")!.ranAt)} PKT.</p>
      ) : null}
      {failures.length > 0 ? (
        <ul className="mt-2 space-y-1 text-red-700">
          {failures.map((f) => (
            <li key={f.id}>
              {f.kind} failed {when(f.ranAt)}: {f.error}
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}

export type SearchData = Awaited<ReturnType<typeof loadSearchDashboard>>;

export default function SearchDashboard({
  data,
  range,
  configured,
  site,
}: {
  data: SearchData;
  range: 28 | 90;
  configured: boolean;
  site: string;
}) {
  const s = data.summary;

  const clicksChange = s ? change(s.clicks, s.clicksDelta) : null;
  const imprChange = s ? change(s.impressions, s.impressionsDelta) : null;
  const prevCtr =
    s && s.impressions - s.impressionsDelta > 0
      ? ((s.clicks - s.clicksDelta) / (s.impressions - s.impressionsDelta)) * 100
      : null;
  const ctrDelta = s && prevCtr != null ? Math.round((s.ctrPct - prevCtr) * 100) / 100 : null;
  const tone = (n: number | null | undefined) => (n == null || n === 0 ? "flat" : n > 0 ? "up" : "down");
  const vs = " vs previous 28 days";

  const indexed = data.index.filter((r) => r.verdict === "PASS");
  const notIndexed = data.index.filter((r) => r.verdict !== "PASS");
  const aq = data.index.filter((r) => pathOf(r.url).startsWith("/air-quality/"));
  const aqIndexed = aq.filter((r) => r.verdict === "PASS").length;

  const toggle = (active: boolean) =>
    `inline-flex min-h-9 items-center rounded-full px-3 text-sm ${
      active ? "bg-neutral-900 text-white" : "border border-neutral-300 text-neutral-700"
    }`;

  return (
    <div className="space-y-8 px-6 py-8">
      <header>
        <h1 className="text-2xl font-semibold">Search</h1>
        <p className="mt-1 max-w-2xl text-sm text-neutral-500">
          Google Search Console for {site.replace("sc-domain:", "")}, synced every morning. Figures cover
          the last 28 days that Google has finalised, which ends about three days ago.
        </p>
      </header>

      {!configured ? (
        <section className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          <h2 className="font-semibold">Search Console is not connected</h2>
          <ol className="mt-2 list-decimal space-y-1 pl-5">
            <li>In Google Cloud, create a service account, enable the Search Console API, and download a JSON key.</li>
            <li>In Search Console → Settings → Users and permissions, add the service account&apos;s email with Full permission.</li>
            <li>In Vercel, add the whole JSON as the environment variable GSC_SERVICE_ACCOUNT_KEY (Production), then redeploy.</li>
            <li>The next morning&apos;s sync backfills 16 months on its own, or run the Search Console sync workflow by hand in GitHub Actions.</li>
          </ol>
        </section>
      ) : null}

      <section className="space-y-3">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Card
            label="Clicks"
            value={fmt.format(s?.clicks ?? 0)}
            delta={s && clicksChange != null ? `${signed(s.clicksDelta)} (${pct(clicksChange)})${vs}` : null}
            tone={tone(s?.clicksDelta)}
          />
          <Card
            label="Impressions"
            value={fmt.format(s?.impressions ?? 0)}
            delta={s && imprChange != null ? `${signed(s.impressionsDelta)} (${pct(imprChange)})${vs}` : null}
            tone={tone(s?.impressionsDelta)}
          />
          <Card
            label="Click-through rate"
            value={`${s?.ctrPct ?? 0}%`}
            delta={ctrDelta != null ? `${ctrDelta > 0 ? "+" : ""}${ctrDelta} pts${vs}` : null}
            tone={tone(ctrDelta)}
          />
          {/* Lower is better: a positive delta means the number fell. */}
          <Card
            label="Average position"
            value={s && s.avgPosition ? String(s.avgPosition) : "—"}
            delta={
              s?.positionDelta == null
                ? null
                : s.positionDelta === 0
                  ? `No change${vs}`
                  : `${s.positionDelta > 0 ? "↑" : "↓"} ${Math.abs(s.positionDelta)} ${s.positionDelta > 0 ? "better" : "worse"}${vs}`
            }
            tone={tone(s?.positionDelta)}
          />
        </div>
        {s ? <p className="text-sm text-neutral-700">{interpret(s)}</p> : null}
      </section>

      <section className="space-y-3 rounded-2xl border border-neutral-200 bg-white p-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-semibold">Daily trend</h2>
          <nav className="flex gap-2" aria-label="Range">
            <Link href="/studio/search" className={toggle(range === 28)}>
              28 days
            </Link>
            <Link href="/studio/search?range=90" className={toggle(range === 90)}>
              90 days
            </Link>
          </nav>
        </div>
        <TrendChart points={data.trend} />
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Striking distance</h2>
        <p className="max-w-3xl text-sm text-neutral-500">
          Queries at positions 8 to 25 with at least 5 impressions: on page one&apos;s edge or just past it.
          Work on the ranking page: put the query&apos;s words in its title and H1, answer the query in a
          section of its own, and link to it from a related post.
          {data.rankingError ? ` (Could not look up ranking pages: ${data.rankingError})` : null}
        </p>
        <Table
          rows={data.striking}
          first="Query"
          columns={["position", "impressions", "clicks", "ranking", "fix"]}
          empty="Nothing in striking distance yet."
        />
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Low click-through</h2>
        <p className="max-w-3xl text-sm text-neutral-500">
          Pages on the first two pages of results, 20 or more impressions, under 2% clicking. People see
          them and choose something else: rewrite the title and description to answer the search.
        </p>
        <Table
          rows={data.lowCtr}
          first="Page"
          columns={["impressions", "ctr", "position", "fix"]}
          empty="No pages with low click-through."
        />
      </section>

      <div className="grid gap-8 xl:grid-cols-2">
        <section className="space-y-2">
          <h2 className="text-lg font-semibold">Top queries</h2>
          <Table rows={data.topQueries} first="Query" columns={["clicks", "impressions", "ctr", "position"]} empty="No queries yet." />
        </section>
        <section className="space-y-2">
          <h2 className="text-lg font-semibold">Top pages</h2>
          <Table rows={data.topPages} first="Page" columns={["clicks", "impressions", "position", "fix"]} empty="No pages yet." />
        </section>
      </div>

      {data.newQueries ? (
        <section className="space-y-2">
          <h2 className="text-lg font-semibold">New queries</h2>
          <p className="text-sm text-neutral-500">First seen in the last 28 days.</p>
          <Table
            rows={data.newQueries}
            first="Query"
            columns={["impressions", "clicks", "position", "firstSeen"]}
            empty="No new queries this month."
          />
        </section>
      ) : null}

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Indexing</h2>
        {data.index.length === 0 ? (
          <p className="text-sm text-neutral-500">Not checked yet. URL Inspection runs every Monday.</p>
        ) : (
          <>
            <p className="text-sm text-neutral-700">
              {indexed.length} of {data.index.length} sitemap URLs indexed.
              {aq.length > 0 ? ` Air quality: ${aqIndexed} of ${aq.length} city pages indexed.` : null}
            </p>
            {notIndexed.length > 0 ? (
              <div className="overflow-x-auto rounded-2xl border border-neutral-200 bg-white">
                <table className="w-full text-sm">
                  <thead className="bg-neutral-50 text-left text-xs text-neutral-500">
                    <tr>
                      <th className="px-3 py-2 font-medium">Not indexed</th>
                      <th className="px-3 py-2 font-medium">Google says</th>
                      <th className="px-3 py-2 font-medium">Last crawled</th>
                    </tr>
                  </thead>
                  <tbody>
                    {notIndexed.map((r) => (
                      <tr key={r.url} className="border-t border-neutral-100">
                        <td className="break-all px-3 py-2">{pathOf(r.url)}</td>
                        <td className="px-3 py-2">{r.coverageState ?? r.verdict ?? "Unknown"}</td>
                        <td className="px-3 py-2">{r.lastCrawled ? when(r.lastCrawled) : "Never"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
          </>
        )}
      </section>

      <SyncStatus logs={data.logs} configured={configured} stale={data.syncStale} />
    </div>
  );
}
