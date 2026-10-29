import "server-only";

import { createHmac, randomBytes, randomUUID, scryptSync, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

import { createAdminSupabaseClient } from "@/lib/supabase/admin";

/**
 * The test portal session (Handover 63 Part 3).
 *
 * Not a separate build: the real application with a flag on the session.
 * The flag is a signed, http-only cookie carrying a random session id and
 * the passphrase version it was issued under. Rotating the passphrase in
 * the studio bumps the version, which ends every open test session.
 *
 * Every lead written while the cookie is valid carries `is_test = true` and
 * `test_session`, and the database refuses to let such a lead be assigned,
 * notified or redeem a gift code.
 */

export const TEST_COOKIE = "gr_test";
const TTL_MS = 12 * 60 * 60 * 1000;

export type TestSession = { sid: string; version: number };

function key() {
  const k = process.env.APPLICATION_LINK_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!k) throw new Error("No signing key configured.");
  return k;
}

const sign = (payload: string) => createHmac("sha256", key()).update(`test-portal:${payload}`).digest("base64url");

function safeEqual(a: string, b: string) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

async function currentVersion(): Promise<{ version: number; configured: boolean }> {
  const { data } = await createAdminSupabaseClient()
    .from("test_portal_settings")
    .select("version, passphrase_hash")
    .eq("id", true)
    .maybeSingle();
  return { version: data?.version ?? 1, configured: Boolean(data?.passphrase_hash) };
}

/** Whether a passphrase has been set at all. Until then /test cannot be entered. */
export async function testPortalConfigured(): Promise<boolean> {
  return (await currentVersion()).configured;
}

/** The valid test session on this request, or null. Never throws. */
export async function getTestSession(): Promise<TestSession | null> {
  try {
    const raw = (await cookies()).get(TEST_COOKIE)?.value;
    if (!raw) return null;
    const [sid, version, exp, sig] = raw.split(".");
    if (!sid || !version || !exp || !sig) return null;
    if (!safeEqual(sig, sign(`${sid}.${version}.${exp}`))) return null;
    if (Number(exp) < Date.now()) return null;
    const current = await currentVersion();
    if (!current.configured || current.version !== Number(version)) return null;
    return { sid, version: Number(version) };
  } catch {
    return null;
  }
}

/**
 * The funnel session id as the database will store it. A test session's
 * leads live under their own prefix, so a test can never find, and so never
 * patch, a real client's row through a reused browser session id.
 */
export function scopedSessionId(sessionId: string, test: TestSession | null) {
  return test ? `test-${test.sid}-${sessionId}` : sessionId;
}

function hashPassphrase(passphrase: string, salt = randomBytes(16).toString("base64url")) {
  const hash = scryptSync(passphrase.normalize("NFKC").trim().toLowerCase(), salt, 32).toString("base64url");
  return `scrypt$${salt}$${hash}`;
}

/** Start a test session if the passphrase is right. */
export async function startTestSession(passphrase: string): Promise<boolean> {
  const { data } = await createAdminSupabaseClient()
    .from("test_portal_settings")
    .select("version, passphrase_hash")
    .eq("id", true)
    .maybeSingle();
  const stored = data?.passphrase_hash;
  if (!stored || !passphrase.trim()) return false;
  const [, salt] = stored.split("$");
  if (!salt || !safeEqual(hashPassphrase(passphrase, salt), stored)) return false;

  const sid = randomUUID().replaceAll("-", "").slice(0, 16);
  const exp = Date.now() + TTL_MS;
  const payload = `${sid}.${data.version}.${exp}`;
  (await cookies()).set(TEST_COOKIE, `${payload}.${sign(payload)}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: TTL_MS / 1000,
  });
  // Readable by the browser, and carries nothing: it only tells client-side
  // analytics (the Meta Pixel) to stay quiet in a demo. Authority is the
  // signed cookie above.
  (await cookies()).set("gr_test_ui", "1", { path: "/", sameSite: "lax", maxAge: TTL_MS / 1000 });
  return true;
}

export async function clearTestCookie() {
  (await cookies()).delete(TEST_COOKIE);
  (await cookies()).delete("gr_test_ui");
}

const WORDS = [
  "amber", "basil", "cedar", "dune", "ember", "fern", "glade", "harbor", "iris", "jade", "kelp", "lotus",
  "maple", "nectar", "olive", "pearl", "quartz", "reed", "saffron", "tide", "umber", "violet", "willow", "zest",
];

/**
 * A new passphrase, returned once in plain text for the person who rotated
 * it to share. Only its hash is stored. Bumping the version signs out every
 * open test session.
 */
export async function rotateTestPassphrase(userId: string): Promise<string> {
  const bytes = randomBytes(4);
  const words = [...bytes].map((b) => WORDS[b % WORDS.length]);
  const passphrase = `${words.join("-")}-${10 + (randomBytes(1)[0] % 90)}`;
  const admin = createAdminSupabaseClient();
  const { data } = await admin.from("test_portal_settings").select("version").eq("id", true).maybeSingle();
  const { error } = await admin
    .from("test_portal_settings")
    .upsert({
      id: true,
      passphrase_hash: hashPassphrase(passphrase),
      version: (data?.version ?? 0) + 1,
      rotated_at: new Date().toISOString(),
      rotated_by: userId,
    });
  if (error) throw new Error(error.message);
  return passphrase;
}

/** Turn the portal off entirely: no passphrase opens it until a new one is set. */
export async function disableTestPortal(userId: string) {
  const admin = createAdminSupabaseClient();
  const { data } = await admin.from("test_portal_settings").select("version").eq("id", true).maybeSingle();
  await admin
    .from("test_portal_settings")
    .upsert({ id: true, passphrase_hash: null, version: (data?.version ?? 0) + 1, rotated_at: new Date().toISOString(), rotated_by: userId });
}

export async function testPortalStatus() {
  const { data } = await createAdminSupabaseClient()
    .from("test_portal_settings")
    .select("passphrase_hash, rotated_at")
    .eq("id", true)
    .maybeSingle();
  return { configured: Boolean(data?.passphrase_hash), rotatedAt: data?.rotated_at ?? null };
}
