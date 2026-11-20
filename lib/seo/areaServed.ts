import "server-only";

import { unstable_cache } from "next/cache";

import { createPublicSupabaseClient } from "@/lib/supabase/publicClient";

/**
 * The countries the Organization serves (Handover 74 Part 3.3), generated so
 * it cannot drift the way the old Pakistan-only value did.
 *
 * Source: the countries a visitor can actually be quoted a price for, which
 * is what plans_public lists (open to clients, or holding a real price
 * people pay by international transfer). `countries.clients_enabled` alone
 * is Pakistan only today, while clients in the UAE, UK, India, Nigeria and
 * the US are quoted in their own currency, so that flag on its own would
 * understate the truth just as the hardcoded value did.
 */
export const listServedCountries = unstable_cache(
  async (): Promise<string[]> => {
    const db = createPublicSupabaseClient();
    const { data: plans } = await db.from("plans_public").select("region_code");
    const codes = [...new Set((plans ?? []).map((p: { region_code: string }) => p.region_code))];
    if (!codes.length) return ["Pakistan"];
    // Names from ICU, not the countries table: that table is service-role
    // only (RLS, no anon grant), so reading it here silently returned nothing
    // and collapsed the list back to Pakistan.
    const names = new Intl.DisplayNames(["en"], { type: "region" });
    const out = codes.map((c) => names.of(c)).filter((n): n is string => !!n && n.length > 2);
    return out.length ? out.sort() : ["Pakistan"];
  },
  ["served-countries-v2"],
  { revalidate: 3600 },
);
