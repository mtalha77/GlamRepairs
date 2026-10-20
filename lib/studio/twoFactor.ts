import "server-only";

import { createHmac, randomInt, timingSafeEqual } from "node:crypto";

import { cookies } from "next/headers";

import { escapeHtml, getResendConfig } from "@/lib/email/resendClient";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";

/**
 * Email two-factor sign-in for Studio — Talha, 20 October 2026:
 * "superadmin and other logins should have email 2FA first time logging in
 * or after a long time".
 *
 *   - A sign-in session must be verified before Studio opens: a six-digit
 *     code, emailed to the account, typed within 10 minutes (5 tries).
 *   - A verification lasts 30 days, then the code is asked for again, even
 *     in a session that never signed out ("after a long time").
 *   - The device that verified is remembered for 30 days (a signed,
 *     http-only cookie), so signing in again on it does not ask again
 *     ("first time").
 *   - An emailed invite or reset link proves the same thing a code does.
 *
 * Verification is recorded per session in studio_verified_sessions, which
 * the RLS membership checks also consult, so a password alone cannot read
 * Studio data even by calling the API directly.
 */

const VERIFIED_DAYS = 30;
const CODE_MINUTES = 10;
const MAX_ATTEMPTS = 5;
const DEVICE_COOKIE = "gr_studio_device";

function key(): string {
  const k = process.env.APPLICATION_LINK_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!k) throw new Error("No key available for studio sign-in codes.");
  return k;
}

const sign = (payload: string) => createHmac("sha256", key()).update(payload).digest("base64url");

function safeEqual(a: string, b: string) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

export type StudioSession = { userId: string; sessionId: string; email: string | null };

/** The signed-in session, from the verified JWT. */
export async function currentStudioSession(): Promise<StudioSession | null> {
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims as { sub?: string; session_id?: string; email?: string } | undefined;
  if (!claims?.sub || !claims.session_id) return null;
  return { userId: claims.sub, sessionId: claims.session_id, email: claims.email ?? null };
}

/**
 * The address the account has now. Not the session's email claim: a token
 * keeps the address it was issued with until it refreshes, and an account
 * whose email just changed must get its code at the new one.
 */
export async function accountEmail(userId: string): Promise<string | null> {
  const { data } = await createAdminSupabaseClient().auth.admin.getUserById(userId);
  return data.user?.email ?? null;
}

export async function isSessionVerified(s: StudioSession): Promise<boolean> {
  const { data } = await createAdminSupabaseClient()
    .from("studio_verified_sessions")
    .select("session_id")
    .eq("session_id", s.sessionId)
    .eq("user_id", s.userId)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();
  return Boolean(data);
}

export async function markSessionVerified(s: StudioSession, method: "code" | "trusted_device" | "invite", until?: Date) {
  const max = new Date(Date.now() + VERIFIED_DAYS * 86_400_000);
  const expires = until && until < max ? until : max;
  const { error } = await createAdminSupabaseClient()
    .from("studio_verified_sessions")
    .upsert({ session_id: s.sessionId, user_id: s.userId, method, verified_at: new Date().toISOString(), expires_at: expires.toISOString() });
  if (error) console.error("[markSessionVerified]", error.message);
}

/** When this device verified for this user, if it did within 30 days. */
export async function trustedDeviceUntil(userId: string): Promise<Date | null> {
  const raw = (await cookies()).get(DEVICE_COOKIE)?.value;
  if (!raw) return null;
  const [uid, exp, sig] = raw.split(".");
  if (!uid || !exp || !sig || uid !== userId) return null;
  if (!safeEqual(sig, sign(`device:${uid}.${exp}`))) return null;
  const until = new Date(Number(exp));
  return until.getTime() > Date.now() ? until : null;
}

