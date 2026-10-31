import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Safepay, card payments (Talha, 31 October 2026).
 *
 * Built from Safepay's own integrations as of October 2026 (their
 * WooCommerce plugin and @sfpy/node-core), with plain fetch so there is no
 * new dependency:
 *
 *   1. POST {api}/client/passport/v1/token        -> data: time-based token
 *   2. POST {api}/order/payments/v3/              -> data.tracker.token
 *      body: merchant_api_key, intent CYBERSOURCE, mode payment,
 *            currency, amount in the currency's smallest unit
 *   3. POST {api}/order/payments/v3/{tracker}/metadata  (our reference)
 *   4. Redirect to {checkout}/embedded/?tbt&tracker&order_id&environment
 *      &source&redirect_url&cancel_url
 *   5. Webhook: X-SFPY-SIGNATURE = hex HMAC-SHA512 of the JSON body with the
 *      webhook secret; data.state "TRACKER_ENDED" means paid.
 *
 * Server to server calls carry the merchant secret in X-SFPY-MERCHANT-SECRET.
 * A payment is only ever confirmed after asking Safepay directly
 * (GET {api}/reporter/api/v1/payments/{tracker}); a webhook or a redirect on
 * its own is never enough.
 *
 * Everything is dormant until all of SAFEPAY_ENV, SAFEPAY_API_KEY,
 * SAFEPAY_SECRET_KEY and SAFEPAY_WEBHOOK_SECRET are set.
 */

export type SafepayEnv = "sandbox" | "production";

const API: Record<SafepayEnv, string> = {
  sandbox: "https://sandbox.api.getsafepay.com",
  production: "https://api.getsafepay.com",
};

const CHECKOUT: Record<SafepayEnv, string> = {
  sandbox: "https://sandbox.api.getsafepay.com/embedded/",
  production: "https://getsafepay.com/embedded/",
};

/**
 * The currencies Safepay's checkout accepts, per its own plugin. A merchant
 * account may be approved for fewer: SAFEPAY_CURRENCIES narrows the list to
 * what the account actually takes (for example "PKR" until multi-currency
 * is approved). Anything else keeps bank transfer.
 */
const SAFEPAY_SUPPORTED = ["PKR", "USD", "GBP", "AED", "EUR", "CAD", "SAR"];

type Config = { env: SafepayEnv; apiKey: string; secret: string; webhookSecret: string; currencies: string[] };

export function safepayConfig(): Config | null {
  const env = process.env.SAFEPAY_ENV?.trim();
  const apiKey = process.env.SAFEPAY_API_KEY?.trim();
  const secret = process.env.SAFEPAY_SECRET_KEY?.trim();
  const webhookSecret = process.env.SAFEPAY_WEBHOOK_SECRET?.trim();
  if ((env !== "sandbox" && env !== "production") || !apiKey || !secret || !webhookSecret) return null;
  const allowed = (process.env.SAFEPAY_CURRENCIES ?? "")
    .split(",")
    .map((c) => c.trim().toUpperCase())
    .filter(Boolean);
  const currencies = allowed.length ? SAFEPAY_SUPPORTED.filter((c) => allowed.includes(c)) : SAFEPAY_SUPPORTED;
  return { env, apiKey, secret, webhookSecret, currencies };
}

/** Whether a client paying in this currency can be offered a card. */
export function cardPaymentsAvailable(currency: string | null | undefined): boolean {
  const config = safepayConfig();
  return Boolean(config && currency && config.currencies.includes(currency.toUpperCase()));
}

