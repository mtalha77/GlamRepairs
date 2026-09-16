#!/usr/bin/env node
/**
 * Copy guard — HOTFIX-26 §2.
 *
 * ── Why this exists ──────────────────────────────────────────────────────
 * "King Faisal University" has now been removed from this site four times
 * and come back four times. Each round removed it from wherever it was
 * visible and missed a copy somewhere else: the byline, then the schema,
 * then the schema again. The last round (HOTFIX-25 §2.2) took it out of the
 * rendered byline and left it in the Person node, which app/layout.tsx
 * emits on EVERY route — so a reader saw it gone from six pages while a
 * crawler still saw it on all sixteen.
 *
 * A reviewer cannot catch that by looking at the page. This can.
 *
 * ── Why it checks RENDERED OUTPUT, not source ────────────────────────────
 * A grep over the repo would have missed most of what this is for. The
 * banned word "aesthetician" was in `meta_description` on three blog posts —
 * rows in Postgres, not lines in a file. So were most of the em dashes.
 * This fetches real responses from a real build, which is the only view
 * that sees code and database together, the way a visitor does.
 *
 * ── Why two different rules ──────────────────────────────────────────────
 * BANNED is a hard zero. Those strings are wrong wherever they appear and
 * there are none left, so the guard passes today and fails the moment one
 * returns. That is the whole point.
 *
 * Em dashes are a per-page BUDGET that can only ratchet down, because there
 * are still hundreds and a hard zero would fail on the first run. A guard
 * that fails from day one gets commented out in a week and protects
 * nothing. A budget fails only on a REGRESSION, so it is green today and
 * still catches a new one — and every hand-edit pass lowers it with
 * `--update-budget`.
 *
 * ── Usage ────────────────────────────────────────────────────────────────
 *   npm run build && npx next start -p 3100 &
 *   node scripts/check-copy.mjs                      # check
 *   node scripts/check-copy.mjs --update-budget      # re-baseline em dashes
 *   node scripts/check-copy.mjs --base https://www.glamrepairs.com
 *
 * Exit code 1 on any violation, so CI can gate on it.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const BUDGET_PATH = join(HERE, "copy-budget.json");

const args = process.argv.slice(2);
const UPDATE = args.includes("--update-budget");
const baseIdx = args.indexOf("--base");
const BASE =
  baseIdx !== -1 ? args[baseIdx + 1] : "http://127.0.0.1:3100";

/**
 * Strings that must never reach a visitor or a crawler.
 *
 * Each is a regex plus the reason, because a guard that just says
 * "violation" teaches nobody why — and the next person to hit one needs to
 * know whether to fix the copy or the rule.
 */
const BANNED = [
  {
    re: /King Faisal/i,
    why:
      "The awarding university does not go on the degree line or in the " +
      "Person schema. It belongs on /credentials, in the hec-degree note, " +
      "where there is room to explain that HEC attested a degree the " +
      "university awarded. See lib/seo/schema.ts.",
    // /credentials is where the explanatory sentence lives, by design.
    allow: ["/credentials"],
  },
  {
    re: /Coursera/i,
    /*
     * VISIBLE TEXT ONLY, and the distinction is the point.
     *
     * The first run of this guard flagged Coursera on all 16 pages, the same
     * way King Faisal was on all 16 — but for a different reason, and only
     * one of them is a defect. The hit is `url` on the course credential
     * node, which is the Coursera verification link. That link is what makes
     * the credential checkable; it is the good kind of Coursera reference
     * and it should stay.
     *
     * What the rule is actually about is FRAMING in prose: "via Coursera"
     * sitting next to "Duke University" invites a reader to weigh the
     * delivery platform against the issuer. A URL in a graph invites nobody
     * to weigh anything.
     *
     * Contrast with King Faisal, which is checked everywhere: an
     * Organization NAME in the graph is a claim about who recognised the
     * credential. A URL is a pointer to evidence.
     */
    scope: "visible",
    why:
      "No delivery platform beside the issuer in visible copy. 'via " +
      "Coursera' next to 'Duke University' invites the reader to weigh the " +
      "platform against the university. /credentials carries the platform " +
      "and the 'coursework, not a licence' note. (The JSON-LD verification " +
      "URL is deliberately exempt — see the comment on this rule.)",
    allow: ["/credentials"],
  },
  {
    re: /aesthetician/i,
    why:
      "Banned word. The one title for this person is 'Certified Aesthetics " +
      "Practitioner'. A second variant undercuts the Person schema and " +
      "sameAs wiring, and 'aesthetician' implies a licensed title she does " +
      "not hold. Read it from PRACTITIONER.title in lib/seo/authors.ts.",
  },
  {
    re: /\bBSc\b/,
    why: "BS, never BSc — Pakistani universities award BS.",
  },
  {
    re: /\bLicensed\b/,
    why:
      "No licence is held. Claiming one in a YMYL niche is a false " +
      "credential claim.",
  },
  {
    re: /Dr\.?\s+Ayma/i,
    why:
      "Not a physician. 'Dr.' is the single fastest way to lose a YMYL " +
      "site's credibility, and a genuine liability if a client relies on it.",
  },
];

