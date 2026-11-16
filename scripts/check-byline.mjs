#!/usr/bin/env node
/**
 * Handover 73 Part 1.3: the schema author must match the rendered byline.
 *
 * For every published post in the sitemap, the name inside the visible
 * byline link (data-byline-author) must equal the `name` of the Person node
 * the Article's `author` points at, and likewise the reviewer
 * (data-byline-reviewer) for the WebPage's `reviewedBy`. A mismatch between
 * generated schema and the rendered byline is the most common failure of
 * this pattern, so it is checked on what a crawler actually receives.
 *
 *   node scripts/check-byline.mjs --base https://www.glamrepairs.com
 */

const args = process.argv.slice(2);
const at = args.indexOf("--base");
const BASE = (at >= 0 ? args[at + 1] : process.env.BASE_URL || "https://www.glamrepairs.com").replace(/\/$/, "");
const BYPASS = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
const HEADERS = BYPASS ? { "x-vercel-protection-bypass": BYPASS } : {};

const decode = (s) =>
  s.replace(/&amp;/g, "&").replace(/&#x27;|&#39;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">").trim();

function nodesOf(html) {
  const nodes = [];
  for (const m of html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)) {
    try {
      const data = JSON.parse(m[1]);
      for (const n of data["@graph"] ?? [data]) nodes.push(n);
    } catch {
      /* not ours */
    }
  }
  return nodes;
}

const linkText = (html, attr) => {
  const m = html.match(new RegExp(`<a[^>]*\\b${attr}\\b[^>]*>([^<]*)</a>`));
  return m ? decode(m[1]) : null;
};

const sitemap = await (await fetch(`${BASE}/sitemap.xml`, { headers: HEADERS })).text();
const posts = [...sitemap.matchAll(/<loc>([^<]*\/blog\/[^<]+)<\/loc>/g)].map((m) => new URL(m[1]).pathname);
const failures = [];

for (const path of posts) {
  const html = await (await fetch(`${BASE}${path}`, { headers: HEADERS })).text();
  const nodes = nodesOf(html);
  const person = (id) => nodes.find((n) => n["@type"] === "Person" && n["@id"] === id);
  const article = nodes.find((n) => n["@type"] === "Article");
  const page = nodes.find((n) => n["@type"] === "WebPage" && n.reviewedBy);

  const shownAuthor = linkText(html, "data-byline-author");
  const schemaAuthor = article?.author?.["@id"] ? person(article.author["@id"])?.name : null;
  if (!shownAuthor || !schemaAuthor || shownAuthor !== schemaAuthor) {
    failures.push(`${path}: byline author "${shownAuthor}" vs schema author "${schemaAuthor}"`);
  }
  if (page) {
    const shownReviewer = linkText(html, "data-byline-reviewer");
    const schemaReviewer = person(page.reviewedBy["@id"])?.name ?? null;
    if (shownReviewer !== schemaReviewer) {
      failures.push(`${path}: byline reviewer "${shownReviewer}" vs schema reviewedBy "${schemaReviewer}"`);
    }
  }
}

console.log(`Checked ${posts.length} posts against ${BASE}.`);
if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}
console.log("Byline and schema agree on every post.");
