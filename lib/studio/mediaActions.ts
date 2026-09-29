"use server";

import { revalidatePath } from "next/cache";

import { getMedia, MEDIA_BUCKET, mediaUsage } from "@/lib/studio/media";
import { requireStudioMember } from "@/lib/studio/member";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export type MediaActionResult = { ok: true } | { ok: false; error: string };

async function guard() {
  const { user, member } = await requireStudioMember();
  return user && member ? user : null;
}

/** Edit what describes an image. The file itself never changes in place. */
export async function updateMediaDetails(input: {
  id: string;
  altText: string;
  caption?: string | null;
  credit?: string | null;
}): Promise<MediaActionResult> {
  if (!(await guard())) return { ok: false, error: "Not signed in." };
  const altText = input.altText.trim();
  if (altText.length < 10) {
    return { ok: false, error: "Alt text needs at least 10 characters." };
  }
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase
    .from("studio_media")
    .update({
      alt_text: altText,
      caption: input.caption?.trim() || null,
      credit: input.credit?.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/studio/media");
  return { ok: true };
}

/**
 * Delete an image — refused while anything uses it (§3.2).
 *
 * The usage check runs here, on the server, at the moment of deletion, not
 * only in the grid that rendered the button, so an image that became a hero
 * after the page loaded is still protected.
 */
export async function deleteMedia(id: string): Promise<MediaActionResult> {
  if (!(await guard())) return { ok: false, error: "Not signed in." };
  const item = await getMedia(id);
  if (!item) return { ok: false, error: "That image no longer exists." };

  const usage = (await mediaUsage([item])).get(id) ?? [];
  if (usage.length > 0) {
    return {
      ok: false,
      error: `In use on ${usage.length} ${usage.length === 1 ? "page" : "pages"}: ${usage
        .map((u) => u.label)
        .join("; ")}. Replace it there first.`,
    };
  }

  const base = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!base || !key) return { ok: false, error: "Storage is not configured." };

  // File first: if Storage refuses, the row stays and the library still
  // shows it, rather than a row-less file sitting in the bucket.
  const res = await fetch(`${base}/storage/v1/object/${MEDIA_BUCKET}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${key}`, apikey: key, "Content-Type": "application/json" },
    body: JSON.stringify({ prefixes: [item.storagePath] }),
  });
  if (!res.ok) {
    return { ok: false, error: `Storage refused the delete (${res.status}). Nothing was removed.` };
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.from("studio_media").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/studio/media");
  return { ok: true };
}
