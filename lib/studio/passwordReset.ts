"use server";

import { sendStudioPasswordResetEmail } from "@/lib/email/sendStudioPasswordResetEmail";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { issueWelcomeLink, lastLinkIssuedAt } from "@/lib/studio/welcomeLinks";

/**
 * "Forgot your password?" on the studio sign-in page.
 *
 * The answer is the same whatever the email: the page never reveals whether
 * an address has a studio account. A link is sent only to a studio member,
 * at most once every two minutes per person, through the same welcome-link
 * mechanism as invites (opening it spends nothing; pressing the button signs
 * them in and takes them to choose a password), with a one-hour life.
 */

export type ResetState = { sent: boolean; error?: string };

const SAME_ANSWER: ResetState = { sent: true };
const THROTTLE_MS = 2 * 60_000;
const RESET_TTL_MINUTES = 60;

export async function requestStudioPasswordReset(_prev: ResetState, formData: FormData): Promise<ResetState> {
  const raw = formData.get("email");
  const email = typeof raw === "string" ? raw.trim().toLowerCase() : "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 200) {
    return { sent: false, error: "Enter the email address you sign in with." };
  }

  try {
    const admin = createAdminSupabaseClient();
    // A recovery link is generated only to learn which account the address
    // belongs to; it is never sent. It does not create a user for an
    // unknown address, it fails, and the answer below is the same.
    const { data: found, error } = await admin.auth.admin.generateLink({ type: "recovery", email });
    const userId = found?.user?.id;
    if (error || !userId) return SAME_ANSWER;

    const { data: member } = await admin.from("studio_members").select("display_name").eq("user_id", userId).maybeSingle();
    if (!member) return SAME_ANSWER;

    const last = await lastLinkIssuedAt(userId);
    if (last && Date.now() - last.getTime() < THROTTLE_MS) return SAME_ANSWER;

    const resetUrl = await issueWelcomeLink(userId, null, { ttlMinutes: RESET_TTL_MINUTES, reset: true });
    const sent = await sendStudioPasswordResetEmail({ toEmail: email, name: member.display_name ?? null, resetUrl });
    if (!sent.ok) console.error("[passwordReset] email", sent.message);
  } catch (err) {
    console.error("[passwordReset]", (err as Error).message);
  }
  return SAME_ANSWER;
}
