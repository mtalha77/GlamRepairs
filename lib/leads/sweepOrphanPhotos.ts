import "server-only";

import { getPhotosBucket } from "@/lib/leads/uploadAssessmentPhotos";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

/**
 * Delete assessment photographs that no lead points to — Talha, 20 October
 * 2026 ("Delete orphaned photos").
 *
 * Photos are uploaded in the same request that inserts the lead, so a file
 * nobody references is one whose insert failed afterwards (29 of them, from
 * July to September, before that path was fixed). They are private, but a
 * client's face we have no record of is still a client's face we are
 * keeping. A day's grace means a request still in flight is never touched.
 */

const GRACE_MS = 24 * 60 * 60 * 1000;

export type OrphanSweepResult = { checked: number; deleted: number; error?: string };

export async function sweepOrphanPhotos(): Promise<OrphanSweepResult> {
  const admin = createAdminSupabaseClient();
  const bucket = getPhotosBucket();

  // Every reference, page by page: the API caps a read at 1,000 rows, and a
  // missed reference here would delete a live client's photograph.
  const referenced = new Set<string>();
  for (let from = 0; ; from += 1000) {
    const { data: page, error: leadsError } = await admin
      .from("leads")
      .select("photo_paths")
      .not("photo_paths", "eq", "{}")
      .order("id")
      .range(from, from + 999);
    if (leadsError) return { checked: 0, deleted: 0, error: leadsError.message };
    for (const l of page ?? []) for (const p of l.photo_paths ?? []) referenced.add(p);
    if (!page || page.length < 1000) break;
  }

  const { data: folders, error: listError } = await admin.storage.from(bucket).list("leads", { limit: 1000 });
  if (listError) return { checked: 0, deleted: 0, error: listError.message };

  const cutoff = Date.now() - GRACE_MS;
  const orphans: string[] = [];
  let checked = 0;
  for (const folder of folders ?? []) {
    // Folders come back without an id; files directly under leads/ would have one.
    if (folder.id) continue;
    const { data: files } = await admin.storage.from(bucket).list(`leads/${folder.name}`, { limit: 100 });
    for (const file of files ?? []) {
      if (!file.id) continue;
      checked += 1;
      const path = `leads/${folder.name}/${file.name}`;
      const created = new Date(file.created_at ?? Date.now()).getTime();
      if (!referenced.has(path) && created < cutoff) orphans.push(path);
    }
  }

  if (!orphans.length) return { checked, deleted: 0 };
  const { data: removed, error } = await admin.storage.from(bucket).remove(orphans);
  if (error) return { checked, deleted: 0, error: error.message };
  if (removed?.length) console.info(`[sweepOrphanPhotos] deleted ${removed.length} unreferenced photographs`);
  return { checked, deleted: removed?.length ?? 0 };
}
