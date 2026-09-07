import { cookies, headers } from "next/headers";
import {
  resolvePricingRegion,
  type PricingRegion,
} from "@/lib/pricing/regions";

/**
 * HOTFIX-7 §1, trap (b) — never hard-lock by IP. Geo sets the *default*
 * region; a visitor can override it with the currency switcher and the
 * choice persists via this cookie (1 year), read back on every future visit
 * ahead of the geo header.
 */
export const PRICING_REGION_COOKIE = "pricing_region";

const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

/** Vercel injects this header at the edge for every request in production. */
function countryFromHeaders(headerList: Headers): string | null {
  return (
    headerList.get("x-vercel-ip-country") ??
    headerList.get("x-country-code") ??
    null
  );
}

/**
 * Server Component / layout helper. Calling this reads `cookies()` and
 * `headers()`, which opts the calling route into dynamic rendering — that's
 * deliberate and required: see trap (a) in the HOTFIX-7 handover. A
 * statically cached pricing page would serve the first visitor's currency
 * to everyone.
 */
export async function getServerPricingRegion(): Promise<PricingRegion> {
  const [cookieStore, headerList] = await Promise.all([cookies(), headers()]);
  const override = cookieStore.get(PRICING_REGION_COOKIE)?.value;
  const country = override || countryFromHeaders(headerList);
  return resolvePricingRegion(country);
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
  const country = override || countryFromHeaders(request.headers);
  return resolvePricingRegion(country);
}

export function pricingRegionCookieOptions() {
  return {
    name: PRICING_REGION_COOKIE,
    maxAge: COOKIE_MAX_AGE,
    path: "/",
    sameSite: "lax" as const,
  };
}
