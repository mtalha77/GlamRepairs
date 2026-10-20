import type { User } from "@supabase/supabase-js";

import { currentStudioSession, ensureVerified } from "@/lib/studio/twoFactor";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { StudioRole } from "@/lib/supabase/database.types";

export type StudioMember = {
  userId: string;
  role: StudioRole;
  displayName: string;
  canVerifyPayment: boolean;
  canSendReport: boolean;
  /**
   * A distinct, explicitly-granted escalation — never inferred from `role`.
   * Delete controls, payment verification, and the `/p/` photo-redirect
   * route all gate on this, in application code, because the DB client here
   * uses the service-role key for some calls (bootstrap) and RLS alone
   * cannot be trusted to enforce it everywhere.
   */
  isSuperAdmin: boolean;
  /** HANDOVER-51: "practitioner" for an approved practitioner's staff seat. */
  memberKind: string | null;
  createdAt: string;
};

/**
 * Sees every client and assigns them — 20 October 2026. The owner, and any
 * super admin (Ayma, the MD). Practitioners never choose their own clients.
 * Matches private.can_manage_clients() in the leads policies.
 */
export function canManageClients(member: Pick<StudioMember, "role" | "isSuperAdmin"> | null | undefined): boolean {
  return Boolean(member && (member.role === "owner" || member.isSuperAdmin));
}

function getOwnerEmail() {
  return process.env.STUDIO_OWNER_EMAIL?.trim().toLowerCase() ?? "";
}

export async function getStudioUser() {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  return data.user;
}

export async function bootstrapOwnerIfNeeded(user: User) {
  const ownerEmail = getOwnerEmail();
  const userEmail = user.email?.trim().toLowerCase();
  if (!ownerEmail || !userEmail || userEmail !== ownerEmail) {
    return;
  }

  const admin = createAdminSupabaseClient();
  const { count, error: countError } = await admin
    .from("studio_members")
    .select("user_id", { count: "exact", head: true })
    .eq("role", "owner");

  if (countError) {
    console.error("[bootstrapOwnerIfNeeded] count failed:", countError.message);
    return;
  }

  if ((count ?? 0) > 0) return;

  const displayName =
    typeof user.user_metadata?.display_name === "string"
      ? user.user_metadata.display_name.trim()
      : userEmail.split("@")[0] || "Owner";

  const { error } = await admin.from("studio_members").upsert({
    user_id: user.id,
    role: "owner",
    display_name: displayName,
    can_verify_payment: true,
    can_send_report: true,
    is_super_admin: true,
  });

  if (error) {
    console.error("[bootstrapOwnerIfNeeded] insert failed:", error.message);
  }
}

/**
 * The member row for a signed-in user. Read with the service role, filtered
 * to the id from the verified session: the members policy only lets staff
 * read the table, so a practitioner's seat could not see its own row, and
 * the RLS membership checks now also require a 2FA-verified session.
 */
export async function getStudioMember(userId: string) {
  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase
    .from("studio_members")
    .select(
      "user_id, role, display_name, can_verify_payment, can_send_report, is_super_admin, member_kind, created_at",
    )
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.error("[getStudioMember]", error.message);
    return null;
  }

  if (!data) return null;

  return {
    userId: data.user_id,
    role: data.role,
    displayName: data.display_name,
    canVerifyPayment: data.role === "owner" || Boolean(data.can_verify_payment),
    canSendReport: data.role === "owner" || Boolean(data.can_send_report),
    // Literal, no `role === "owner"` fallback — see the type's doc comment.
    isSuperAdmin: Boolean(data.is_super_admin),
    memberKind: data.member_kind ?? null,
    createdAt: data.created_at,
  } satisfies StudioMember;
}

/**
 * The signed-in studio member, or null. Since 20 October 2026 a member is
 * only returned once this session has passed email 2FA (or the device was
 * verified within 30 days); until then `needsVerification` is set and every
 * page, action and route that checks for a member refuses.
 */
export async function requireStudioMember(): Promise<{
  user: User | null;
  member: StudioMember | null;
  needsVerification?: boolean;
}> {
  const user = await getStudioUser();
  if (!user) return { user: null, member: null };

  const session = await currentStudioSession();
  if (!session || session.userId !== user.id || !(await ensureVerified(session))) {
    return { user, member: null, needsVerification: true };
  }

  await bootstrapOwnerIfNeeded(user);
  const member = await getStudioMember(user.id);
  return { user, member };
}

export async function listStudioMembers() {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("studio_members")
    .select(
      "user_id, role, display_name, can_verify_payment, can_send_report, is_super_admin, member_kind, created_at",
    )
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[listStudioMembers]", error.message);
    return [];
  }

  return (data ?? []).map(
    (row) =>
      ({
        userId: row.user_id,
        role: row.role,
        displayName: row.display_name,
        canVerifyPayment: row.role === "owner" || Boolean(row.can_verify_payment),
        canSendReport: row.role === "owner" || Boolean(row.can_send_report),
        isSuperAdmin: Boolean(row.is_super_admin),
        memberKind: row.member_kind ?? null,
        createdAt: row.created_at,
      }) satisfies StudioMember,
  );
}