async function call<T>(config: Config, path: string, init: { method: "GET" | "POST"; body?: unknown }): Promise<T> {
  const res = await fetch(`${API[config.env]}${path}`, {
    method: init.method,
    headers: { "Content-Type": "application/json", "X-SFPY-MERCHANT-SECRET": config.secret },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
    cache: "no-store",
    signal: AbortSignal.timeout(20_000),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Safepay ${init.method} ${path} returned ${res.status}: ${text.slice(0, 300)}`);
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(`Safepay ${path} returned non-JSON`);
  }
}

/**
 * Start a checkout. Returns the tracker (stored against our payment row)
 * and the URL to send the client to.
 */
export async function createSafepayCheckout(input: {
  reference: string;
  amountMinor: number;
  currency: string;
  redirectUrl: string;
  cancelUrl: string;
}): Promise<{ tracker: string; url: string; env: SafepayEnv }> {
  const config = safepayConfig();
  if (!config) throw new Error("Safepay is not configured.");

  const passport = await call<{ data?: unknown }>(config, "/client/passport/v1/token", { method: "POST", body: {} });
  const tbt = typeof passport.data === "string" ? passport.data : null;
  if (!tbt) throw new Error("Safepay did not return a checkout token.");

  const session = await call<{ data?: { tracker?: { token?: string } } }>(config, "/order/payments/v3/", {
    method: "POST",
    body: {
      merchant_api_key: config.apiKey,
      intent: "CYBERSOURCE",
      mode: "payment",
      currency: input.currency,
      amount: input.amountMinor,
    },
  });
  const tracker = session.data?.tracker?.token;
  if (!tracker) throw new Error("Safepay did not return a tracker.");

  // Our reference travels on the tracker, so the webhook can be matched even
  // if our own row were lost. Failure here does not block the payment.
  await call(config, `/order/payments/v3/${encodeURIComponent(tracker)}/metadata`, {
    method: "POST",
    body: { data: { source: "glamrepairs", order_id: input.reference } },
  }).catch((err) => console.error("[safepay] metadata", (err as Error).message));

  const query = new URLSearchParams({
    environment: config.env,
    tbt,
    tracker,
    order_id: input.reference,
    source: "glamrepairs",
    redirect_url: input.redirectUrl,
    cancel_url: input.cancelUrl,
  });
  return { tracker, url: `${CHECKOUT[config.env]}?${query.toString()}`, env: config.env };
}

export type SafepayPaymentState = {
  ended: boolean;
  state: string | null;
  amountMinor: number | null;
  currency: string | null;
};

/** Find a value by key anywhere in Safepay's response, which nests differently by endpoint. */
function pick(obj: unknown, keys: string[]): unknown {
  if (!obj || typeof obj !== "object") return undefined;
  for (const k of keys) if (k in (obj as Record<string, unknown>)) return (obj as Record<string, unknown>)[k];
  for (const v of Object.values(obj as Record<string, unknown>)) {
    const found = pick(v, keys);
    if (found !== undefined) return found;
  }
  return undefined;
}

/**
 * Ask Safepay what happened to a tracker. This, not the webhook or the
 * redirect, is what confirms a payment.
 */
export async function fetchSafepayPayment(tracker: string): Promise<SafepayPaymentState> {
  const config = safepayConfig();
  if (!config) throw new Error("Safepay is not configured.");
  const body = await call<unknown>(config, `/reporter/api/v1/payments/${encodeURIComponent(tracker)}`, { method: "GET" });
  const state = pick(body, ["state"]);
  const amount = pick(body, ["amount"]);
  const currency = pick(body, ["currency"]);
  return {
    state: typeof state === "string" ? state : null,
    ended: state === "TRACKER_ENDED",
    amountMinor: typeof amount === "number" ? amount : typeof amount === "string" && /^\d+$/.test(amount) ? Number(amount) : null,
    currency: typeof currency === "string" ? currency.toUpperCase() : null,
  };
}

function safeEqualHex(a: string, b: string) {
  const x = Buffer.from(a.trim().toLowerCase());
  const y = Buffer.from(b.trim().toLowerCase());
  return x.length === y.length && timingSafeEqual(x, y);
}

/**
 * Verify a webhook. Safepay signs the JSON body with the webhook secret
 * (HMAC-SHA512, hex). The raw body is tried first; the compact
 * re-serialisations cover a body that arrives pretty-printed. Every
 * candidate still needs the secret, so trying more than one weakens nothing.
 */
export function verifySafepayWebhook(rawBody: string, signature: string | null): boolean {
  const config = safepayConfig();
  if (!config || !signature) return false;
  const candidates = [rawBody];
  try {
    const parsed = JSON.parse(rawBody) as { data?: unknown };
    candidates.push(JSON.stringify(parsed));
    if (parsed && typeof parsed === "object" && "data" in parsed) candidates.push(JSON.stringify(parsed.data));
  } catch {
    return false;
  }
  return candidates.some((c) => safeEqualHex(createHmac("sha512", config.webhookSecret).update(c).digest("hex"), signature));
}
