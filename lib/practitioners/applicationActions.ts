"use server";

import { revalidatePath } from "next/cache";

import { sendPractitionerEmail } from "@/lib/email/sendPractitionerEmail";
import { getPublicAppUrl } from "@/lib/leads/photoShortLink";
import { OPEN_STATUSES } from "@/lib/practitioners/applications";
import { requireStudioMember } from "@/lib/studio/member";
import type { PractitionerApplicationStatus } from "@/lib/supabase/database.types";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

/**
 * Practitioner applications, the write side — HANDOVER-51 §4.2, §4.3.
 *
 * Every action checks for a super admin itself. The page hides these
 * controls from everyone else, but hiding a button is not a control: the
 * calls below run with the service role, which bypasses RLS.
 *
 * Order matters on approval: the profile is created first and the sign-in
 * account last, so a failure part-way never leaves a login with nothing
 * behind it. A failed account step is retried from the application page.
 */

export type ApplicationActionResult = { ok: true; message: string } | { ok: false; error: string };

const PATH = "/studio/applications";

async function guard() {
  const { user, member } = await requireStudioMember();
  if (!user || !member) return { error: "Not signed in." } as const;
  if (!member.isSuperAdmin) return { error: "Only a super admin can manage applications." } as const;
  return { userId: user.id } as const;
}

function plainError(message: string): string {
  if (message.includes("one_open_per_email")) return "This person already has an open application.";
  if (message.includes("rejection_needs_note") || message.includes("needs a reason")) {
    return "A rejection needs a reason of at least six characters; it is emailed to the applicant.";
  }
  return message;
}

// ── Invites ─────────────────────────────────────────────────────────────

export async function issuePractitionerInvite(input: {
  email: string;
  name: string;
  note: string;
}): Promise<ApplicationActionResult> {
  const g = await guard();
  if ("error" in g) return { ok: false, error: g.error as string };
  const email = input.email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, error: "Enter a valid email address." };

  const admin = createAdminSupabaseClient();
  const { data, error } = await admin.rpc("issue_practitioner_invite", {
    p_email: email,
    p_kind: "practitioner",
    p_by: g.userId,
    p_note: input.note.trim() || null,
    p_days: 14,
  });
  const issued = data?.[0];
  if (error || !issued) return { ok: false, error: plainError(error?.message ?? "The invite could not be created.") };

  const { data: row } = await admin.from("practitioner_invites").select("expires_at").eq("id", issued.invite_id).maybeSingle();
  // The plaintext token exists only here, on its way into the email.
  const joinUrl = `${getPublicAppUrl()}/join?token=${encodeURIComponent(issued.token)}`;
  const sent = await sendPractitionerEmail({
    kind: "invite",
    toEmail: email,
    name: input.name.trim() || null,
    joinUrl,
    expiresAt: row?.expires_at ?? new Date(Date.now() + 14 * 86_400_000).toISOString(),
    note: input.note.trim() || null,
  });
  revalidatePath(PATH);
  return sent.ok
    ? { ok: true, message: `Invite emailed to ${email}. It works for 14 days.` }
    : {
        ok: false,
        error: `The invite was created but the email failed (${sent.message}). Send a new invite once email works; the old link has not been seen by anyone.`,
      };
}

export async function revokePractitionerInvite(id: string): Promise<ApplicationActionResult> {
  const g = await guard();
  if ("error" in g) return { ok: false, error: g.error as string };
  const { error } = await createAdminSupabaseClient()
    .from("practitioner_invites")
    .update({ revoked_at: new Date().toISOString(), revoked_by: g.userId })
    .eq("id", id)
    .is("accepted_at", null)
    .is("revoked_at", null);
  if (error) return { ok: false, error: error.message };
  revalidatePath(PATH);
  return { ok: true, message: "Invite revoked. The link no longer works." };
}

// ── Review ──────────────────────────────────────────────────────────────

export async function setApplicationStage(input: {
  id: string;
  status: PractitionerApplicationStatus;
}): Promise<ApplicationActionResult> {
  const g = await guard();
  if ("error" in g) return { ok: false, error: g.error as string };
  if (!OPEN_STATUSES.includes(input.status)) return { ok: false, error: "Use Approve or Reject for a decision." };
  const { data, error } = await createAdminSupabaseClient()
    .from("practitioner_applications")
    .update({ status: input.status, updated_at: new Date().toISOString() })
    .eq("id", input.id)
    .in("status", OPEN_STATUSES)
    .is("deleted_at", null)
    .select("id");
  if (error) return { ok: false, error: plainError(error.message) };
  if (!data?.length) return { ok: false, error: "This application is already decided." };
  revalidatePath(PATH);
  revalidatePath(`${PATH}/${input.id}`);
  return { ok: true, message: "Stage saved." };
}

export async function verifyApplicationDocument(input: {
  id: string;
  applicationId: string;
  verified: boolean;
}): Promise<ApplicationActionResult> {
  const g = await guard();
  if ("error" in g) return { ok: false, error: g.error as string };
  const { error } = await createAdminSupabaseClient()
    .from("practitioner_documents")
    .update({
      verified: input.verified,
      verified_by: input.verified ? g.userId : null,
      verified_at: input.verified ? new Date().toISOString() : null,
    })
    .eq("id", input.id)
    .is("deleted_at", null);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`${PATH}/${input.applicationId}`);
  return { ok: true, message: input.verified ? "Marked as verified." : "Verification removed." };
}

