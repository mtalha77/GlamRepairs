"use server";

import { revalidatePath, updateTag } from "next/cache";
import { after } from "next/server";
import { explainPublishRefusal, MIN_PUBLISH_CHARS, placeholderIn } from "@/lib/blog/publishRules";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { requireStudioMember } from "@/lib/studio/member";
import { readingMinutes } from "@/lib/blog/markdown";
import { AUTHORS } from "@/lib/seo/authors";
import { submitToIndexNow } from "@/lib/seo/indexnow";
import { POST_HERO_TAG } from "@/lib/blog/postHero";

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

export type PublishBundleMember = {
  slug: string;
  title: string;
  isRoot: boolean;
};

export type ActionResult =
  | { ok: true }
  | {
      ok: false;
      error: string;
      /**
       * Set when publishing was refused because the post links to drafts.
       *
       * The editor uses it to offer publishing the whole set rather than
       * leaving the author at a dead end — the refusal names one slug, but
       * the real cost is usually more than one post, and they should see
       * that before they agree to it.
       */
      bundle?: PublishBundleMember[];
    };

/**
 * The link-integrity refusal, as raised by private.blog_link_integrity().
 *
 * Matched on the errcode the trigger sets rather than on the message, so
 * rewording the message cannot silently turn the bundle offer off. 23514 is
 * check_violation.
 */
function isLinkIntegrityError(err: { code?: string; message?: string }): boolean {
  return err.code === "23514" && /unpublished slug/i.test(err.message ?? "");
}

/** The post plus every unpublished post it transitively links to. */
async function publishBundleFor(slug: string): Promise<PublishBundleMember[]> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.rpc("blog_publish_set", {
    p_slug: slug,
  });
  if (error || !data) {
    console.error("[publishBundleFor]", error?.message);
    return [];
  }
  return (data as { slug: string; title: string; is_root: boolean }[]).map(
    (r) => ({ slug: r.slug, title: r.title, isRoot: r.is_root }),
  );
}


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

/**
 * HANDOVER-22 §8 — the cap is enforced here, not only in the editor.
 *
 * The editor disables further checkboxes at three, but a form post is a form
 * post: the limit has to hold on the server or it is decoration. Self-links
 * are dropped for the same reason — the editor cannot list the current post,
 * but a hand-made request could.
 */
const MAX_RELATED_SLUGS = 3;

function relatedSlugsFrom(formData: FormData, ownSlug: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of formData.getAll("related_slugs")) {
    const slug = String(raw).trim();
    if (!slug || slug === ownSlug || seen.has(slug)) continue;
    seen.add(slug);
    out.push(slug);
    if (out.length === MAX_RELATED_SLUGS) break;
  }
  return out;
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
      related_slugs: relatedSlugsFrom(formData, slug),
      reviewer_slug: String(formData.get("reviewer_slug") ?? "").trim() || null,
      author_slug: String(formData.get("author_slug") ?? "ayma-arif").trim(),
      reading_minutes: readingMinutes(body),
      // HANDOVER-45 §3.3 — the rest of the SEO panel.
      secondary_keywords: secondaryKeywordsFrom(formData),
      faq: faqFrom(formData),
      updated_by: userId,
    },
  };
}

/** Comma- or line-separated, trimmed, de-duplicated, at most 12. */
function secondaryKeywordsFrom(formData: FormData): string[] {
  const raw = String(formData.get("secondary_keywords") ?? "");
  const seen = new Set<string>();
  return raw
    .split(/[\n,]+/)
    .map((k) => k.trim().toLowerCase())
    .filter((k) => k && !seen.has(k) && (seen.add(k), true))
    .slice(0, 12);
}

/**
 * The FAQ travels as one JSON field built by the editor. Anything that does
 * not parse, or pairs with an empty side, is dropped rather than saved: the
 * page renders these and marks them up as FAQPage, and an empty answer in
 * structured data is worse than no entry.
 */
function faqFrom(formData: FormData): { q: string; a: string }[] {
  try {
    const parsed = JSON.parse(String(formData.get("faq_json") ?? "[]"));
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((f) => ({ q: String(f?.q ?? "").trim(), a: String(f?.a ?? "").trim() }))
      .filter((f) => f.q && f.a)
      .slice(0, 12);
  } catch {
    return [];
  }
}

/**
 * Link (or unlink) the post's hero from the media library — HANDOVER-45.
 *
 * `hero_media_id` is sent by the editor on every save: an id to set, or an
 * empty string to remove. The `studio_post_media` link is what the public
 * page renders from (it carries width, height and alt text); the
 * `hero_image_url` / `hero_image_alt` columns are kept in step so anything
 * still reading them sees the same image.
 */