/** Remember this device for 30 days. Server actions and route handlers only. */
export async function rememberDevice(userId: string) {
  const exp = String(Date.now() + VERIFIED_DAYS * 86_400_000);
  (await cookies()).set(DEVICE_COOKIE, `${userId}.${exp}.${sign(`device:${userId}.${exp}`)}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: VERIFIED_DAYS * 86_400,
  });
}

/**
 * Verified already, or verifiable without a code (a remembered device)?
 * Records the session as verified in the second case.
 */
export async function ensureVerified(s: StudioSession): Promise<boolean> {
  if (await isSessionVerified(s)) return true;
  const until = await trustedDeviceUntil(s.userId);
  if (!until) return false;
  await markSessionVerified(s, "trusted_device", until);
  return true;
}

const hashCode = (s: StudioSession, code: string) => sign(`code:${s.userId}:${s.sessionId}:${code}`);

export async function sendSignInCode(s: StudioSession): Promise<{ ok: true } | { ok: false; error: string }> {
  const email = await accountEmail(s.userId);
  if (!email) return { ok: false, error: "This account has no email address." };
  const admin = createAdminSupabaseClient();
  const hourAgo = new Date(Date.now() - 3_600_000).toISOString();
  const { data: recent } = await admin
    .from("studio_login_codes")
    .select("created_at")
    .eq("user_id", s.userId)
    .gte("created_at", hourAgo)
    .order("created_at", { ascending: false });
  if ((recent?.length ?? 0) >= 5) return { ok: false, error: "Too many codes in the last hour. Please wait a little and try again." };
  if (recent?.[0] && Date.now() - new Date(recent[0].created_at).getTime() < 60_000) {
    return { ok: false, error: "A code was sent less than a minute ago. Check your inbox, including spam." };
  }

  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  const { error } = await admin.from("studio_login_codes").insert({
    user_id: s.userId,
    session_id: s.sessionId,
    code_hash: hashCode(s, code),
    expires_at: new Date(Date.now() + CODE_MINUTES * 60_000).toISOString(),
  });
  if (error) return { ok: false, error: "The code could not be created. Please try again." };

  const config = getResendConfig();
  if (!config) return { ok: false, error: "Email is not configured." };
  const lines = [
    `Your GlamRepairs Studio sign-in code is ${code}.`,
    `It works for ${CODE_MINUTES} minutes. If you did not just sign in, change your password: someone else has it.`,
  ];
  const { error: sendError } = await config.resend.emails.send({
    from: config.from,
    to: [email],
    subject: `${code} is your Studio sign-in code`,
    html: `<div style="font-family: Arial, Helvetica, sans-serif; line-height: 1.65; color: #2b2b2b; max-width: 480px;">
      <p style="margin: 0 0 12px;">Your GlamRepairs Studio sign-in code is</p>
      <p style="margin: 0 0 16px; font-size: 28px; letter-spacing: 6px; font-weight: bold; color: #662d91;">${escapeHtml(code)}</p>
      <p style="margin: 0 0 12px;">${escapeHtml(lines[1])}</p></div>`,
    text: lines.join("\n\n"),
  });
  return sendError ? { ok: false, error: "The email could not be sent. Please try again in a minute." } : { ok: true };
}

export async function checkSignInCode(s: StudioSession, typed: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const code = typed.replace(/\D/g, "");
  if (code.length !== 6) return { ok: false, error: "Enter the six digits from the email." };
  const admin = createAdminSupabaseClient();
  const { data: row } = await admin
    .from("studio_login_codes")
    .select("id, code_hash, attempts, expires_at")
    .eq("user_id", s.userId)
    .eq("session_id", s.sessionId)
    .is("used_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!row || new Date(row.expires_at).getTime() < Date.now()) return { ok: false, error: "That code has expired. Send a new one." };
  if (row.attempts >= MAX_ATTEMPTS) return { ok: false, error: "Too many wrong tries. Send a new code." };
  if (!safeEqual(row.code_hash, hashCode(s, code))) {
    await admin.from("studio_login_codes").update({ attempts: row.attempts + 1 }).eq("id", row.id);
    return { ok: false, error: row.attempts + 1 >= MAX_ATTEMPTS ? "Too many wrong tries. Send a new code." : "That code is not right. Check the latest email." };
  }
  await admin.from("studio_login_codes").update({ used_at: new Date().toISOString() }).eq("id", row.id);
  await markSessionVerified(s, "code");
  return { ok: true };
}
