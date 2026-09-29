import type { Metadata } from "next";
import { unstable_cache } from "next/cache";

import { SITE, SOCIAL_CARD, canonicalOg } from "@/lib/seo/site";
import { createPublicSupabaseClient } from "@/lib/supabase/publicClient";

/**
 * Page SEO from the database — HANDOVER-45 §3.5.
 *
 * Titles, descriptions, H1s and social images for the static pages used to
 * be string literals in each page file, so every wording change needed a
 * developer and a deploy. They now live in `page_seo` (one row per path)
 * and `seo_settings` (one row for the site), are edited in Studio → SEO,
 * and reach the live page within seconds of a save.
 *
 * ── Caching ──────────────────────────────────────────────────────────────
 * Both reads are cached for an hour under the `seo` tag. The studio save
 * actions call `updateTag(SEO_CACHE_TAG)`, so an edit shows on the next
 * request rather than after the hour. The hour is the ceiling for anything
 * that bypasses the studio, such as a hand-run SQL update.
 *
 * ── Failure is never fatal ───────────────────────────────────────────────
 * A missing row, a failed query or a missing Supabase config all fall back
 * to the values the page passes in, which are the strings it used before
 * this existed. A database outage must not take titles off the site.
 */

export const SEO_CACHE_TAG = "seo";

export type SeoImage = {
  url: string;
  width: number;
  height: number;
  alt: string;
};

export type SeoSettings = {
  brandName: string;
  titleSuffix: string;
  organizationType: string;
  sameAs: string[];
  twitterHandle: string | null;
  defaultOgImage: SeoImage | null;
};

export type PageSeo = {
  path: string;
  title: string;
  metaDescription: string;
  h1: string | null;
  noindex: boolean;
  canonicalOverride: string | null;
  ogImage: SeoImage | null;
};

/** What the site used before `seo_settings` existed. */
export const DEFAULT_SEO_SETTINGS: SeoSettings = {
  brandName: SITE.name,
  titleSuffix: ` | ${SITE.name}`,
  organizationType: "HealthAndBeautyBusiness",
  sameAs: [...SITE.sameAs],
  twitterHandle: null,
  defaultOgImage: null,
};

type MediaRow = {
  public_url: string;
  width: number;
  height: number;
  alt_text: string;
} | null;

function toImage(row: MediaRow): SeoImage | null {
  if (!row?.public_url) return null;
  return { url: row.public_url, width: row.width, height: row.height, alt: row.alt_text };
}

const MEDIA_COLUMNS = "public_url, width, height, alt_text";

export const getSeoSettings = unstable_cache(
  async (): Promise<SeoSettings> => {
    try {
      const supabase = createPublicSupabaseClient();
      const { data, error } = await supabase
        .from("seo_settings")
        .select(
          `brand_name, title_suffix, organization_type, same_as, twitter_handle,
           default_og:studio_media!seo_settings_default_og_media_id_fkey(${MEDIA_COLUMNS})`,
        )
        .eq("id", 1)
        .maybeSingle();
      if (error || !data) {
        if (error) console.error("[getSeoSettings]", error.message);
        return DEFAULT_SEO_SETTINGS;
      }
      const row = data as unknown as {
        brand_name: string;
        title_suffix: string;
        organization_type: string;
        same_as: string[] | null;
        twitter_handle: string | null;
        default_og: MediaRow;
      };
      return {
        brandName: row.brand_name || DEFAULT_SEO_SETTINGS.brandName,
        titleSuffix: row.title_suffix ?? DEFAULT_SEO_SETTINGS.titleSuffix,
        organizationType: row.organization_type || DEFAULT_SEO_SETTINGS.organizationType,
        sameAs: row.same_as ?? [],
        twitterHandle: row.twitter_handle,
        defaultOgImage: toImage(row.default_og),
      };
    } catch (error) {
      console.error("[getSeoSettings]", error);
      return DEFAULT_SEO_SETTINGS;
    }
  },
  ["seo-settings"],
  { revalidate: 3600, tags: [SEO_CACHE_TAG] },
);

const loadAllPageSeo = unstable_cache(
  async (): Promise<PageSeo[]> => {
    try {
      const supabase = createPublicSupabaseClient();
      const { data, error } = await supabase
        .from("page_seo")
        .select(
          `path, title, meta_description, h1, noindex, canonical_override,
           og:studio_media!page_seo_og_image_media_id_fkey(${MEDIA_COLUMNS})`,
        );
      if (error || !data) {
        if (error) console.error("[getPageSeo]", error.message);
        return [];
      }
      return (data as unknown as {
        path: string;
        title: string;
        meta_description: string;
        h1: string | null;
        noindex: boolean;
        canonical_override: string | null;
        og: MediaRow;
      }[]).map((r) => ({
        path: r.path,
        title: r.title,
        metaDescription: r.meta_description,
        h1: r.h1?.trim() || null,
        noindex: r.noindex,
        canonicalOverride: r.canonical_override?.trim() || null,
        ogImage: toImage(r.og),
      }));
    } catch (error) {
      console.error("[getPageSeo]", error);
      return [];
    }
  },
  ["page-seo-all"],
  { revalidate: 3600, tags: [SEO_CACHE_TAG] },
);

/** One path's row, or null. All rows are fetched once and cached together. */
export async function getPageSeo(path: string): Promise<PageSeo | null> {
  const rows = await loadAllPageSeo();
  return rows.find((r) => r.path === path) ?? null;
}

/** The suffix every page title ends with, e.g. " | Glam Repairs". */
export async function getTitleSuffix(): Promise<string> {
  return (await getSeoSettings()).titleSuffix;
}

/**
 * Full metadata for a static page.
 *
 * `fallback` is what the page used before `page_seo` existed; it is used
 * whole when there is no row. The title is set with `absolute` so the root
 * template cannot append a second suffix, and `twitter` is built explicitly
 * by `canonicalOg`: left to inherit, it serves the homepage's card on every
 * page, which is the bug HOTFIX-36 fixed and HANDOVER-45 warns about.
 */
export async function pageMetadata(
  path: string,
  fallback: { title: string; description: string },
  extra: { type?: string } = {},
): Promise<Metadata> {
  const [seo, settings] = await Promise.all([getPageSeo(path), getSeoSettings()]);
  const fullTitle = `${seo?.title ?? fallback.title}${settings.titleSuffix}`;
  const description = seo?.metaDescription ?? fallback.description;
  const image = seo?.ogImage ?? settings.defaultOgImage;
  const ogImage = image
    ? { url: image.url, width: image.width, height: image.height, alt: image.alt }
    : SOCIAL_CARD;

  const social = canonicalOg(path, {
    title: fullTitle,
    description,
    images: [ogImage],
    ...(extra.type ? { type: extra.type } : {}),
  });

  return {
    title: { absolute: fullTitle },
    description,
    ...social,
    // canonicalOg sets the canonical to `path`; an override replaces it.
    alternates: { canonical: seo?.canonicalOverride ?? path },
    twitter: {
      ...social.twitter,
      images: [ogImage.url],
      ...(settings.twitterHandle ? { site: settings.twitterHandle } : {}),
    },
    ...(seo?.noindex
      ? { robots: { index: false, follow: true, googleBot: { index: false, follow: true } } }
      : {}),
  };
}

/** The H1 for a static page: the row's when it has one, else the page's own. */
export async function pageH1(path: string, fallback: string): Promise<string> {
  return (await getPageSeo(path))?.h1 ?? fallback;
}
