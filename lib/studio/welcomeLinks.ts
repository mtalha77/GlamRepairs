import "server-only";

import { createHash, randomBytes } from "node:crypto";

import { getPublicAppUrl } from "@/lib/leads/photoShortLink";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

/**
 * Seven-day welcome links into the studio (see the migration
 * 20261030120000_studio_welcome_links.sql for why). Issuing a new link
 * retires the person's earlier unused ones, so only the latest works.
 */

const hash = (token: string) => createHash("sha256").update(token).digest("hex");

export async function issueWelcomeLink(
  userId: string,
  createdBy: string | null,
  /** Shorter for a password reset than for a welcome (one hour, not seven days). */
  opts: { ttlMinutes?: number; reset?: boolean } = {},
): Promise<string> {
  const admin = createAdminSupabaseClient();
  const now = new Date().toISOString();
  await admin.from("studio_welcome_links").update({ used_at: now }).eq("user_id", userId).is("used_at", null);
  const token = randomBytes(32).toString("base64url");
  const { error } = await admin.from("studio_welcome_links").insert({
    token_hash: hash(token),
    user_id: userId,
    created_by: createdBy,
    ...(opts.ttlMinutes ? { expires_at: new Date(Date.now() + opts.ttlMinutes * 60_000).toISOString() } : {}),
  });
  if (error) throw new Error(error.message);
  return `${getPublicAppUrl()}/studio/welcome?t=${token}${opts.reset ? "&r=1" : ""}`;
}

/** Spends the link and returns whose it was, or null if it is unknown, spent or expired. */
export async function spendWelcomeLink(token: string): Promise<string | null> {
  if (!/^[A-Za-z0-9_-]{20,100}$/.test(token)) return null;
  const { data } = await createAdminSupabaseClient()
    .from("studio_welcome_links")
    .update({ used_at: new Date().toISOString() })
    .eq("token_hash", hash(token))
    .is("used_at", null)
    .gt("expires_at", new Date().toISOString())
    .select("user_id")
    .maybeSingle();
  return data?.user_id ?? null;
}

/** Whether the link would still work, without spending it. */
export async function welcomeLinkIsLive(token: string): Promise<boolean> {
  if (!/^[A-Za-z0-9_-]{20,100}$/.test(token)) return false;
  const { data } = await createAdminSupabaseClient()
    .from("studio_welcome_links")
    .select("id")
    .eq("token_hash", hash(token))
    .is("used_at", null)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();
  return Boolean(data);
}

/** When this person was last sent a link, for throttling password-reset requests. */
export async function lastLinkIssuedAt(userId: string): Promise<Date | null> {
  const { data } = await createAdminSupabaseClient()
    .from("studio_welcome_links")
    .select("created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data?.created_at ? new Date(data.created_at) : null;
}
