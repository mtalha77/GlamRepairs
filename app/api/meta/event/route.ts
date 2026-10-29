import { NextResponse } from "next/server";

import { metaConfigured, sendMetaServerEvent } from "@/lib/analytics/metaServer";
import { getTestSession } from "@/lib/testPortal/session";

/**
 * Browser events forwarded to the Conversions API (Handover 64 Part 6.4).
 * Only the funnel events are accepted; Purchase is sent by the server alone,
 * when a payment is verified, so it cannot be forged from here.
 */
const ALLOWED = new Set(["StartAssessment", "Lead", "PhotosUploaded", "PlanSelected", "InitiateCheckout"]);

export async function POST(request: Request) {
  if (!metaConfigured()) return NextResponse.json({ ok: true, skipped: "not configured" });
  if (await getTestSession()) return NextResponse.json({ ok: true, skipped: "test session" });

  let body: { event?: string; eventId?: string; url?: string; email?: string; phone?: string; value?: number; currency?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  if (!body.event || !ALLOWED.has(body.event) || !body.eventId || body.eventId.length > 64) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const cookie = request.headers.get("cookie") ?? "";
  const read = (name: string) => cookie.match(new RegExp(`(?:^|; )${name}=([^;]+)`))?.[1] ?? null;
  await sendMetaServerEvent({
    event: body.event,
    eventId: body.eventId,
    url: typeof body.url === "string" ? body.url.slice(0, 500) : null,
    email: typeof body.email === "string" ? body.email.slice(0, 200) : null,
    phone: typeof body.phone === "string" ? body.phone.slice(0, 40) : null,
    ip: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
    userAgent: request.headers.get("user-agent"),
    fbp: read("_fbp"),
    fbc: read("_fbc"),
    value: typeof body.value === "number" ? body.value : null,
    currency: typeof body.currency === "string" ? body.currency.slice(0, 3) : null,
  });
  return NextResponse.json({ ok: true });
}
