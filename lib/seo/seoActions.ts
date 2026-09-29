"use server";

import { revalidatePath, updateTag } from "next/cache";

import {
  BLOCKED_ORGANIZATION_TYPES,
  checkCanonical,
  checkDescription,
  checkSameAs,
  checkTitle,
} from "@/lib/seo/pageSeoRules";
import { SEO_CACHE_TAG } from "@/lib/seo/pageSeo";
import { requireStudioMember } from "@/lib/studio/member";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export type SeoActionResult = { ok: true } | { ok: false; error: string };

/**
 * Save one page's SEO row and make it live — HANDOVER-45 §3.4/§3.5.
 *
 * `updateTag` expires the cached `page_seo` read immediately, so the next
 * visit renders the new title; `revalidatePath` refreshes the page's own
 * render. No deploy.
 */
export async function savePageSeo(input: {
  path: string;
  title: string;
  metaDescription: string;
  h1: string;
  ogImageMediaId: string | null;
  noindex: boolean;
  canonicalOverride: string;
}): Promise<SeoActionResult> {
  const { user, member } = await requireStudioMember();
  if (!user || !member) return { ok: false, error: "Not signed in." };

  const title = input.title.trim();
  const desc = input.metaDescription.trim();
  for (const c of [checkTitle(title), checkDescription(desc), checkCanonical(input.canonicalOverride)]) {
    if (!c.ok) return { ok: false, error: c.message ?? "Invalid value." };
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase
    .from("page_seo")
    .update({
      title,
      meta_description: desc,
      h1: input.h1.trim() || null,
      og_image_media_id: input.ogImageMediaId || null,
      noindex: input.noindex,
      canonical_override: input.canonicalOverride.trim() || null,
      updated_by: user.id,
      updated_at: new Date().toISOString(),
    })
    .eq("path", input.path);
  if (error) return { ok: false, error: error.message };

  updateTag(SEO_CACHE_TAG);
  revalidatePath(input.path);
  revalidatePath("/studio/seo");
  return { ok: true };
}

/** Save the site-wide defaults. Every page reads these, so purge all of it. */
export async function saveSeoSettings(input: {
  brandName: string;
  titleSuffix: string;
  defaultOgMediaId: string | null;
  twitterHandle: string;
  organizationType: string;
  sameAs: string[];
}): Promise<SeoActionResult> {
  const { user, member } = await requireStudioMember();
  if (!user || !member) return { ok: false, error: "Not signed in." };

  const brandName = input.brandName.trim();
  if (brandName.length < 2) return { ok: false, error: "Brand name is required." };
  if (BLOCKED_ORGANIZATION_TYPES.includes(input.organizationType)) {
    return { ok: false, error: "Medical organisation types are not allowed." };
  }
  const sameAs = input.sameAs.map((u) => u.trim()).filter(Boolean);
  const same = checkSameAs(sameAs);
  if (!same.ok) return { ok: false, error: same.message ?? "Invalid link." };
  const handle = input.twitterHandle.trim();
  if (handle && !/^@[A-Za-z0-9_]{1,15}$/.test(handle)) {
    return { ok: false, error: "Twitter handle looks like @glamrepairs." };
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase
    .from("seo_settings")
    .update({
      brand_name: brandName,
      // Keep the leading space: the suffix is appended straight to titles.
      title_suffix: input.titleSuffix.replace(/\s+$/, ""),
      default_og_media_id: input.defaultOgMediaId || null,
      twitter_handle: handle || null,
      organization_type: input.organizationType,
      same_as: sameAs,
      updated_at: new Date().toISOString(),
    })
    .eq("id", 1);
  if (error) return { ok: false, error: error.message };

  updateTag(SEO_CACHE_TAG);
  revalidatePath("/", "layout");
  return { ok: true };
}