export async function rejectPractitionerApplication(input: {
  id: string;
  note: string;
}): Promise<ApplicationActionResult> {
  const g = await guard();
  if ("error" in g) return { ok: false, error: g.error as string };
  const note = input.note.trim();
  if (note.length <= 5) return { ok: false, error: plainError("needs a reason") };

  const admin = createAdminSupabaseClient();
  const { error } = await admin.rpc("reject_practitioner_application", {
    p_app: input.id,
    p_by: g.userId,
    p_note: note,
    p_keep_days: 30,
  });
  if (error) return { ok: false, error: plainError(error.message) };

  const { data: app } = await admin.from("practitioner_applications").select("full_name, email").eq("id", input.id).maybeSingle();
  const sent = app
    ? await sendPractitionerEmail({ kind: "rejected", toEmail: app.email, name: app.full_name, note })
    : { ok: false as const, message: "Application not found." };
  revalidatePath(PATH);
  revalidatePath(`${PATH}/${input.id}`);
  return sent.ok
    ? { ok: true, message: "Rejected and emailed. Their documents will be deleted in 30 days." }
    : { ok: true, message: `Rejected, but the email failed (${sent.message}). Their documents will be deleted in 30 days.` };
}

export async function approvePractitionerApplication(input: {
  id: string;
  note: string;
}): Promise<ApplicationActionResult> {
  const g = await guard();
  if ("error" in g) return { ok: false, error: g.error as string };

  const admin = createAdminSupabaseClient();
  const { data: current } = await admin.from("practitioner_applications").select("status").eq("id", input.id).maybeSingle();
  if (!current) return { ok: false, error: "Application not found." };
  if (!OPEN_STATUSES.includes(current.status)) return { ok: false, error: `This application is ${current.status}.` };

  const { data: profileId, error } = await admin.rpc("approve_practitioner_application", {
    p_app: input.id,
    p_by: g.userId,
    p_note: input.note.trim() || null,
  });
  if (error || !profileId) return { ok: false, error: plainError(error?.message ?? "Approval failed.") };

  // The profile exists now; only then create the sign-in account.
  const login = await createPractitionerLogin(profileId);
  revalidatePath(PATH);
  revalidatePath(`${PATH}/${input.id}`);
  return login.ok
    ? { ok: true, message: `Approved. ${login.message}` }
    : { ok: true, message: `Approved, and the profile is created, but the sign-in step failed: ${login.error} Use "Send sign-in link" to retry.` };
}

export async function resendPractitionerSignIn(input: { applicationId: string }): Promise<ApplicationActionResult> {
  const g = await guard();
  if ("error" in g) return { ok: false, error: g.error as string };
  const { data: app } = await createAdminSupabaseClient()
    .from("practitioner_applications")
    .select("profile_id")
    .eq("id", input.applicationId)
    .maybeSingle();
  if (!app?.profile_id) return { ok: false, error: "This application has no profile yet." };
  const result = await createPractitionerLogin(app.profile_id);
  revalidatePath(`${PATH}/${input.applicationId}`);
  return result;
}

/**
 * The account comes last. Creates (or finds) the auth user, links it to
 * the profile, gives it a staff seat that can see only the clients
 * assigned to it and cannot send reports (probation), then emails a
 * set-password link through the studio's existing invite page.
 */
async function createPractitionerLogin(profileId: string): Promise<ApplicationActionResult> {
  const admin = createAdminSupabaseClient();
  const { data: profile } = await admin
    .from("practitioner_profiles")
    .select("id, full_name, user_id")
    .eq("id", profileId)
    .maybeSingle();
  if (!profile) return { ok: false, error: "Profile not found." };
  const { data: app } = await admin
    .from("practitioner_applications")
    .select("email")
    .eq("profile_id", profileId)
    .maybeSingle();
  if (!app) return { ok: false, error: "No application email for this profile." };

  let generated = await admin.auth.admin.generateLink({ type: "invite", email: app.email });
  if (generated.error || !generated.data.properties?.hashed_token) {
    // Already has an account (for example an existing team member).
    generated = await admin.auth.admin.generateLink({ type: "magiclink", email: app.email });
  }
  const tokenHash = generated.data.properties?.hashed_token;
  const userId = generated.data.user?.id;
  if (generated.error || !tokenHash || !userId) {
    return { ok: false, error: generated.error?.message ?? "Could not create the sign-in link." };
  }
  if (profile.user_id && profile.user_id !== userId) {
    return { ok: false, error: "This profile is already linked to a different account." };
  }

  const { data: existing } = await admin.from("studio_members").select("user_id").eq("user_id", userId).maybeSingle();
  if (!existing) {
    const { error } = await admin.from("studio_members").insert({
      user_id: userId,
      role: "staff",
      display_name: profile.full_name,
      member_kind: "practitioner",
      can_verify_payment: false,
      can_send_report: false,
      is_super_admin: false,
    });
    if (error) return { ok: false, error: error.message };
  }
  if (!profile.user_id) {
    const { error } = await admin.from("practitioner_profiles").update({ user_id: userId }).eq("id", profileId).is("user_id", null);
    if (error) return { ok: false, error: error.message };
  }

  const type = generated.data.properties?.verification_type === "magiclink" ? "magiclink" : "invite";
  const signInUrl = `${getPublicAppUrl()}/studio/invite?token_hash=${encodeURIComponent(tokenHash)}&type=${type}`;
  const sent = await sendPractitionerEmail({ kind: "sign_in", toEmail: app.email, name: profile.full_name, signInUrl });
  return sent.ok
    ? { ok: true, message: `A set-password link was emailed to ${app.email}.` }
    : { ok: false, error: `The account is ready but the email failed (${sent.message}).` };
}
