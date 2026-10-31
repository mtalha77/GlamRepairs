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
const SUPABASE_HOST = (() => {
  try {
    return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").hostname;
  } catch {
    return "";
  }
})();

const nextConfig: NextConfig = {
  images: {
    formats: ["image/avif", "image/webp"],
    /*
     * Handover 65 §3.4: the default list ends at 3840, so a full-bleed
     * `sizes="100vw"` image on a 2x laptop (1440 x 2 = 2880) fetched the
     * 3840 rendition: the homepage hero and the privacy background did.
     * Capped at 2048, which is past what any of these images shows at.
     */
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048],
    /*
     * HANDOVER-45 — media-library images are served from Supabase Storage.
     * Only the public `blog-images` bucket is allowed, by path, so the image
     * optimiser cannot be pointed at anything else on that host (the
     * private assessment-photos bucket in particular).
     */
    remotePatterns: SUPABASE_HOST
      ? [
          {
            protocol: "https",
            hostname: SUPABASE_HOST,
            pathname: "/storage/v1/object/public/blog-images/**",
          },
        ]
      : [],
  },
  serverExternalPackages: ["pdf-lib"],
  /*
   * 19 October 2026 — sharp's native library was missing from the deployed
   * functions. The tracer packed Next's own nested copy of libvips (8.17.3)
   * but not the 8.18.3 that the app's sharp 0.35 links against, so every
   * route that loaded sharp failed with ERR_DLOPEN_FAILED: the media library
   * and, through an import, the application decision buttons. Ship it
   * explicitly. (The callers also load sharp lazily now, so a failure here
   * breaks an image resize, never a page.)
   */
  outputFileTracingIncludes: {
    "/**": [
      "./node_modules/@img/sharp-libvips-linux-x64/lib/**/*",
      "./node_modules/@img/sharp-linux-x64/lib/**/*",
    ],
  },
  turbopack: {
    root: __dirname,
  },
  /*
   * Handover 63 — the test portal is never indexed. The header backs up the
   * meta tag in app/test/layout.tsx, because one is easy to lose.
   */
  async headers() {
    const noindex = [{ key: "X-Robots-Tag", value: "noindex, nofollow" }];
    return [
      { source: "/test", headers: noindex },
      { source: "/test/:path*", headers: noindex },
    ];
  },
  async redirects() {
    return [
      // Legacy static site → current routes. `permanent: true` emits a 308,
      // which Google treats as a 301 and which passes ranking signals.
      { source: "/index.html", destination: "/", permanent: true },
      { source: "/about.html", destination: "/about", permanent: true },
            { source: "/contact.html", destination: "/contact", permanent: true },
      // Handover 64 Part 6.1 — Google reported /pricing as "Duplicate,
      // Google chose different canonical" because the homepage reproduces
      // it. One pricing page: /compare, which now carries the plan card.
      { source: "/pricing", destination: "/compare", permanent: true },
      { source: "/pricing.html", destination: "/compare", permanent: true },
      // Deliberately NOT a catch-all `/:path*.html`. A blanket rule would
      // silently swallow any future genuine 404 and make it look like a
      // working page, which is harder to debug than a missing redirect.

      // HANDOVER-55 §2.7 — the project's production alias on vercel.app was
      // live and crawlable: the whole site, duplicated on a second host.
      // Only that one alias. Preview deployments use their own hostnames and
      // must keep working for review.
      {
        source: "/:path*",
        has: [{ type: "host", value: "glam-repairscom.vercel.app" }],
        destination: "https://www.glamrepairs.com/:path*",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
