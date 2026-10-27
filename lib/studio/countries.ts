import "server-only";

import type { ResearchStatus } from "@/lib/studio/countryStatus";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

/**
 * Studio → Countries. HANDOVER-58 Part 12.4.
 *
 * Two gates live in the database and this screen only explains them:
 *   - legal: a country cannot be switched on unless its research status is
 *     legal_advice or cleared (countries_enable_needs_clearance), and those
 *     statuses need the advice written down (countries_clearance_needs_note);
 *   - pricing: a country cannot open to clients while its price is still the
 *     seeded placeholder (guard_country_enable trigger).
 */

export type CountryRow = {
  code: string;
  name: string;
  currency: string;
  indexStandard: string;
  gdpr: boolean;
  researchStatus: ResearchStatus;
  clientsEnabled: boolean;
  practitionersEnabled: boolean;
  dataLaw: string | null;
  regulatorNote: string | null;
  legalNote: string | null;
  statusChangedAt: string | null;
  diasporaPriority: number;
  price: { amountMinor: number; minorUnits: number; symbol: string; display: string; placeholder: boolean } | null;
  livePractitioners: number;
  clients: number;
  cityPages: number;
};

/** "12.500" for 3 decimal currencies, "25.00" for 2, "3000" for 0. */
export function formatMinor(amountMinor: number, minorUnits: number): string {
  if (minorUnits === 0) return String(amountMinor);
  const f = 10 ** minorUnits;
  const whole = Math.trunc(amountMinor / f);
  const frac = String(Math.abs(amountMinor % f)).padStart(minorUnits, "0");
  return `${whole}.${frac}`;
}

export async function listCountries(): Promise<CountryRow[]> {
  const admin = createAdminSupabaseClient();
  const [{ data: panel }, { data: notes }] = await Promise.all([
    admin.from("admin_country_panel").select("*"),
    admin.from("countries").select("code, legal_note, status_changed_at"),
  ]);
  const noteBy = new Map((notes ?? []).map((n) => [n.code, n]));
  return (panel ?? []).map((r) => ({
    code: r.code,
    name: r.name,
    currency: r.currency,
    indexStandard: r.index_standard,
    gdpr: r.gdpr,
    researchStatus: r.research_status as ResearchStatus,
    clientsEnabled: r.clients_enabled,
    practitionersEnabled: r.practitioners_enabled,
    dataLaw: r.data_law,
    regulatorNote: r.regulator_note,
    legalNote: noteBy.get(r.code)?.legal_note ?? null,
    statusChangedAt: noteBy.get(r.code)?.status_changed_at ?? null,
    diasporaPriority: r.diaspora_priority,
    price:
      r.amount_minor == null || r.minor_units == null
        ? null
        : {
            amountMinor: r.amount_minor,
            minorUnits: r.minor_units,
            symbol: r.symbol ?? "",
            display: formatMinor(r.amount_minor, r.minor_units),
            placeholder: Boolean(r.price_is_placeholder),
          },
    livePractitioners: Number(r.live_practitioners ?? 0),
    clients: Number(r.clients ?? 0),
    cityPages: Number(r.city_pages ?? 0),
  }));
}