async function syncHero(
  formData: FormData,
  slug: string,
  previousSlug: string | null,
): Promise<string | null> {
  if (!formData.has("hero_media_id")) return null;
  const mediaId = String(formData.get("hero_media_id") ?? "").trim();
  const supabase = await createServerSupabaseClient();

  const clear = [slug, ...(previousSlug && previousSlug !== slug ? [previousSlug] : [])];
  const { error: delErr } = await supabase
    .from("studio_post_media")
    .delete()
    .in("post_slug", clear)
    .eq("role", "hero");
  if (delErr) return delErr.message;

  if (!mediaId) {
    await supabase.from("studio_blog_posts").update({ hero_image_url: null, hero_image_alt: null }).eq("slug", slug);
    return null;
  }

  const { data: media, error: mErr } = await supabase
    .from("studio_media")
    .select("id, public_url, alt_text")
    .eq("id", mediaId)
    .maybeSingle();
  if (mErr || !media) return mErr?.message ?? "That image is no longer in the library.";

  const { error: insErr } = await supabase
    .from("studio_post_media")
    .insert({ post_slug: slug, media_id: media.id, role: "hero", sort_order: 0 });
  if (insErr) return insErr.message;

  await supabase
    .from("studio_blog_posts")
    .update({ hero_image_url: media.public_url, hero_image_alt: media.alt_text })
    .eq("slug", slug);
  return null;
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
    // A slug change would be refused while media links point at the old
    // slug, so they are cleared first and the hero is re-linked below.
    const { data: before } = await supabase
      .from("studio_blog_posts")
      .select("slug")
      .eq("id", id)
      .maybeSingle();
    const previousSlug = before?.slug ?? null;
    if (previousSlug && previousSlug !== slug) {
      await supabase.from("studio_post_media").delete().eq("post_slug", previousSlug);
    }

    const { error } = await supabase
      .from("studio_blog_posts")
      .update(row)
      .eq("id", id);
    if (error) {
      console.error("[persist:update]", error.message);
      return { ok: false, error: error.message };
    }
    const heroError = await syncHero(formData, slug, previousSlug);
    if (heroError) return { ok: false, error: `Saved, but the hero image was not: ${heroError}` };
    updateTag(POST_HERO_TAG);
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
  const heroError = await syncHero(formData, slug, null);
  if (heroError) return { ok: false, error: `Saved, but the hero image was not: ${heroError}` };
  updateTag(POST_HERO_TAG);
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

  // 3 — not an outline. HOTFIX-47: an unfinished post went live with its
  // placeholder text and `index, follow`.
  const placeholder = placeholderIn(data.body_markdown ?? "");
  if (placeholder) {
    return {
      ok: false,
      error: `Cannot publish: the body still contains placeholder text ("${placeholder}").`,
    };
  }

  // 4 — not thin.
  if ((data.body_markdown ?? "").trim().length < MIN_PUBLISH_CHARS) {
    return {
      ok: false,
      error: `This post is too short to publish (needs ${MIN_PUBLISH_CHARS.toLocaleString("en-GB")} characters).`,
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
    /*
     * A link-integrity refusal is not a dead end any more.
     *
     * The message names one unpublished slug, but the set that actually
     * has to go live is usually larger and is always transitive: this post
     * links to a draft, which links to another draft. Hand the editor the
     * whole set so it can offer to publish them together and show what
     * that really costs, rather than the author discovering it one refusal
     * at a time.
     */
    if (isLinkIntegrityError(upErr)) {
      return {
        ok: false,
        error: upErr.message,
        bundle: await publishBundleFor(data.slug),
      };
    }
    console.error("[publishBlogPost:update]", upErr.message);
    return { ok: false, error: explainPublishRefusal(upErr.message) ?? upErr.message };
  }

  revalidatePath("/blog");
  revalidatePath(`/blog/${data.slug}`);
  revalidatePath("/studio/blog");
  revalidatePath("/sitemap.xml");
  // HOTFIX-43 §3.2 — tell Bing and the other IndexNow engines now rather
  // than waiting for a crawl. After the response, so it never slows the
  // studio and a failed ping never fails a publish.
  after(() => submitToIndexNow([`/blog/${data.slug}`, "/blog"]));
  return { ok: true };
}

/**
 * Publish this post together with every draft it links to.
 *
 * Only reachable after `publishBlogPost` has already refused and returned
 * a bundle, so the author has seen the list and agreed to it. Everything
 * the single-post path checks still applies: this saves and validates
 * through `publishBlogPost` first, and only widens the set once that has
 * passed on the root post.
 *
 * The publish itself goes through `publish_blog_posts`, which puts the
 * whole set in one transaction so the deferred link check validates them
 * together. Publishing them one at a time in a loop would fail on the
 * first, which is the situation this exists to escape.
 */
export async function publishBlogPostBundle(
  formData: FormData,
): Promise<ActionResult> {
  const auth = await guard();
  if (!auth) return { ok: false, error: "Not signed in." };

  // Re-run the single-post path. It saves, checks the reviewer and the
  // length, and either succeeds outright (nothing else was needed) or comes
  // back with the set to publish.
  const single = await publishBlogPost(formData);
  if (single.ok) return single;
  if (!single.bundle?.length) return single;

  const slugs = single.bundle.map((m) => m.slug);
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.rpc("publish_blog_posts", {
    p_slugs: slugs,
  });

  if (error) {
    console.error("[publishBlogPostBundle]", error.message);
    return { ok: false, error: explainPublishRefusal(error.message) ?? error.message };
  }

  revalidatePath("/blog");
  for (const slug of slugs) revalidatePath(`/blog/${slug}`);
  revalidatePath("/studio/blog");
  revalidatePath("/sitemap.xml");
  after(() => submitToIndexNow([...slugs.map((slug) => `/blog/${slug}`), "/blog"]));
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
  // An unpublished URL now 404s; IndexNow is also how engines learn a page
  // is gone, so it drops out of Bing instead of lingering.
  const gone = data?.slug;
  if (gone) after(() => submitToIndexNow([`/blog/${gone}`, "/blog"]));
  return { ok: true };
}
