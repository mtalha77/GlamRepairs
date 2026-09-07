import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  pricingRegionCookieOptions,
  PRICING_REGION_COOKIE,
} from "@/lib/pricing/geo";
import { listActivePricingRegions } from "@/lib/pricing/regions";

/**
 * HOTFIX-7 §1, trap (b) — the currency switcher's write side. Geo sets the
 * default region; this persists an explicit visitor override so it survives
 * the next page load (and, on /pricing, the next visit).
 */
export async function POST(request: Request) {
  let body: { code?: string };
  try {
    body = (await request.json()) as { code?: string };
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const code = body.code?.trim().toUpperCase();
  if (!code) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const regions = await listActivePricingRegions();
  if (!regions.some((region) => region.code === code)) {
    return NextResponse.json(
      { ok: false, message: "Unknown region code." },
      { status: 400 },
    );
  }

  const cookieStore = await cookies();
  cookieStore.set(PRICING_REGION_COOKIE, code, pricingRegionCookieOptions());

  return NextResponse.json({ ok: true });
}
