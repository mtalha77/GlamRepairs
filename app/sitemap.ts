import type { MetadataRoute } from "next";
import { abs } from "@/lib/seo/site";
import { listAuthors } from "@/lib/seo/authors";

/**
 * sitemap.xml
 *
 * The Ahrefs crawl reported "Indexable page not in sitemap" on 23 of 26 URLs.
 * That was not a misconfiguration — there was no sitemap at all. This is the
 * file.
 *
 * ── What is deliberately excluded ────────────────────────────────────────────
 * Funnel step routes (`/booking/step/[step]`, `/onboarding/step/[step]`) are
 * left out on purpose. They are stateful, near-duplicate, and thin — exactly
 * the pages that drag a small site's quality signal down. Same for `/preview`,
 * `/p/*` (client photographs), the studio and the API.
 *
 * Only canonical, indexable, standalone pages belong here.
 */
type Entry = MetadataRoute.Sitemap[number];

const STATIC_ROUTES: { path: string; priority: number; changeFrequency: Entry["changeFrequency"] }[] = [
  { path: "/", priority: 1.0, changeFrequency: "weekly" },
  { path: "/pricing", priority: 0.9, changeFrequency: "monthly" },
  // `/booking` is deliberately absent. Checked against the repo: it is a
  // `redirect("/onboarding/step/1")`, not a page. Listing a redirecting URL in
  // a sitemap is an error in its own right, and it is very likely one of the
  // three "3XX redirect" warnings in the Ahrefs crawl. The funnel is reachable
  // from every CTA; it does not belong in the sitemap.
  { path: "/about", priority: 0.7, changeFrequency: "monthly" },
  { path: "/contact", priority: 0.5, changeFrequency: "yearly" },
  { path: "/editorial-policy", priority: 0.4, changeFrequency: "yearly" },
  // Uncomment once the legal pages are ported across:
  // { path: "/terms", priority: 0.3, changeFrequency: "yearly" },
  // { path: "/privacy", priority: 0.3, changeFrequency: "yearly" },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const staticEntries: MetadataRoute.Sitemap = STATIC_ROUTES.map((r) => ({
    url: abs(r.path),
    lastModified: now,
    changeFrequency: r.changeFrequency,
    priority: r.priority,
  }));

  // Author pages carry the credentials that make YMYL content defensible, so
  // they are worth indexing in their own right.
  const authorEntries: MetadataRoute.Sitemap = listAuthors().map((a) => ({
    url: abs(`/authors/${a.slug}`),
    lastModified: now,
    changeFrequency: "monthly",
    priority: 0.5,
  }));

  return [...staticEntries, ...authorEntries];
}
