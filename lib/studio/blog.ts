import { createClient } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";
import { getSupabaseAnonKey, getSupabaseUrl } from "@/lib/supabase/env";

/**
 * Blog data access. Mirrors the conventions in lib/studio/member.ts — log the
 * error, return an empty/null value, never throw into a Server Component.
 *
 * Reads go through the anon client so RLS applies: the public sees published
 * posts, studio members see drafts too. No service-role key is used here, which
 * means a bug in this file cannot leak drafts.
 */
export type BlogStatus = "draft" | "published" | "archived";

export type BlogPost = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  bodyMarkdown: string;
  metaTitle: string | null;
  metaDescription: string | null;
  targetKeyword: string | null;
  cluster: string | null;
  heroImageUrl: string | null;
  readingMinutes: number | null;
  authorSlug: string;
  reviewerSlug: string | null;
  reviewedAt: string | null;
  status: BlogStatus;
  publishedAt: string | null;
  updatedAt: string;
  createdAt: string;
};

const COLUMNS =
  "id, slug, title, excerpt, body_markdown, meta_title, meta_description, " +
  "target_keyword, cluster, hero_image_url, reading_minutes, author_slug, " +
  "reviewer_slug, reviewed_at, status, published_at, updated_at, created_at";

/* eslint-disable @typescript-eslint/no-explicit-any */
function mapRow(row: any): BlogPost {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    excerpt: row.excerpt,
    bodyMarkdown: row.body_markdown ?? "",
    metaTitle: row.meta_title,
    metaDescription: row.meta_description,
    targetKeyword: row.target_keyword,
    cluster: row.cluster,
    heroImageUrl: row.hero_image_url,
    readingMinutes: row.reading_minutes,
    authorSlug: row.author_slug,
    reviewerSlug: row.reviewer_slug,
    reviewedAt: row.reviewed_at,
    status: row.status,
    publishedAt: row.published_at,
    updatedAt: row.updated_at,
    createdAt: row.created_at,
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

/* ── Public reads ─────────────────────────────────────────────────────────── */

export async function listPublishedPosts(): Promise<BlogPost[]> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("studio_blog_posts")
    .select(COLUMNS)
    .eq("status", "published")
    .order("published_at", { ascending: false });

  if (error) {
    console.error("[listPublishedPosts]", error.message);
    return [];
  }
  return (data ?? []).map(mapRow);
}

export async function getPublishedPost(slug: string): Promise<BlogPost | null> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("studio_blog_posts")
    .select(COLUMNS)
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();

  if (error) {
    console.error("[getPublishedPost]", error.message);
    return null;
  }
  return data ? mapRow(data) : null;
}

/* ── Studio reads (RLS lets members see drafts) ───────────────────────────── */

export async function listAllPosts(): Promise<BlogPost[]> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("studio_blog_posts")
    .select(COLUMNS)
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("[listAllPosts]", error.message);
    return [];
  }
  return (data ?? []).map(mapRow);
}

export async function getPostById(id: string): Promise<BlogPost | null> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("studio_blog_posts")
    .select(COLUMNS)
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("[getPostById]", error.message);
    return null;
  }
  return data ? mapRow(data) : null;
}

/**
 * Slug + last-modified for every published post, for the sitemap.
 *
 * Uses a cookie-free anon client on purpose. `sitemap()` is generated without a
 * request context, so the cookie-scoped server client's `cookies()` call is not
 * available here — the same constraint that applies to `generateStaticParams`.
 * Published posts are readable by anon under RLS, so no service-role key is
 * needed. Everything is wrapped so a missing env var at build time degrades to
 * an empty list rather than failing the build; the route revalidates at runtime
 * where the env is present.
 */
export async function listPublishedForSitemap(): Promise<
  { slug: string; updatedAt: string }[]
> {
  try {
    const supabase = createClient<Database>(
      getSupabaseUrl(),
      getSupabaseAnonKey(),
      { auth: { persistSession: false } },
    );
    const { data, error } = await supabase
      .from("studio_blog_posts")
      .select("slug, updated_at")
      .eq("status", "published");
    if (error) {
      console.error("[listPublishedForSitemap]", error.message);
      return [];
    }
    return (data ?? []).map((r: { slug: string; updated_at: string }) => ({
      slug: r.slug,
      updatedAt: r.updated_at,
    }));
  } catch (err) {
    console.error("[listPublishedForSitemap]", (err as Error).message);
    return [];
  }
}

/** Slugs for generateStaticParams on the public route. */
export async function listPublishedSlugs(): Promise<string[]> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("studio_blog_posts")
    .select("slug")
    .eq("status", "published");

  if (error) {
    console.error("[listPublishedSlugs]", error.message);
    return [];
  }
  return (data ?? []).map((r: { slug: string }) => r.slug);
}
