import { cookies, headers } from "next/headers";
import {
  resolvePricingRegion,
  type PricingRegion,
} from "@/lib/pricing/regions";

/**
 * HOTFIX-7 §1, trap (b) — never hard-lock by IP. A visitor can choose a
 * currency with the switcher; the choice persists via this cookie (1 year).
 *
 * HANDOVER-54 §2.1 — without a choice, the default is Pakistan, not the
 * visitor's location. Google crawls from the United States, so a geo
 * default rendered /pricing as "$22" under a "Rs 3,000" title, and Google
 * declined to index the page. Rupees for everyone who has not chosen
 * otherwise; the funnel reads the same default, so the page and the
 * checkout always agree.
 */
export const PRICING_REGION_COOKIE = "pricing_region";

const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

const DEFAULT_COUNTRY = "PK";

/**
 * Server Component / layout helper. Calling this reads `cookies()`, which
 * opts the calling route into dynamic rendering — that's
 * deliberate and required: see trap (a) in the HOTFIX-7 handover. A
 * statically cached pricing page would serve the first visitor's currency
 * to everyone.
 */
export async function getServerPricingRegion(): Promise<PricingRegion> {
  const cookieStore = await cookies();
  const override = cookieStore.get(PRICING_REGION_COOKIE)?.value;
  return resolvePricingRegion(override || DEFAULT_COUNTRY);
}

/** Same resolution, for a plain Route Handler holding a `Request` directly. */
export async function getRequestPricingRegion(
  request: Request,
): Promise<PricingRegion> {
  const cookieHeader = request.headers.get("cookie") ?? "";
  const match = cookieHeader.match(
    new RegExp(`(?:^|; )${PRICING_REGION_COOKIE}=([^;]+)`),
  );
  const override = match ? decodeURIComponent(match[1]) : null;
  return resolvePricingRegion(override || DEFAULT_COUNTRY);
}

export function pricingRegionCookieOptions() {
  return {
    name: PRICING_REGION_COOKIE,
    maxAge: COOKIE_MAX_AGE,
    path: "/",
    sameSite: "lax" as const,
  };
}

/**
 * Where the visitor is, from Vercel's own geo header. No lookup service,
 * no added latency. Used to tell someone outside the quoted country, in
 * plain words, what currency they are looking at (HANDOVER-62 Part 2);
 * never to pick a price they cannot pay. Null in development.
 */
export async function getVisitorCountry(): Promise<string | null> {
  const code = (await headers()).get("x-vercel-ip-country")?.toUpperCase() ?? null;
  return code && /^[A-Z]{2}$/.test(code) ? code : null;
}
