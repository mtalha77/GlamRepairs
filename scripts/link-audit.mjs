#!/usr/bin/env node
/**
 * Link audit, Handover 75 Part 6.1.
 *
 * Safepay's checklist: "All pages and links on your website should be
 * working." This proves it from the outside, the way a reviewer sees it.
 *
 *   1. Every URL in /sitemap.xml must answer 200 directly (no redirect).
 *   2. Every internal href on those pages must answer 200 directly. An
 *      internal link that redirects still "works" for a person, but it is
 *      exactly what Search Console files under "Page with redirect", so it
 *      counts as a failure here.
 *   3. External links are requested too (following redirects) and reported,
 *      but social sites often refuse bots, so they never fail the run.
 *
 * Usage: node scripts/link-audit.mjs [--base https://www.glamrepairs.com]
 * Exit 1 if any sitemap URL or internal link is not a direct 200.
 */
import { appendFileSync } from "node:fs";

const args = process.argv.slice(2);
const bi = args.indexOf("--base");
const BASE = (bi !== -1 ? args[bi + 1] : "https://www.glamrepairs.com").replace(/\/$/, "");
const HOST = new URL(BASE).host;
const UA = "GlamRepairs-link-audit/1.0";
const SUMMARY = process.env.GITHUB_STEP_SUMMARY;

const out = (s) => {
  console.log(s);
  if (SUMMARY) appendFileSync(SUMMARY, s + "\n");
};

async function head(url, follow) {
  try {
    const res = await fetch(url, {
      redirect: follow ? "follow" : "manual",
      headers: { "user-agent": UA },
      signal: AbortSignal.timeout(30000),
    });
    const body = res.headers.get("content-type")?.includes("text/html") && !follow ? await res.text() : "";
    return { status: res.status, location: res.headers.get("location") || "", body, final: res.url };
  } catch (e) {
    return { status: "ERR", location: String(e.message || e), body: "", final: "" };
  }
}

function internalPath(href) {
  if (!href || /^(mailto:|tel:|#|javascript:|data:)/i.test(href)) return null;
  let u;
  try {
    u = new URL(href, BASE + "/");
  } catch {
    return null;
  }
  if (u.host !== HOST) return { external: u.href };
  if (u.pathname.startsWith("/_next/") || u.pathname.startsWith("/api/")) return null;
  // Static files (images, icons, fonts) are not pages.
  if (/\.(png|jpe?g|webp|svg|ico|gif|css|js|woff2?|txt|xml|pdf)$/i.test(u.pathname)) return null;
  return { path: u.pathname + u.search };
}

const sm = await fetch(`${BASE}/sitemap.xml`, { headers: { "user-agent": UA } }).then((r) => r.text());
const pages = [...sm.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1]).pathname);

const failures = [];
const links = new Map(); // path -> Set(source)
const external = new Map();

for (const p of pages) {
  const r = await head(BASE + p, false);
  if (r.status !== 200) failures.push({ kind: "sitemap", url: p, status: r.status, location: r.location, from: "sitemap.xml" });
  for (const m of r.body.matchAll(/href="([^"]+)"/g)) {
    const t = internalPath(m[1].replace(/&amp;/g, "&"));
    if (!t) continue;
    if (t.external) {
      if (!external.has(t.external)) external.set(t.external, new Set());
      external.get(t.external).add(p);
    } else {
      if (!links.has(t.path)) links.set(t.path, new Set());
      links.get(t.path).add(p);
    }
  }
}

for (const [path, from] of links) {
  const r = await head(BASE + path, false);
  if (r.status !== 200) {
    failures.push({ kind: "link", url: path, status: r.status, location: r.location, from: [...from].slice(0, 4).join(", ") });
  }
}

out(`## Link audit: ${BASE}`);
out(`${pages.length} sitemap URLs, ${links.size} distinct internal links, ${external.size} external links.\n`);
if (failures.length) {
  out(`### Not a direct 200 (${failures.length})`);
  out("| Kind | URL | Status | Location | Linked from |\n|---|---|---|---|---|");
  for (const f of failures) out(`| ${f.kind} | ${f.url} | ${f.status} | ${f.location || "-"} | ${f.from} |`);
} else {
  out("### Every sitemap URL and internal link answers 200 directly.");
}

out("\n### External links (reported, never fail the run)");
out("| URL | Final status | Linked from |\n|---|---|---|");
for (const [url, from] of external) {
  const r = await head(url, true);
  out(`| ${url} | ${r.status} | ${[...from].slice(0, 3).join(", ")} |`);
}

process.exit(failures.length ? 1 : 0);