const EM_DASH = /—/g;

/**
 * Routes are read from the live sitemap so this list cannot drift the way
 * the thing it is guarding did. Anything the sitemap omits but a visitor
 * can still reach is listed here explicitly.
 */
const EXTRA_ROUTES = ["/blog", "/authors/ayma-arif"];

async function routes() {
  const res = await fetch(`${BASE}/sitemap.xml`);
  if (!res.ok) throw new Error(`sitemap.xml -> ${res.status}`);
  const xml = await res.text();
  const paths = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) =>
    new URL(m[1]).pathname,
  );
  return [...new Set([...paths, ...EXTRA_ROUTES])].sort();
}

/**
 * Everything a visitor or a crawler can read: visible text AND the JSON-LD,
 * which is exactly where the last four rounds of this bug hid.
 *
 * <script type="application/ld+json"> is kept. Every other <script> and
 * <style> is dropped — framework payloads echo page copy back as escaped
 * JSON, which would double-count em dashes and report the same violation
 * twice.
 */
function readable(html) {
  const ld = [...html.matchAll(
    /<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi,
  )]
    .map((m) => m[1])
    .join("\n");

  const visible = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ");

  return { ld, visible, all: `${visible}\n${ld}` };
}

const budget = (() => {
  try {
    return JSON.parse(readFileSync(BUDGET_PATH, "utf8"));
  } catch {
    return {};
  }
})();

const violations = [];
const counts = {};
const skipped = [];

const list = await routes();
console.log(`Checking ${list.length} routes against ${BASE}\n`);

for (const route of list) {
  const res = await fetch(`${BASE}${route}`);
  if (!res.ok) {
    skipped.push(`${route} (HTTP ${res.status})`);
    continue;
  }
  const { all, visible } = readable(await res.text());

  for (const rule of BANNED) {
    if (rule.allow?.includes(route)) continue;
    // Default scope is everything a crawler reads, JSON-LD included — that
    // is where this class of bug has hidden every time. A rule opts down to
    // `visible` only where a machine-readable occurrence is legitimate.
    const haystack = rule.scope === "visible" ? visible : all;
    const hit = rule.re.exec(haystack);
    if (hit) {
      violations.push({ route, found: hit[0], why: rule.why });
    }
  }

  const em = (all.match(EM_DASH) ?? []).length;
  counts[route] = em;

  const allowed = budget[route];
  if (!UPDATE && allowed !== undefined && em > allowed) {
    violations.push({
      route,
      found: `${em} em dashes (budget ${allowed})`,
      why:
        "Em dash count went UP. The budget only ratchets down. Fix the new " +
        "one, or if the increase is deliberate run --update-budget and say " +
        "why in the commit.",
    });
  }
}

if (UPDATE) {
  // `_readme` is the only explanation the budget file can carry — JSON has
  // no comments — so it has to survive a re-baseline. Without this, the
  // first `--update-budget` silently deletes the note telling the next
  // person that a local baseline does not cover the blog posts.
  const next = budget._readme
    ? { _readme: budget._readme, ...counts }
    : counts;
  writeFileSync(BUDGET_PATH, `${JSON.stringify(next, null, 2)}\n`);
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  console.log(`Wrote ${BUDGET_PATH}\n  ${total} em dashes across ${list.length} routes`);
}

if (skipped.length) {
  console.log("SKIPPED (not reachable — these were NOT checked):");
  skipped.forEach((s) => console.log(`  - ${s}`));
  console.log(
    "  Locally this is usually Supabase or OPENWEATHER_API_KEY being " +
      "absent, which 404s the blog posts and /air-quality. Those are the " +
      "pages most of the copy lives on, so a local pass is weaker than a " +
      "pass against a real deployment.\n",
  );
}

if (violations.length) {
  console.error(`\n${violations.length} COPY VIOLATION(S)\n`);
  for (const v of violations) {
    console.error(`  ${v.route}`);
    console.error(`    found: ${v.found}`);
    console.error(`    why:   ${v.why}\n`);
  }
  process.exit(1);
}

const total = Object.values(counts).reduce((a, b) => a + b, 0);
console.log(
  `No banned copy. ${total} em dashes across ${Object.keys(counts).length} checked routes.`,
);
