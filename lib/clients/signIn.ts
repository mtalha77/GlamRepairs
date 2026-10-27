import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

import { logClientEmail } from "@/lib/email/logClientEmail";
import { escapeHtml, getResendConfig } from "@/lib/email/resendClient";
import { getPublicAppUrl } from "@/lib/leads/photoShortLink";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";

/**
 * Client sign-in. HANDOVER-60 Parts 1 and 2.
 *
 * The order the handover requires, and why each step is where it is:
 *
 *   payment verified -> client_accounts row (a database trigger)
 *     -> a signed link, emailed with the payment confirmation
 *     -> the auth user is created when that link is first opened
 *     -> client_accounts.user_id filled in, activated_at stamped
 *
 * No auth user exists for a client who never signs in, so none can be
 * orphaned. Links are signed with the server key, expire, and stop working
 * once used: a link issued before the account's last sign-in is refused.
 *
 * A studio member's address is refused here. Their account has a password
 * and a second factor, and an emailed client link must not become a way
 * round both.
 */

export const CONFIRMATION_LINK_DAYS = 7;
export const REQUESTED_LINK_MINUTES = 30;

function key(): string {
  const k = process.env.APPLICATION_LINK_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!k) throw new Error("No key available to sign client links.");
  return k;
}

const sign = (payload: string) => createHmac("sha256", key()).update(`client-signin:${payload}`).digest("base64url");

export function clientSignInUrl(accountId: string, ttlMs: number): string {
  const iat = Date.now();
  const payload = `${accountId}.${iat}.${iat + ttlMs}`;
  return `${getPublicAppUrl()}/account/signin?t=${encodeURIComponent(`${payload}.${sign(payload)}`)}`;
}

type Parsed = { accountId: string; iat: number; exp: number };

export function readClientToken(token: string): Parsed | null {
  const parts = token.split(".");
  if (parts.length !== 4) return null;
  const [accountId, iatRaw, expRaw, sig] = parts;
  const payload = `${accountId}.${iatRaw}.${expRaw}`;
  const expected = Buffer.from(sign(payload));
  const given = Buffer.from(sig);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  const iat = Number(iatRaw);
  const exp = Number(expRaw);
  if (!Number.isFinite(iat) || !Number.isFinite(exp)) return null;
  return { accountId, iat, exp };
}

export type SignInOutcome = { ok: true } | { ok: false; reason: "invalid" | "expired" | "used" | "staff" | "error" };

/** Open a session for the account a valid link names. Route handlers only. */
export async function signInWithClientToken(token: string): Promise<SignInOutcome> {
  const parsed = readClientToken(token);
  if (!parsed) return { ok: false, reason: "invalid" };
  if (parsed.exp < Date.now()) return { ok: false, reason: "expired" };

  const admin = createAdminSupabaseClient();
  const { data: account } = await admin
    .from("client_accounts")
    .select("id, email, user_id, activated_at, last_login_at, login_count")
    .eq("id", parsed.accountId)
    .is("deleted_at", null)
    .maybeSingle();
  if (!account) return { ok: false, reason: "invalid" };
  if (account.last_login_at && new Date(account.last_login_at).getTime() >= parsed.iat) {
    return { ok: false, reason: "used" };
  }

  // First sign-in: the auth user is created now, not before (Part 1).
  if (!account.user_id) {
    const { error } = await admin.auth.admin.createUser({
      email: account.email,
      email_confirm: true,
      user_metadata: { kind: "client" },
    });
    // "Already registered" is fine: generateLink below returns that user.
    if (error && !/already|exists|registered/i.test(error.message)) {
      console.error("[signInWithClientToken] createUser", error.message);
      return { ok: false, reason: "error" };
    }
  }

  const { data: link, error: linkError } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email: account.email,
  });
  if (linkError || !link?.properties?.hashed_token || !link.user) {
    console.error("[signInWithClientToken] generateLink", linkError?.message);
    return { ok: false, reason: "error" };
  }
  if (account.user_id && account.user_id !== link.user.id) return { ok: false, reason: "error" };

  const { data: staff } = await admin.from("studio_members").select("user_id").eq("user_id", link.user.id).maybeSingle();
  if (staff) return { ok: false, reason: "staff" };

  const supabase = await createServerSupabaseClient();
  const { error: verifyError } = await supabase.auth.verifyOtp({
    type: "magiclink",
    token_hash: link.properties.hashed_token,
  });
  if (verifyError) {
    console.error("[signInWithClientToken] verifyOtp", verifyError.message);
    return { ok: false, reason: "error" };
  }

  const now = new Date().toISOString();
  const { error: updateError } = await admin
    .from("client_accounts")
    .update({
      user_id: link.user.id,
      activated_at: account.activated_at ?? now,
      last_login_at: now,
      login_count: (account.login_count ?? 0) + 1,
      updated_at: now,
    })
    .eq("id", account.id);
  if (updateError) console.error("[signInWithClientToken] account update", updateError.message);
  return { ok: true };
}

