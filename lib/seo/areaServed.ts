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
    const { data: countries } = await db.from("countries").select("code, name").in("code", codes);
    const names = (countries ?? []).map((c: { code: string; name: string }) => c.name).filter(Boolean);
    return names.length ? names.sort() : ["Pakistan"];
  },
  ["served-countries"],
  { revalidate: 3600 },
);
