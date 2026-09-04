/**
 * Single source of truth for site-wide SEO values.
 *
 * ── The `www` matters ────────────────────────────────────────────────────────
 * Verified live: `https://glamrepairs.com/pricing` 301s to
 * `https://www.glamrepairs.com/pricing`. **www is the canonical host.**
 *
 * Setting NEXT_PUBLIC_APP_URL to the bare domain makes every canonical tag,
 * sitemap entry and OG URL point at a host that redirects. That splits ranking
 * signals across two hosts and is exactly what produces "Page with redirect"
 * and "Duplicate, Google chose a different canonical" in Search Console —
 * which is the 4-URL error currently showing in the Ahrefs crawl.
 */
export const SITE = {
  name: "GlamRepairs",
  legalName: "GlamRepairs",
  tagline: "Online skin assessment, read by a certified practitioner",
  description:
    "Answer a few questions, send a few photos, and a certified practitioner " +
    "reads your skin and writes you a personalised plan you keep. No clinic, " +
    "no waiting room.",
  /** Canonical origin. Always www. No trailing slash. */
  url: (process.env.NEXT_PUBLIC_APP_URL || "https://www.glamrepairs.com").replace(
    /\/$/,
    "",
  ),
  locale: "en_PK",
  country: "PK",
  language: "en",
  // Consolidates the brand entity: tells Google these profiles and this site
  // are the same organisation. Only includes profiles that are live, public and
  // actually branded GlamRepairs — a 404 or an abandoned handle here is a
  // negative signal, not a neutral one. URLs match the ones already live in
  // Footer.tsx and CeoSection.tsx; no TikTok entry because no TikTok handle
  // exists elsewhere in the codebase — add one here only once it does.
  sameAs: [
    "https://www.instagram.com/glam.repairs/",
    "https://web.facebook.com/profile.php?id=61590698607527",
    "https://www.linkedin.com/company/glamrepairs/",
  ] as string[],
} as const;

/** Absolute URL helper — schema and sitemaps must never emit relative URLs. */
export function abs(path = "/"): string {
  return `${SITE.url}${path.startsWith("/") ? path : `/${path}`}`;
}
