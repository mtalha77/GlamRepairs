import "server-only";

/**
 * RingCentral Video rooms — HANDOVER-50 §7.
 *
 * A bridge is a room, not an appointment: RingCentral keeps no time, so our
 * database owns the schedule and this only supplies a URL. One bridge per
 * appointment, deleted the day after the call, so a past client can never
 * walk back into someone else's consultation. Never a shared personal room.
 *
 * Every function here returns null on failure rather than throwing. The RCV
 * REST API is in beta ("backwards compatibility is not guaranteed"), and an
 * outage must never block a booking: the caller confirms the time anyway,
 * flags the missing link to the studio, and Ayma pastes one in by hand.
 *
 * Credentials are server-side only: RC_JWT, RC_CLIENT_ID, RC_CLIENT_SECRET.
 * Requires RingCentral Video Pro; the free developer tier excludes RCV.
 */

const SERVER = process.env.RC_SERVER_URL?.replace(/\/$/, "") || "https://platform.ringcentral.com";

export function ringCentralConfigured(): boolean {
  return Boolean(process.env.RC_JWT && process.env.RC_CLIENT_ID && process.env.RC_CLIENT_SECRET);
}

let cached: { token: string; expiresAt: number } | null = null;

async function accessToken(): Promise<string | null> {
  if (!ringCentralConfigured()) return null;
  if (cached && cached.expiresAt - 60_000 > Date.now()) return cached.token;
  try {
    const basic = Buffer.from(`${process.env.RC_CLIENT_ID}:${process.env.RC_CLIENT_SECRET}`).toString("base64");
    const res = await fetch(`${SERVER}/restapi/oauth/token`, {
      method: "POST",
      headers: { Authorization: `Basic ${basic}`, "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
        assertion: process.env.RC_JWT ?? "",
      }),
      cache: "no-store",
    });
    const body = (await res.json().catch(() => ({}))) as { access_token?: string; expires_in?: number };
    if (!res.ok || !body.access_token) {
      console.error("[ringcentral] token exchange failed", res.status);
      return null;
    }
    cached = { token: body.access_token, expiresAt: Date.now() + (body.expires_in ?? 3600) * 1000 };
    return body.access_token;
  } catch (err) {
    console.error("[ringcentral] token exchange error", (err as Error).message);
    return null;
  }
}

export type Bridge = {
  bridgeId: string;
  /** The guest link. The only URL that may ever reach a client. */
  joinUrl: string;
  /** Present when the room is password-protected and the link does not embed it. */
  password: string | null;
};

/**
 * One scheduled room. Guests wait until Ayma admits them
 * (waitingRoomRequired: GuestsOnly, joinBeforeHost: false), which is the
 * "no one can rejoin" requirement enforced live. Recording is "User", never
 * "Auto": a recorded consultation of someone's face and skin is more
 * sensitive than the photographs, and turning that on is a separate
 * decision with explicit consent and a privacy policy change (§7.4).
 */
export async function createBridge(name: string): Promise<Bridge | null> {
  const token = await accessToken();
  if (!token) return null;
  try {
    const res = await fetch(`${SERVER}/rcvideo/v2/account/~/extension/~/bridges`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        type: "Scheduled",
        security: { passwordProtected: true, noGuests: false, sameAccount: false },
        preferences: {
          join: { waitingRoomRequired: "GuestsOnly" },
          joinBeforeHost: false,
          recordingsMode: "User",
        },
      }),
      cache: "no-store",
    });
    const body = (await res.json().catch(() => ({}))) as {
      id?: string;
      discovery?: { web?: string };
      security?: { password?: string };
    };
    if (!res.ok || !body.id || !body.discovery?.web) {
      console.error("[ringcentral] create bridge failed", res.status);
      return null;
    }
    const joinUrl = body.discovery.web;
    const password = body.security?.password ?? null;
    return {
      bridgeId: body.id,
      joinUrl,
      // Only worth telling the client if the link does not already carry it.
      password: password && !joinUrl.includes(password) ? password : null,
    };
  } catch (err) {
    console.error("[ringcentral] create bridge error", (err as Error).message);
    return null;
  }
}

/** True when the room is gone (deleted now, or already gone: 404). */
export async function deleteBridge(bridgeId: string): Promise<boolean> {
  const token = await accessToken();
  if (!token) return false;
  try {
    const res = await fetch(`${SERVER}/rcvideo/v2/bridges/${encodeURIComponent(bridgeId)}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (res.ok || res.status === 404) return true;
    console.error("[ringcentral] delete bridge failed", res.status);
    return false;
  } catch (err) {
    console.error("[ringcentral] delete bridge error", (err as Error).message);
    return false;
  }
}
