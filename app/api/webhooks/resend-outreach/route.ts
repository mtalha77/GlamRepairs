import { createHmac, timingSafeEqual } from "node:crypto";

import { NextResponse, type NextRequest } from "next/server";

import { outreachConfig, outreachDb } from "@/lib/outreach/config";
import { suppressAddress } from "@/lib/outreach/suppress";

export const dynamic = "force-dynamic";

/**
 * Resend events for the OUTREACH account (Handover 69 §3.1, 68 §5.2).
 *
 * The raw event is stored once (the unique key absorbs Resend's retries) and
 * is the source of truth for the stats. On top of that:
 *
 *   hard bounce   the address is suppressed everywhere
 *   complaint     the address is suppressed AND all sending pauses for
 *                 review, whatever the rate (Handover 68 §5.2)
 *   either        the rolling-100 guard check runs (Handover 69 §3.4)
 *
 * Signed with Svix, as all Resend webhooks are; anything unsigned or older
 * than five minutes is refused.
 */

const TYPES: Record<string, string> = {
  "email.sent": "sent",
  "email.delivered": "delivered",
  "email.delivery_delayed": "delivery_delayed",
  "email.opened": "opened",
  "email.clicked": "clicked",
  "email.bounced": "bounced",
  "email.complained": "complained",
};

const STAMP: Record<string, string> = {
  delivered: "delivered_at",
  opened: "opened_at",
  clicked: "clicked_at",
  bounced: "bounced_at",
  complained: "complained_at",
};

function verifySvix(secret: string, id: string | null, timestamp: string | null, signature: string | null, body: string): boolean {
  if (!id || !timestamp || !signature) return false;
  const ts = Number(timestamp);
  if (!Number.isFinite(ts) || Math.abs(Date.now() / 1000 - ts) > 300) return false;
  const key = Buffer.from(secret.replace(/^whsec_/, ""), "base64");
  const expected = createHmac("sha256", key).update(`${id}.${timestamp}.${body}`).digest("base64");
  return signature.split(" ").some((part) => {
    const sig = part.split(",")[1];
    if (!sig) return false;
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    return a.length === b.length && timingSafeEqual(a, b);
  });
}

type ResendEvent = {
  type?: string;
  created_at?: string;
  data?: { email_id?: string; created_at?: string; bounce?: { type?: string; subType?: string; message?: string } };
};

export async function POST(request: NextRequest) {
  const cfg = outreachConfig();
  const secret = cfg.ok ? cfg.config.webhookSecret : process.env.OUTREACH_RESEND_WEBHOOK_SECRET?.trim();
  if (!secret) return NextResponse.json({ ok: false, error: "Webhook secret not configured" }, { status: 503 });

  const body = await request.text();
  if (!verifySvix(secret, request.headers.get("svix-id"), request.headers.get("svix-timestamp"), request.headers.get("svix-signature"), body)) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  let event: ResendEvent;
  try {
    event = JSON.parse(body) as ResendEvent;
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  const type = TYPES[event.type ?? ""];
  const providerId = event.data?.email_id;
  if (!type || !providerId) return NextResponse.json({ ok: true, ignored: true });

  const db = outreachDb();
  const { data: send } = await db
    .from("outreach_sends")
    .select("id, to_email, step_no")
    .eq("provider_id", providerId)
    .maybeSingle();
  // Not an outreach send (or not ours): acknowledged, nothing to record.
  if (!send) return NextResponse.json({ ok: true, ignored: true });

  const occurredAt = event.data?.created_at ?? event.created_at ?? new Date().toISOString();
  await db
    .from("outreach_events")
    .upsert({ send_id: send.id, provider_id: providerId, type, occurred_at: occurredAt, payload: event }, { onConflict: "provider_id,type,occurred_at", ignoreDuplicates: true });

  const hardBounce = type === "bounced" && (event.data?.bounce?.type ?? "Permanent").toLowerCase() !== "transient";
  const stamp = STAMP[type];
  if (stamp && (type !== "bounced" || hardBounce)) {
    await db.from("outreach_sends").update({ [stamp]: occurredAt }).eq("id", send.id).is(stamp, null);
  }

  if (hardBounce) {
    await suppressAddress({ email: send.to_email, reason: "bounced", note: event.data?.bounce?.message?.slice(0, 300) ?? null });
  }
  if (type === "complained") {
    await suppressAddress({ email: send.to_email, reason: "complained", note: `Spam complaint on step ${send.step_no}` });
    await db
      .from("outreach_settings")
      .update({
        paused: true,
        paused_reason: `Spam complaint from ${send.to_email} on step ${send.step_no}. Review the list and the copy before sending again.`,
        paused_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", true)
      .eq("paused", false);
  }
  if (hardBounce || type === "complained") await db.rpc("outreach_guard_check");

  return NextResponse.json({ ok: true });
}
