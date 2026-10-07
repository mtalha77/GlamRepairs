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

import { randomInt } from "node:crypto";

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
 * One scheduled room with no host to wait for: whoever is taking the call
 * (Ayma or another practitioner) opens the same link as the client and
 * joins by typing a name, without signing in to RingCentral. A waiting
 * room or join-before-host: false would make the account owner the only
 * person who can start the call, so every consultation would need that
 * one login. Privacy rests instead on one room per appointment, the
 * password inside the link, and deletion the day after the call.
 *
 * Recording is "User", never
 * "Auto": a recorded consultation of someone's face and skin is more
 * sensitive than the photographs, and turning that on is a separate
 * decision with explicit consent and a privacy policy change (§7.4).
 */
const PASSWORD_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";

/** RingCentral requires the password itself when a room is created protected. */
function roomPassword(): string {
  let out = "";
  for (let i = 0; i < 10; i++) out += PASSWORD_CHARS[randomInt(PASSWORD_CHARS.length)];
  return out;
}

export async function createBridge(name: string): Promise<Bridge | null> {
  const token = await accessToken();
  if (!token) return null;
  const password = roomPassword();
  try {
    const res = await fetch(`${SERVER}/rcvideo/v2/account/~/extension/~/bridges`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        type: "Scheduled",
        // `passwordProtected: true` without `password` is a 400: RingCentral
        // only generates one for PMI rooms, never for Scheduled ones.
        security: { passwordProtected: true, password, noGuests: false, sameAccount: false },
        preferences: {
          join: { waitingRoomRequired: "Nobody" },
          joinBeforeHost: true,
          recordingsMode: "User",
        },
      }),
      cache: "no-store",
    });
    const body = (await res.json().catch(() => ({}))) as {
      id?: string;
      discovery?: { web?: string };
      message?: string;
      errors?: { message?: string }[];
    };
    if (!res.ok || !body.id || !body.discovery?.web) {
      // RingCentral's own reason, so a rejection can be diagnosed from the logs.
      const reason = body.errors?.map((e) => e.message).join("; ") || body.message || "";
      console.error("[ringcentral] create bridge failed", res.status, reason.slice(0, 300));
      return null;
    }
    const joinUrl = body.discovery.web;
    return {
      bridgeId: body.id,
      joinUrl,
      // The owner's join link carries the password (`?pw=`); only say it
      // separately when it does not.
      password: /[?&]pw=/.test(joinUrl) ? null : password,
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