/** The signed-in client's account, or null. */
export async function currentClientAccount() {
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase.auth.getClaims();
  const userId = (data?.claims as { sub?: string } | undefined)?.sub;
  if (!userId) return null;
  const { data: account } = await createAdminSupabaseClient()
    .from("client_accounts")
    .select("id, email, full_name, lead_id, user_id")
    .eq("user_id", userId)
    .is("deleted_at", null)
    .maybeSingle();
  return account;
}

/**
 * Email a fresh 30 minute link if this address has an account. The caller
 * says the same thing either way, so the form cannot be used to find out
 * who is a client.
 */
export async function emailClientSignInLink(email: string): Promise<void> {
  const address = email.trim().toLowerCase();
  if (!address.includes("@") || address.length > 254) return;
  const admin = createAdminSupabaseClient();
  const { data: account } = await admin
    .from("client_accounts")
    .select("id, email, full_name, lead_id, last_link_sent_at")
    .ilike("email", address.replace(/[%_\\]/g, (c) => `\\${c}`))
    .is("deleted_at", null)
    .maybeSingle();
  if (!account) return;
  if (account.last_link_sent_at && Date.now() - new Date(account.last_link_sent_at).getTime() < 60_000) return;

  const config = getResendConfig();
  if (!config) return;
  const url = clientSignInUrl(account.id, REQUESTED_LINK_MINUTES * 60_000);
  const first = account.full_name?.trim().split(/\s+/)[0] || "there";
  const subject = "Your GlamRepairs sign-in link";
  const text = [
    `Hi ${first},`,
    `Here is your link to sign in and see your assessment. It works once, for ${REQUESTED_LINK_MINUTES} minutes:`,
    url,
    "If you did not ask for this, you can ignore it. Nobody can sign in without this email.",
  ].join("\n\n");
  const { data, error } = await config.resend.emails.send({
    from: config.from,
    to: [account.email],
    subject,
    text,
    html: `<div style="font-family: Arial, Helvetica, sans-serif; line-height: 1.65; color: #2b2b2b; max-width: 520px;">
      <p>Hi ${escapeHtml(first)},</p>
      <p>Here is your link to sign in and see your assessment. It works once, for ${REQUESTED_LINK_MINUTES} minutes.</p>
      <p><a href="${escapeHtml(url)}" style="display: inline-block; background: #662d91; color: #ffffff; padding: 12px 20px; border-radius: 999px; text-decoration: none;">Sign in</a></p>
      <p style="color: #4a4a4a; font-size: 13px;">If you did not ask for this, you can ignore it. Nobody can sign in without this email.</p>
    </div>`,
  });
  await admin
    .from("client_accounts")
    .update({ last_link_sent_at: new Date().toISOString() })
    .eq("id", account.id);
  await logClientEmail({
    leadId: account.lead_id,
    toEmail: account.email,
    subject,
    // The link itself is a credential, so the record keeps the wording only.
    body: text.replace(url, "[sign-in link]"),
    kind: "other",
    resendId: data?.id ?? null,
    error: error?.message ?? null,
  });
}
