import type { NextConfig } from "next";

/**
 * MERGED — replaces next.config.ts.
 *
 * Everything the dev had is preserved: the AVIF/WebP image formats, the
 * `pdf-lib` external package (report generation depends on it), and the
 * turbopack root. Only the `redirects()` block is new.
 *
 * ── Why the redirects exist ──────────────────────────────────────────────────
 * Search Console reported a 404 on `/index.html`. Checking the live site, the
 * old static build left **four** dead URLs, not one:
 *
 *   /index.html  /about.html  /pricing.html  /contact.html   → all 404 today
 *
 * Google has only surfaced `/index.html` so far; the rest are queued behind it.
 * A 404 on a previously indexed URL throws away whatever authority that URL had
 * accumulated. A 308 hands it to the replacement page instead, which is free
 * link equity you have already earned.
 */
const nextConfig: NextConfig = {
  images: {
    formats: ["image/avif", "image/webp"],
  },
  serverExternalPackages: ["pdf-lib"],
  turbopack: {
    root: __dirname,
  },
  async redirects() {
    return [
      // Legacy static site → current routes. `permanent: true` emits a 308,
      // which Google treats as a 301 and which passes ranking signals.
      { source: "/index.html", destination: "/", permanent: true },
      { source: "/about.html", destination: "/about", permanent: true },
      { source: "/pricing.html", destination: "/pricing", permanent: true },
      { source: "/contact.html", destination: "/contact", permanent: true },
      // Deliberately NOT a catch-all `/:path*.html`. A blanket rule would
      // silently swallow any future genuine 404 and make it look like a
      // working page, which is harder to debug than a missing redirect.
    ];
  },
};

export default nextConfig;
