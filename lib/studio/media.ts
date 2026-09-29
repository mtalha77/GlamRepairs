import "server-only";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { MediaRole } from "@/lib/studio/mediaProcess";

/**
 * The media library — HANDOVER-45 §3.2.
 *
 * Images live in the public `blog-images` bucket and are described by a
 * `studio_media` row, which is where the SEO rules are enforced: alt text of
 * at least ten characters, real width and height, and 500 KB at most.
 */

export const MEDIA_BUCKET = "blog-images";

export type MediaItem = {
  id: string;
  storagePath: string;
  publicUrl: string;
  filename: string;
  altText: string;
  caption: string | null;
  credit: string | null;
  mimeType: string;
  width: number;
  height: number;
  bytes: number;
  role: MediaRole;
  focalX: number;
  focalY: number;
  createdAt: string;
};

/** Where an image is in use. Deletion is refused while this is non-empty. */
export type MediaUsage = { label: string; href: string }[];

const COLUMNS =
  "id, storage_path, public_url, filename, alt_text, caption, credit, mime_type, " +
  "width, height, bytes, role, focal_x, focal_y, created_at";

type Row = {
  id: string;
  storage_path: string;
  public_url: string;
  filename: string;
  alt_text: string;
  caption: string | null;
  credit: string | null;
  mime_type: string;
  width: number;
  height: number;
  bytes: number;
  role: MediaRole;
  focal_x: number | string;
  focal_y: number | string;
  created_at: string;
};

function toItem(r: Row): MediaItem {
  return {
    id: r.id,
    storagePath: r.storage_path,
    publicUrl: r.public_url,
    filename: r.filename,
    altText: r.alt_text,
    caption: r.caption,
    credit: r.credit,
    mimeType: r.mime_type,
    width: r.width,
    height: r.height,
    bytes: r.bytes,
    role: r.role,
    focalX: Number(r.focal_x),
    focalY: Number(r.focal_y),
    createdAt: r.created_at,
  };
}

export async function listMedia(opts: { role?: MediaRole | null; q?: string | null } = {}) {
  const supabase = await createServerSupabaseClient();
  let query = supabase
    .from("studio_media")
    .select(COLUMNS)
    .order("created_at", { ascending: false })
    .limit(500);
  if (opts.role) query = query.eq("role", opts.role);
  const q = opts.q?.trim().replace(/[%,()]/g, " ");
  if (q) query = query.or(`filename.ilike.%${q}%,alt_text.ilike.%${q}%`);
  const { data, error } = await query;
  if (error) {
    console.error("[listMedia]", error.message);
    return [];
  }
  return (data as unknown as Row[]).map(toItem);
}

export async function getMedia(id: string): Promise<MediaItem | null> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("studio_media")
    .select(COLUMNS)
    .eq("id", id)
    .maybeSingle();
  if (error || !data) return null;
  return toItem(data as unknown as Row);
}

/**
 * Every place each image is referenced, keyed by media id.
 *
 * Four kinds of reference, checked together so the count is honest:
 *   1. `studio_post_media` links (hero, og, inline) made by the post editor;
 *   2. `page_seo.og_image_media_id` for the static pages;
 *   3. `seo_settings.default_og_media_id`;
 *   4. the URL itself appearing in a post's hero field or markdown body,
 *      which covers images placed before the link table existed or pasted
 *      in by hand.
 */
export async function mediaUsage(items: MediaItem[]): Promise<Map<string, MediaUsage>> {
  const usage = new Map<string, MediaUsage>(items.map((m) => [m.id, []]));
  if (items.length === 0) return usage;
  const supabase = await createServerSupabaseClient();
  const ids = items.map((m) => m.id);

  const [links, pages, settings, posts] = await Promise.all([
    supabase.from("studio_post_media").select("post_slug, media_id, role").in("media_id", ids),
    supabase.from("page_seo").select("path, og_image_media_id").in("og_image_media_id", ids),
    supabase.from("seo_settings").select("default_og_media_id").eq("id", 1).maybeSingle(),
    supabase.from("studio_blog_posts").select("id, slug, title, hero_image_url, body_markdown"),
  ]);

  const add = (id: string, label: string, href: string) => {
    const list = usage.get(id);
    if (list && !list.some((u) => u.label === label)) list.push({ label, href });
  };

  const postIdBySlug = new Map(
    (posts.data ?? []).map((p) => [p.slug as string, p.id as string]),
  );
  for (const l of links.data ?? []) {
    const postId = postIdBySlug.get(l.post_slug);
    add(l.media_id, `Post: ${l.post_slug} (${l.role})`, postId ? `/studio/blog/${postId}` : "/studio/blog");
  }
  for (const p of pages.data ?? []) {
    if (p.og_image_media_id) add(p.og_image_media_id, `Page ${p.path} (social image)`, "/studio/seo");
  }
  const defaultOg = settings.data?.default_og_media_id;
  if (defaultOg) add(defaultOg, "Site default social image", "/studio/seo?tab=site");

  for (const post of posts.data ?? []) {
    for (const m of items) {
      const inHero = post.hero_image_url === m.publicUrl;
      const inBody = typeof post.body_markdown === "string" && post.body_markdown.includes(m.publicUrl);
      if (inHero || inBody) {
        add(m.id, `Post: ${post.slug} (${inHero ? "hero" : "in text"})`, `/studio/blog/${post.id}`);
      }
    }
  }
  return usage;
}

export function formatBytes(bytes: number) {
  return bytes >= 1000 ? `${Math.round(bytes / 100) / 10} KB`.replace(".0 ", " ") : `${bytes} B`;
}
