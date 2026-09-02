"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { requireStudioMember } from "@/lib/studio/member";
import { readingMinutes } from "@/lib/blog/markdown";
import { AUTHORS } from "@/lib/seo/authors";

/**
 * Server actions for the blog admin.
 *
 * Two rules are enforced here on top of the database constraints:
 *
 *   1. Publishing requires a reviewer whose slug exists in the author registry
 *      AND who is marked `canReview`. The DB constraint enforces "a reviewer is
 *      set"; this enforces "the reviewer is real and qualified".
 *   2. Publishing requires meaningful body content. Thin YMYL pages are a
 *      liability, so the floor is a hard stop rather than a lint warning.
 *
 * `revalidatePath` is called on publish/unpublish so the public blog reflects
 * the change immediately instead of serving a stale cached page.
 */
export type ActionResult = { ok: true } | { ok: false; error: string };

const MIN_PUBLISH_CHARS = 1200;

function slugify(s: string) {
  return s
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80);
}

async function guard() {
  const { user, member } = await requireStudioMember();
  if (!user || !member) return null;
  return { user, member };
}

export async function saveBlogPost(formData: FormData): Promise<ActionResult> {
  const auth = await guard();
  if (!auth) return { ok: false, error: "Not signed in." };

  const id = String(formData.get("id") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const body = String(formData.get("body_markdown") ?? "");

  if (!title) return { ok: false, error: "Give the post a title." };

  const slug = String(formData.get("slug") ?? "").trim() || slugify(title);

  const payload = {
    title,
    slug,
    excerpt: String(formData.get("excerpt") ?? "").trim() || null,
    body_markdown: body,
    meta_title: String(formData.get("meta_title") ?? "").trim() || null,
    meta_description: String(formData.get("meta_description") ?? "").trim() || null,
    target_keyword: String(formData.get("target_keyword") ?? "").trim() || null,
    cluster: String(formData.get("cluster") ?? "").trim() || null,
    reviewer_slug: String(formData.get("reviewer_slug") ?? "").trim() || null,
    author_slug: String(formData.get("author_slug") ?? "ayma-arif").trim(),
    reading_minutes: readingMinutes(body),
    updated_by: auth.user.id,
  };

  const supabase = await createServerSupabaseClient();

  if (id) {
    const { error } = await supabase
      .from("studio_blog_posts")
      .update(payload)
      .eq("id", id);
    if (error) {
      console.error("[saveBlogPost:update]", error.message);
      return { ok: false, error: error.message };
    }
  } else {
    const { error } = await supabase
      .from("studio_blog_posts")
      .insert({ ...payload, created_by: auth.user.id });
    if (error) {
      console.error("[saveBlogPost:insert]", error.message);
      return { ok: false, error: error.message };
    }
  }

  revalidatePath("/studio/blog");
  return { ok: true };
}

export async function publishBlogPost(id: string): Promise<ActionResult> {
  const auth = await guard();
  if (!auth) return { ok: false, error: "Not signed in." };

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("studio_blog_posts")
    .select("slug, body_markdown, reviewer_slug")
    .eq("id", id)
    .maybeSingle();

  if (error || !data) {
    console.error("[publishBlogPost:load]", error?.message);
    return { ok: false, error: "Could not load that post." };
  }

  // Gate 1 — a real, qualified reviewer.
  const reviewer = data.reviewer_slug ? AUTHORS[data.reviewer_slug] : undefined;
  if (!reviewer || !reviewer.canReview) {
    return {
      ok: false,
      error:
        "Set a qualified reviewer before publishing. Health content without a " +
        "named reviewer is what core updates demote.",
    };
  }

  // Gate 2 — not thin.
  if ((data.body_markdown ?? "").trim().length < MIN_PUBLISH_CHARS) {
    return {
      ok: false,
      error: `This post is too short to publish (needs ~${MIN_PUBLISH_CHARS} characters).`,
    };
  }

  const now = new Date().toISOString();
  const { error: upErr } = await supabase
    .from("studio_blog_posts")
    .update({
      status: "published",
      published_at: now,
      reviewed_at: now,
      updated_by: auth.user.id,
    })
    .eq("id", id);

  if (upErr) {
    console.error("[publishBlogPost:update]", upErr.message);
    return { ok: false, error: upErr.message };
  }

  revalidatePath("/blog");
  revalidatePath(`/blog/${data.slug}`);
  revalidatePath("/studio/blog");
  revalidatePath("/sitemap.xml");
  return { ok: true };
}

export async function unpublishBlogPost(id: string): Promise<ActionResult> {
  const auth = await guard();
  if (!auth) return { ok: false, error: "Not signed in." };

  const supabase = await createServerSupabaseClient();
  const { data } = await supabase
    .from("studio_blog_posts")
    .select("slug")
    .eq("id", id)
    .maybeSingle();

  // published_at is cleared too, or the DB check constraint would still read
  // this row as publishable.
  const { error } = await supabase
    .from("studio_blog_posts")
    .update({ status: "draft", published_at: null, updated_by: auth.user.id })
    .eq("id", id);

  if (error) {
    console.error("[unpublishBlogPost]", error.message);
    return { ok: false, error: error.message };
  }

  revalidatePath("/blog");
  if (data?.slug) revalidatePath(`/blog/${data.slug}`);
  revalidatePath("/studio/blog");
  return { ok: true };
}
