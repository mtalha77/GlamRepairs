import { unstable_cache } from "next/cache";

import { createPublicSupabaseClient } from "@/lib/supabase/publicClient";

/**
 * A post's hero image, from the media library — HANDOVER-45.
 *
 * Only images linked through `studio_post_media` count. They are the ones
 * with measured width and height (so `next/image` reserves the space and
 * nothing shifts) and with alt text the database refused to save without.
 *
 * `studio_blog_posts.hero_image_url` alone is not trusted for rendering: all
 * thirteen posts carry a URL under /images/blog/ for files that were never
 * deployed, so reading it served a 404 as every post's og:image and an empty
 * box on each homepage card. Posts without a library hero fall back to the
 * generated per-post card, which always exists.
 */

export type PostHero = {
  url: string;
  width: number;
  height: number;
  alt: string;
  caption: string | null;
  credit: string | null;
};

export const POST_HERO_TAG = "post-heroes";

const loadHeroes = unstable_cache(
  async (): Promise<Record<string, PostHero>> => {
    try {
      const supabase = createPublicSupabaseClient();
      const { data, error } = await supabase
        .from("studio_post_media")
        .select(
          "post_slug, sort_order, media:studio_media!studio_post_media_media_id_fkey(public_url, width, height, alt_text, caption, credit)",
        )
        .eq("role", "hero")
        .order("sort_order", { ascending: true });
      if (error || !data) {
        if (error) console.error("[postHero]", error.message);
        return {};
      }
      const out: Record<string, PostHero> = {};
      for (const row of data as unknown as {
        post_slug: string;
        media: {
          public_url: string;
          width: number;
          height: number;
          alt_text: string;
          caption: string | null;
          credit: string | null;
        } | null;
      }[]) {
        if (!row.media || out[row.post_slug]) continue;
        out[row.post_slug] = {
          url: row.media.public_url,
          width: row.media.width,
          height: row.media.height,
          alt: row.media.alt_text,
          caption: row.media.caption,
          credit: row.media.credit,
        };
      }
      return out;
    } catch (error) {
      console.error("[postHero]", error);
      return {};
    }
  },
  ["post-heroes"],
  { revalidate: 3600, tags: [POST_HERO_TAG] },
);

export async function getPostHero(slug: string): Promise<PostHero | null> {
  return (await loadHeroes())[slug] ?? null;
}

export async function getPostHeroes(): Promise<Record<string, PostHero>> {
  return loadHeroes();
}
