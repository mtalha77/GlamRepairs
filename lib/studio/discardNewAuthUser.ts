import "server-only";

import { createAdminSupabaseClient } from "@/lib/supabase/admin";

/**
 * Undo an auth user minted moments ago when the rest of an invite failed
 * (Handover: the practitioner invite bug, 29 October 2026).
 *
 * `generateLink({ type: "invite" })` creates the auth user before anything
 * else is written, so a failed insert straight after it used to leave an
 * auth user that nothing pointed to. Callers pass `created: true` only when
 * the invite link (not the magic-link fallback) was issued, which means the
 * user did not exist before this request. An existing user is never deleted.
 *
 * Deleting an auth user cascades to studio_members and practitioner_profiles,
 * so this refuses if a profile is already attached to the user.
 */
export async function discardNewAuthUser(userId: string, created: boolean, context: string): Promise<void> {
  if (!created) return;
  const admin = createAdminSupabaseClient();
  const { data: linked } = await admin.from("practitioner_profiles").select("id").eq("user_id", userId).limit(1);
  if (linked?.length) {
    console.error(`[${context}] not removing auth user ${userId}: a practitioner profile is attached`);
    return;
  }
  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) console.error(`[${context}] could not remove the new auth user ${userId}`, error.message);
}
