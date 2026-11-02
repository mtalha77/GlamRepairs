import "server-only";

import { revalidatePath } from "next/cache";

import { gscConfigured, submitSitemap } from "@/lib/gsc/client";
import { abs } from "@/lib/seo/site";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

/**
 * When a practitioner goes on or comes off the website (Handover 67 §6.2).
 *
 * "On the website" means present in practitioner_public, the one go-live
 * rule; nothing here restates it. Actions that can change it read the state
 * before and after, and on a change this:
 *
 *   revalidates the sitemap, which is generated from practitioner_public
 *   resubmits it through the Search Console API, when configured
 *   records the event, so "when did this page go live" has an answer
 *
 * Best effort by design: a Search Console failure is logged on the event,
 * never thrown back at whoever made the change.
 */

export async function isOnWebsite(practitionerId: string): Promise<boolean> {
  const { data } = await createAdminSupabaseClient().from("practitioner_public").select("id").eq("id", practitionerId).maybeSingle();
  return Boolean(data);
}

export async function notePublicationChange(practitionerId: string, wasPublic: boolean, actorId: string | null): Promise<void> {
  try {
    const nowPublic = await isOnWebsite(practitionerId);
    if (nowPublic === wasPublic) return;

    revalidatePath("/sitemap.xml");
    revalidatePath("/practitioners");

    let submitted = false;
    let detail: string | null = null;
    if (gscConfigured()) {
      try {
        await submitSitemap(abs("/sitemap.xml"));
        submitted = true;
      } catch (err) {
        detail = (err as Error).message.slice(0, 300);
        console.error("[publication] sitemap", detail);
      }
    } else {
      detail = "Search Console is not configured in this deployment; sitemap not resubmitted.";
    }

    await createAdminSupabaseClient()
      .from("practitioner_publication_events")
      .insert({
        practitioner_id: practitionerId,
        event: nowPublic ? "published" : "unpublished",
        actor_id: actorId,
        sitemap_submitted: submitted,
        detail,
      });
  } catch (err) {
    console.error("[publication]", (err as Error).message);
  }
}

/** Run a change and record whether it moved the practitioner on or off the website. */
export async function withPublication<T>(practitionerId: string, actorId: string | null, change: () => Promise<T>): Promise<T> {
  const before = await isOnWebsite(practitionerId);
  const result = await change();
  await notePublicationChange(practitionerId, before, actorId);
  return result;
}

export type PublicationEvent = { practitioner_id: string; event: string; at: string; sitemap_submitted: boolean; detail: string | null };

/** The latest event per practitioner, for the studio. */
export async function latestPublication(ids: string[]): Promise<Map<string, PublicationEvent>> {
  if (!ids.length) return new Map();
  const { data } = await createAdminSupabaseClient()
    .from("practitioner_publication_events")
    .select("practitioner_id, event, at, sitemap_submitted, detail")
    .in("practitioner_id", ids)
    .order("at", { ascending: false });
  const map = new Map<string, PublicationEvent>();
  for (const e of (data ?? []) as PublicationEvent[]) if (!map.has(e.practitioner_id)) map.set(e.practitioner_id, e);
  return map;
}
