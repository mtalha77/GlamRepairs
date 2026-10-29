import "server-only";

import { cleanupExpiredPhotos } from "@/lib/leads/cleanupExpiredPhotos";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

/**
 * Remove the test portal's leads (Handover 63 Part 3).
 *
 * Storage first, rows second, and through the one deletion path: the photo
 * sweep deletes the files and only then marks the row, and the database
 * function refuses any lead whose photographs are still in Storage. Only
 * leads the portal wrote (`test_session` set) are touched; leads staff
 * flagged as test by hand are left alone.
 */
export async function purgeTestPortalLeads(options: { session: string | null; idleMinutes?: number }) {
  const photos = await cleanupExpiredPhotos({ testPortal: { session: options.session } });
  const { data, error } = await createAdminSupabaseClient().rpc("purge_test_portal_leads", {
    p_session: options.session,
    p_idle: `${options.idleMinutes ?? 0} minutes`,
  });
  if (error) console.error("[testPortal/purge]", error.message);
  return {
    photoFiles: photos.filesDeleted,
    photoFailures: photos.failures.length + (photos.error ? 1 : 0),
    leadsDeleted: typeof data === "number" ? data : 0,
    error: error?.message ?? photos.error ?? null,
  };
}
