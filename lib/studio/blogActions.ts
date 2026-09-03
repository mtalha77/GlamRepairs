"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { requireStudioMember } from "@/lib/studio/member";
import { readingMinutes } from "@/lib/blog/markdown";
import { AUTHORS } from "@/lib/seo/authors";

/**
 * Server actions for the blog admin.
 *
 * ── Bug this file fixes (reported 2 Sep 2026) ────────────────────────────────
 * Publishing failed with "Set a qualified reviewer before publishing" even
 * though a reviewer had been chosen in the dropdown.
 *
 * Cause: save and publish were two separate actions. The dropdown updated React
 * state, which enabled the Publish button, but `publishBlogPost` read the
 * *database* — where `reviewer_slug` was still null because the editor had not
 * been saved. The UI said ready; the server correctly refused.
 *
 * Fix: `publishBlogPost` now takes the form data and **saves before it
 * publishes**, in one action. There is no longer a window where what you see
 * and what is stored can disagree. The gates themselves are unchanged — a real,
 * qualified reviewer and a body long enough to be worth publishing.
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

/** Shared field mapping, so save and publish can never drift apart. */
function payloadFrom(formData: FormData, userId: string) {
  const title = String(formData.get("title") ?? "").trim();
  const body = String(formData.get("body_markdown") ?? "");
  const slug = String(formData.get("slug") ?? "").trim() || slugify(title);

  return {
    title,
    slug,
    body,
    row: {
      title,
      slug,
      excerpt: String(formData.get("excerpt") ?? "").trim() || null,
      body_markdown: body,
      meta_title: String(formData.get("meta_title") ?? "").trim() || null,
      meta_description:
        String(formData.get("meta_description") ?? "").trim() || null,
      target_keyword: String(formData.get("target_keyword") ?? "").trim() || null,
      cluster: String(formData.get("cluster") ?? "").trim() || null,
      reviewer_slug: String(formData.get("reviewer_slug") ?? "").trim() || null,
      author_slug: String(formData.get("author_slug") ?? "ayma-arif").trim(),
      reading_minutes: readingMinutes(body),
      updated_by: userId,
    },
  };
}

/** Writes the row and returns its id, creating it when there is no id yet. */
async function persist(
  formData: FormData,
  userId: string,
): Promise<{ ok: true; id: string; slug: string } | { ok: false; error: string }> {
  const id = String(formData.get("id") ?? "").trim();
  const { title, slug, row } = payloadFrom(formData, userId);

  if (!title) return { ok: false, error: "Give the post a title." };

  const supabase = await createServerSupabaseClient();

  if (id) {
    const { error } = await supabase
      .from("studio_blog_posts")
      .update(row)
      .eq("id", id);
    if (error) {
      console.error("[persist:update]", error.message);
      return { ok: false, error: error.message };
    }
    return { ok: true, id, slug };
  }

  const { data, error } = await supabase
    .from("studio_blog_posts")
    .insert({ ...row, created_by: userId })
    .select("id")
    .single();

  if (error || !data) {
    console.error("[persist:insert]", error?.message);
    return { ok: false, error: error?.message ?? "Could not create the post." };
  }
  return { ok: true, id: data.id, slug };
}

export async function saveBlogPost(formData: FormData): Promise<ActionResult> {
  const auth = await guard();
  if (!auth) return { ok: false, error: "Not signed in." };

  const res = await persist(formData, auth.user.id);
  if (!res.ok) return res;

  revalidatePath("/studio/blog");
  return { ok: true };
}

/**
 * Save, then publish. Takes the whole form so the editor's current state is
 * what gets validated — not whatever was last written.
 */
export async function publishBlogPost(formData: FormData): Promise<ActionResult> {
  const auth = await guard();
  if (!auth) return { ok: false, error: "Not signed in." };

  // 1 — persist first. This is the fix: the reviewer chosen in the dropdown is
  // written before it is checked.
  const saved = await persist(formData, auth.user.id);
  if (!saved.ok) return saved;

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("studio_blog_posts")
    .select("slug, body_markdown, reviewer_slug")
    .eq("id", saved.id)
    .maybeSingle();

  if (error || !data) {
    console.error("[publishBlogPost:load]", error?.message);
    return { ok: false, error: "Could not load that post." };
  }

  // 2 — a real, qualified reviewer.
  const reviewer = data.reviewer_slug ? AUTHORS[data.reviewer_slug] : undefined;
  if (!reviewer || !reviewer.canReview) {
    return {
      ok: false,
      error: data.reviewer_slug
        ? `"${data.reviewer_slug}" is not a reviewer in the author registry. ` +
          `Add them to lib/seo/authors.ts with canReview: true.`
        : "Choose a reviewer before publishing. Health content without a named " +
          "reviewer is what core updates demote.",
    };
  }

  // 3 — not thin.
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
    .eq("id", saved.id);

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
