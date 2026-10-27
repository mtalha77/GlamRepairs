"use server";

import { revalidatePath } from "next/cache";

import { RESEARCH_STATUSES, type ResearchStatus } from "@/lib/studio/countryStatus";
import { requireStudioMember } from "@/lib/studio/member";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

/** Studio → Countries. Super admins only (Talha and Ayma). */

type Result = { ok: true } | { ok: false; error: string };

async function guard() {
  const { user, member } = await requireStudioMember();
  if (!user || !member?.isSuperAdmin) return null;
  return user.id;
}

async function countryName(code: string) {
  const { data } = await createAdminSupabaseClient().from("countries").select("name").eq("code", code).maybeSingle();
  return data?.name ?? code;
}

/** The database's guard messages, in plain English. Never a constraint name. */
function plain(message: string, name: string): string {
  if (message.includes("countries_enable_needs_clearance")) {
    return `Cannot switch ${name} on: no lawyer has reviewed it yet. Set the research status to "Legal advice taken" or "Cleared", with what the lawyer said, first.`;
  }
  if (message.includes("countries_clearance_needs_note")) {
    return `Write down what the lawyer said (at least a sentence) before marking ${name} as reviewed.`;
  }
  if (message.includes("placeholder")) {
    return `Cannot open ${name} to clients: its price is still a placeholder. Set a real price first.`;
  }
  if (message.includes("no price is set")) {
    return `Cannot open ${name} to clients: it has no price. Set one first.`;
  }
  if (message.includes("country_pricing_amount_nonneg")) return "The price cannot be negative.";
  return "That could not be saved. Please try again.";
}

const CODE = /^[A-Z]{2}$/;

export async function setCountrySwitch(input: {
  code: string;
  which: "clients" | "practitioners";
  on: boolean;
}): Promise<Result> {
  if (!(await guard())) return { ok: false, error: "Not allowed." };
  if (!CODE.test(input.code)) return { ok: false, error: "Unknown country." };
  const update = input.which === "clients" ? { clients_enabled: input.on } : { practitioners_enabled: input.on };
  const { error } = await createAdminSupabaseClient().from("countries").update(update).eq("code", input.code);
  if (error) return { ok: false, error: plain(error.message, await countryName(input.code)) };
  revalidatePath("/studio/countries");
  return { ok: true };
}

export async function setCountryResearch(input: {
  code: string;
  status: ResearchStatus;
  legalNote: string;
}): Promise<Result> {
  const by = await guard();
  if (!by) return { ok: false, error: "Not allowed." };
  if (!CODE.test(input.code)) return { ok: false, error: "Unknown country." };
  if (!RESEARCH_STATUSES.includes(input.status)) return { ok: false, error: "Unknown status." };
  const note = input.legalNote.trim().slice(0, 4000);

  const admin = createAdminSupabaseClient();
  const { data: current } = await admin
    .from("countries")
    .select("name, clients_enabled, practitioners_enabled")
    .eq("code", input.code)
    .maybeSingle();
  if (!current) return { ok: false, error: "Unknown country." };
  const reviewed = input.status === "legal_advice" || input.status === "cleared";
  if (!reviewed && (current.clients_enabled || current.practitioners_enabled)) {
    return { ok: false, error: `Switch ${current.name} off for clients and practitioners before moving it back from reviewed.` };
  }

  const { error } = await admin
    .from("countries")
    .update({
      research_status: input.status,
      legal_note: note || null,
      status_changed_at: new Date().toISOString(),
      status_changed_by: by,
    })
    .eq("code", input.code);
  if (error) return { ok: false, error: plain(error.message, current.name) };
  revalidatePath("/studio/countries");
  return { ok: true };
}

/**
 * Set the Transform price, typed as the client would see it ("20", "12.500").
 * Stored in minor units; the decimal places come from the currency, so a
 * Kuwaiti dinar price cannot be stored ten times too small.
 */
export async function setCountryPrice(input: { code: string; amount: string }): Promise<Result> {
  const by = await guard();
  if (!by) return { ok: false, error: "Not allowed." };
  if (!CODE.test(input.code)) return { ok: false, error: "Unknown country." };

  const admin = createAdminSupabaseClient();
  const { data: row } = await admin
    .from("country_pricing")
    .select("minor_units, currency")
    .eq("country_code", input.code)
    .eq("plan_key", "transform")
    .maybeSingle();
  if (!row) return { ok: false, error: "This country has no price row." };

  const typed = input.amount.trim().replace(/,/g, "");
  const places = row.minor_units;
  const pattern = places === 0 ? /^\d+$/ : new RegExp(`^\\d+(\\.\\d{1,${places}})?$`);
  if (!pattern.test(typed)) {
    return {
      ok: false,
      error: places === 0 ? `${row.currency} has no decimal places. Enter a whole number.` : `Enter a number with at most ${places} decimal places.`,
    };
  }
  const [whole, frac = ""] = typed.split(".");
  const amountMinor = Number(whole) * 10 ** places + Number(frac.padEnd(places, "0") || "0");
  if (!Number.isSafeInteger(amountMinor) || amountMinor <= 0 || amountMinor > 2_000_000_000) {
    return { ok: false, error: "That price is out of range." };
  }

  const { error } = await admin
    .from("country_pricing")
    .update({
      amount_minor: amountMinor,
      // Anything not starting "Placeholder" counts as a real price for the gate.
      note: `Set in the studio on ${new Date().toISOString().slice(0, 10)}.`,
      updated_at: new Date().toISOString(),
      updated_by: by,
    })
    .eq("country_code", input.code)
    .eq("plan_key", "transform");
  if (error) return { ok: false, error: plain(error.message, await countryName(input.code)) };
  revalidatePath("/studio/countries");
  return { ok: true };
}
