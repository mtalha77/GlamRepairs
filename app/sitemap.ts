import type { MetadataRoute } from "next";
import { abs } from "@/lib/seo/site";
import { listAuthors } from "@/lib/seo/authors";
import { listPublishedForSitemap } from "@/lib/studio/blog";

/**
 * sitemap.xml
 *
 * Now async, because published posts come from the database. Without this the
 * blog was undiscoverable except by crawling links — the single biggest gap in
 * the first pass.
 *
 * ── What is deliberately excluded ────────────────────────────────────────────
 * `/booking` is a `redirect()`, not a page — listing a redirecting URL is an
 * error in its own right. Funnel step routes are stateful, near-duplicate and
 * thin. `/preview`, `/p/*` (client photographs), the studio and the API are all
 * private or noise.
 *
 * Only canonical, indexable, standalone pages belong here.
 */
type Entry = MetadataRoute.Sitemap[number];

// Revalidate rather than fully static: the post set changes when the studio
// publishes, and the DB read runs at runtime where Supabase env is present.
export const revalidate = 3600;

const STATIC_ROUTES: {
  path: string;
  priority: number;
  changeFrequency: Entry["changeFrequency"];
}[] = [
  { path: "/", priority: 1.0, changeFrequency: "weekly" },
  { path: "/pricing", priority: 0.9, changeFrequency: "monthly" },
  { path: "/blog", priority: 0.8, changeFrequency: "weekly" },
  { path: "/about", priority: 0.7, changeFrequency: "monthly" },
  { path: "/credentials", priority: 0.5, changeFrequency: "monthly" },
  { path: "/contact", priority: 0.5, changeFrequency: "yearly" },
  { path: "/editorial-policy", priority: 0.4, changeFrequency: "yearly" },
  { path: "/terms", priority: 0.3, changeFrequency: "yearly" },
  { path: "/privacy", priority: 0.3, changeFrequency: "yearly" },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
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

  // Real `lastModified` per post, not a blanket "now". Crawlers use it to
  // decide what to re-fetch; lying about it trains them to ignore it.
  const posts = await listPublishedForSitemap();
  const postEntries: MetadataRoute.Sitemap = posts.map((p) => ({
    url: abs(`/blog/${p.slug}`),
    lastModified: new Date(p.updatedAt),
    changeFrequency: "monthly",
    priority: 0.7,
  }));

  return [...staticEntries, ...authorEntries, ...postEntries];
}
