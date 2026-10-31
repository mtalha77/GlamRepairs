import { NextResponse } from "next/server";

import { cardPaymentById, cardPaymentByTracker, settleCardPayment } from "@/lib/payments/cardCheckout";
import { verifySafepayWebhook } from "@/lib/payments/safepay";

/**
 * Safepay's payment webhook (31 October 2026). Register this URL in the
 * Safepay dashboard: Developers, Webhooks (or Endpoints):
 *   https://glamrepairs.com/api/payments/safepay/webhook
 *
 * The signature is checked on the raw body. Even a valid webhook is only a
 * prompt: settleCardPayment asks Safepay's API what happened before
 * anything is marked paid.
 */
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const raw = await request.text();
  if (!verifySafepayWebhook(raw, request.headers.get("x-sfpy-signature"))) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  let payload: { data?: { tracker?: string; metadata?: { order_id?: string } } };
  try {
    payload = JSON.parse(raw);
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  const tracker = payload.data?.tracker;
  const reference = payload.data?.metadata?.order_id;
  const row =
    (tracker ? await cardPaymentByTracker(tracker) : null) ??
    (reference && /^[0-9a-f-]{36}$/.test(reference) ? await cardPaymentById(reference) : null);
  // Acknowledge what is not ours, so Safepay does not retry it forever.
  if (!row) return NextResponse.json({ ok: true, ignored: true });

  const outcome = await settleCardPayment(row, payload);
  // A transient failure asking Safepay is worth a retry from their side.
  return NextResponse.json({ ok: outcome !== "error", outcome }, { status: outcome === "error" ? 503 : 200 });
}
