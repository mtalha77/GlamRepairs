"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireStudioMember } from "@/lib/studio/member";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { logSuppressedEmail } from "@/lib/testPortal/email";
import { purgeTestPortalLeads } from "@/lib/testPortal/purge";
import {
  clearTestCookie,
  disableTestPortal,
  getTestSession,
  rotateTestPassphrase,
  scopedSessionId,
  startTestSession,
} from "@/lib/testPortal/session";

/** /test sign-in. A wrong passphrase says so and nothing else. */
export async function enterTestPortal(_prev: { error: string | null }, formData: FormData) {
  const ok = await startTestSession(String(formData.get("passphrase") ?? ""));
  if (!ok) return { error: "That passphrase is not right. Ask for the current one; it may have been changed." };
  redirect("/test?started=1");
}

/** Sign out: this session's photographs, then its rows, then the cookie. */
export async function leaveTestPortal() {
  const test = await getTestSession();
  if (test) {
    const result = await purgeTestPortalLeads({ session: test.sid });
    if (result.error) console.error("[testPortal] sign-out purge", result.error);
  }
  await clearTestCookie();
  redirect("/test?ended=1");
}

/**
 * Step 5: the completion screen's "mark paid". Moves the test lead to
 * verified without money moving and without a row in `payments`; the
 * client-account trigger skips test leads, and the studio notification
 * trigger returns early for them. The confirmation email is logged as
 * suppressed so the demo can show it.
 */
export async function markTestLeadPaid(clientSessionId: string): Promise<{ ok: boolean; message: string }> {
  const test = await getTestSession();
  if (!test) return { ok: false, message: "This is only available in a test session." };
  const admin = createAdminSupabaseClient();
  const { data: lead, error } = await admin
    .from("leads")
    .update({ payment_status: "verified", updated_at: new Date().toISOString() })
    .eq("session_id", scopedSessionId(clientSessionId, test))
    .eq("test_session", test.sid)
    .eq("is_test", true)
    .select("id, email, plan_name")
    .maybeSingle();
  if (error || !lead) {
    if (error) console.error("[testPortal] mark paid", error.message);
    return { ok: false, message: "No test assessment was found for this session. Submit the questionnaire first." };
  }
  await logSuppressedEmail({
    leadId: lead.id,
    toEmail: lead.email ?? "",
    subject: "Payment received | GlamRepairs",
    kind: "payment_confirmed",
    templateKey: "payment_confirmed",
  });
  return { ok: true, message: "Marked paid. No money moved, and no payment was recorded." };
}

/* ── Studio → Settings: the passphrase ─────────────────────────────────── */

type RotateResult = { ok: true; passphrase: string } | { ok: false; error: string };

async function superAdmin() {
  const { user, member } = await requireStudioMember();
  return user && member?.isSuperAdmin ? user.id : null;
}

export async function rotateTestPassphraseAction(): Promise<RotateResult> {
  const userId = await superAdmin();
  if (!userId) return { ok: false, error: "Only a super admin can change the test portal passphrase." };
  try {
    const passphrase = await rotateTestPassphrase(userId);
    revalidatePath("/studio/settings");
    return { ok: true, passphrase };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

export async function disableTestPortalAction(): Promise<{ ok: boolean; error?: string }> {
  const userId = await superAdmin();
  if (!userId) return { ok: false, error: "Only a super admin can turn the test portal off." };
  await disableTestPortal(userId);
  revalidatePath("/studio/settings");
  return { ok: true };
}
