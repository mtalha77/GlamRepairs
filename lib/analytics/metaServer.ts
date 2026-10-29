import "server-only";

import { createHash } from "node:crypto";

/**
 * The Conversions API half (Handover 64 Part 6.4). Off until both
 * NEXT_PUBLIC_META_PIXEL_ID and META_CAPI_TOKEN are set. Email and phone
 * are normalised and SHA-256 hashed before they leave the server, as Meta
 * requires; nothing else personal is sent.
 */

const GRAPH_VERSION = "v21.0";

const sha256 = (value: string) => createHash("sha256").update(value).digest("hex");

export function metaConfigured() {
  return Boolean(process.env.NEXT_PUBLIC_META_PIXEL_ID && process.env.META_CAPI_TOKEN);
}

export async function sendMetaServerEvent(input: {
  event: string;
  eventId: string;
  url?: string | null;
  email?: string | null;
  phone?: string | null;
  ip?: string | null;
  userAgent?: string | null;
  fbp?: string | null;
  fbc?: string | null;
  value?: number | null;
  currency?: string | null;
  actionSource?: "website" | "system_generated";
}): Promise<void> {
  const pixel = process.env.NEXT_PUBLIC_META_PIXEL_ID;
  const token = process.env.META_CAPI_TOKEN;
  if (!pixel || !token) return;

  const email = input.email?.trim().toLowerCase();
  const phone = input.phone?.replace(/\D/g, "");
  const userData: Record<string, unknown> = {
    ...(email ? { em: [sha256(email)] } : {}),
    ...(phone ? { ph: [sha256(phone)] } : {}),
    ...(input.ip ? { client_ip_address: input.ip } : {}),
    ...(input.userAgent ? { client_user_agent: input.userAgent } : {}),
    ...(input.fbp ? { fbp: input.fbp } : {}),
    ...(input.fbc ? { fbc: input.fbc } : {}),
  };

  const body = {
    data: [
      {
        event_name: input.event,
        event_time: Math.floor(Date.now() / 1000),
        event_id: input.eventId,
        action_source: input.actionSource ?? "website",
        ...(input.url ? { event_source_url: input.url } : {}),
        user_data: userData,
        ...(input.value != null ? { custom_data: { value: input.value, currency: input.currency ?? "PKR" } } : {}),
      },
    ],
    ...(process.env.META_TEST_EVENT_CODE ? { test_event_code: process.env.META_TEST_EVENT_CODE } : {}),
  };

  try {
    const res = await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/${pixel}/events?access_token=${encodeURIComponent(token)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) console.error("[meta capi]", res.status, await res.text().catch(() => ""));
  } catch (err) {
    console.error("[meta capi]", (err as Error).message);
  }
}
