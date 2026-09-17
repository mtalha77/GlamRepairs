import { PAID_PLAN_KEY } from "@/lib/plans/plansPublic";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  isGiftCheckReason,
  normaliseGiftCode,
  type GiftCheckResult,
} from "@/lib/gifts/giftCodes";
import { getGiftCapacity, getGiftSettings } from "@/lib/gifts/giftSettings";

/**
 * HANDOVER-20 Part 2 — issuing and validating gift codes.
 *
 * ── Capacity is the constraint, not fraud ────────────────────────────────
 * A free Skin Transform assessment is Rs. 3,000 of Ayma's time — HANDOVER-27
 * retired Clarity, so a gift now covers the full paid plan — and she is the
 * only
 * practitioner. If every paid client gifts one, paid capacity halves. That
 * is why the three gates below exist, and why they are enforced here rather
 * than in the UI: the cost of a wrongly issued code is not a lost sale, it
 * is a paying client waiting longer.
 */

export type IssueRefusal =
  | "programme_disabled"
  | "not_paid"
  | "already_has_outstanding"
  | "monthly_cap_reached"
  | "no_person_key"
  | "error";

export type IssueResult =
  | { ok: true; code: string; expiresAt: string }
  | { ok: false; refusal: IssueRefusal; message: string };

/*
 * Settings and capacity are NOT defined here any more.
 *
 * There were two copies: a private `getGiftSettings` in this file and a
 * public one in adminCodes.ts, plus two different ways of counting the
 * month. `lib/gifts/giftSettings.ts` is the single source, and it mirrors
 * the database's own cap trigger. Import from there.
 */

/**
 * Issue one gift code for a lead.
 *
 * Refuses rather than throwing, and every refusal names which of the three
 * rules stopped it, because "couldn't issue a code" is not something the
 * studio can act on.
 */
export async function issueGiftCodeForLead(options: {
  leadId: string;
  issuedByUserId: string;
}): Promise<IssueResult> {
  // Gate 0: the programme itself, read from the database — HOTFIX-29 Part 1.
  const settings = await getGiftSettings();
  if (!settings.ok) {
    return {
      ok: false,
      refusal: "error",
      message:
        "Could not read the gift settings, so no code was issued. This is a fault, not a setting — try again.",
    };
  }
  if (!settings.enabled) {
    return {
      ok: false,
      refusal: "programme_disabled",
      message:
        "The gift programme is switched off. Turn it on at Studio → Gift codes.",
    };
  }

  const supabase = createAdminSupabaseClient();

  const { data: lead, error: leadError } = await supabase
    .from("leads")
    .select("id, person_key, payment_status, full_name")
    .eq("id", options.leadId)
    .maybeSingle();

  if (leadError || !lead) {
    console.error("[issueGiftCodeForLead] lead", leadError?.message);
    return { ok: false, refusal: "error", message: "Could not read the client." };
  }

  // Gate 1: only clients who have actually paid.
  if (lead.payment_status !== "verified") {
    return {
      ok: false,
      refusal: "not_paid",
      message: "Only clients with a verified payment can gift an assessment.",
    };
  }

  // Identity is what "one outstanding gift per person" is measured against,
  // so without it the rule cannot be enforced and no code is issued.
  if (!lead.person_key) {
    return {
      ok: false,
      refusal: "no_person_key",
      message:
        "This client has no resolved identity (no phone or email), so the one-gift-per-person rule cannot be applied.",
    };
  }

  // Gate 2: one outstanding gift per person — unexpired and unused.
  const { data: outstanding, error: outstandingError } = await supabase
    .from("gift_codes")
    .select("code")
    .eq("issued_to_person", lead.person_key)
    .eq("active", true)
    .lt("uses_count", 1)
    .gt("expires_at", new Date().toISOString())
    .limit(1);

  if (outstandingError) {
    console.error("[issueGiftCodeForLead] outstanding", outstandingError.message);
    return { ok: false, refusal: "error", message: "Could not check existing codes." };
  }
  if ((outstanding ?? []).length > 0) {
    return {
      ok: false,
      refusal: "already_has_outstanding",
      message: `This client already has an unused gift code (${outstanding![0].code}).`,
    };
  }

  /*
   * Gate 3: the monthly cap — advisory here, enforced by the database.
   *
   * A null cap means unlimited, so there is nothing to compare against.
   * This check exists to give a useful message before the insert; the
   * trigger is what actually stops it, and it counts for itself, so a race
   * between two issuers cannot slip past.
   */
  const capacity = await getGiftCapacity();
  if (
    capacity.cap != null &&
    capacity.used != null &&
    capacity.used >= capacity.cap
  ) {
    return {
      ok: false,
      refusal: "monthly_cap_reached",
      message: `The monthly limit of ${capacity.cap} gift codes has been reached. Raise or clear it at Studio → Gift codes.`,
    };
  }
  const expiryDays = settings.expiryDays;

  const expiresAt = new Date(
    Date.now() + expiryDays * 24 * 60 * 60 * 1000,
  ).toISOString();

  // Retry on the unique constraint rather than trusting 10^15 blindly.
  for (let attempt = 0; attempt < 5; attempt += 1) {
    // One generator, and it lives in the database — see giftCodes.ts.
    const { data: generated, error: genError } = await supabase.rpc(
      "generate_gift_code",
    );
    if (genError || typeof generated !== "string") {
      console.error("[issueGiftCodeForLead] generate", genError?.message);
      return { ok: false, refusal: "error", message: "Could not create a code." };
    }
    const code = generated;
    const { error } = await supabase.from("gift_codes").insert({
      code,
      kind: "gift",
      issued_to_lead: options.leadId,
      issued_to_person: lead.person_key,
      // HANDOVER-27 §1.1 — grant the plan that exists. This granted
      // "clarity", which is retired: every code issued after the migration
      // would have entitled someone to a plan they cannot select, and the
      // funnel would have had nothing to apply it to.
      grants_plan: PAID_PLAN_KEY,
      discount_pct: 100,
      max_uses: 1,
      uses_count: 0,
      expires_at: expiresAt,
      active: true,
      issued_by: options.issuedByUserId,
    });

    if (!error) {
      return { ok: true, code, expiresAt };
    }
    // 23505 is unique_violation — the only error worth retrying.
    if (error.code !== "23505") {
      console.error("[issueGiftCodeForLead] insert", error.message);
      return { ok: false, refusal: "error", message: "Could not create the code." };
    }
  }

  return {
    ok: false,
    refusal: "error",
    message: "Could not create a unique code. Try again.",
  };
}

/**
 * Validate a code as it is typed.
 *
 * Wraps the database function rather than reimplementing its rules — it is
 * the same function the redemption trigger consults, so the message shown
 * while typing cannot disagree with what happens on submit.
 *
 * `personKey` is optional because at the moment of typing we usually do not
 * know who the visitor is yet. Passing an empty string simply means the
 * self-redemption check cannot fire, and it fires again at insert time,
 * where identity is known.
 */
export async function checkGiftCode(
  rawCode: string,
  personKey: string | null,
  /**
   * Who is asking, for the database's own rate limit. An IP is the usual
   * value from the funnel. Falls back to `personKey`, then to a shared
   * "anonymous" bucket inside the function — which is why passing something
   * here matters: without it every anonymous visitor shares one counter and
   * eight failures anywhere lock out everyone.
   */
  attemptKey?: string | null,
): Promise<GiftCheckResult> {
  const code = normaliseGiftCode(rawCode);
  if (!code) {
    return { valid: false, reason: "not_found", grantsPlan: null, discountPct: null };
  }

  const supabase = await createServerSupabaseClient();
  /*
   * The THREE-argument overload, deliberately.
   *
   * `check_gift_code` exists twice in the database. The two-argument version
   * is the original and is strictly weaker: no rate limiting, no attempt
   * log, and it cannot return `already_gifted` or `plan_unavailable`. This
   * code called it, so the one-gift-per-person rule and the retired-plan
   * check were enforced only at insert time — a person could be told their
   * code was fine and refused at the end.
   *
   * PostgREST selects the overload by the argument NAMES supplied, so
   * passing `p_attempt_key` is what picks this one. Dropping that key
   * silently falls back to the weak version.
   */
  const { data, error } = await supabase
    .rpc("check_gift_code", {
      p_code: code,
      p_person_key: personKey ?? "",
      p_attempt_key: attemptKey ?? personKey ?? "",
    })
    .maybeSingle();

  if (error) {
    console.error("[checkGiftCode]", error.message);
    return { valid: false, reason: "not_found", grantsPlan: null, discountPct: null };
  }

  const row = data as unknown as {
    valid: boolean;
    reason: string;
    grants_plan: string | null;
    discount_pct: number | string | null;
  } | null;

  if (!row) {
    return { valid: false, reason: "not_found", grantsPlan: null, discountPct: null };
  }

  return {
    valid: Boolean(row.valid),
    reason: isGiftCheckReason(row.reason) ? row.reason : "not_found",
    grantsPlan: row.grants_plan,
    // numeric comes back as a string over the wire.
    discountPct: row.discount_pct === null ? null : Number(row.discount_pct),
  };
}

export type GiftCodeRow = {
  code: string;
  kind: string;
  grantsPlan: string;
  discountPct: number;
  usesCount: number;
  maxUses: number;
  expiresAt: string;
  active: boolean;
  createdAt: string;
  issuedToLead: string | null;
  issuedToPerson: string | null;
  /** Why it was issued. Only staff see this. */
  note: string | null;
  issuedBy: string | null;
};

export type GiftCodeState = "redeemed" | "expired" | "inactive" | "outstanding";

/** The state as a person would describe it, in priority order. */
export function giftCodeState(row: GiftCodeRow): GiftCodeState {
  if (row.usesCount >= row.maxUses) return "redeemed";
  if (!row.active) return "inactive";
  if (new Date(row.expiresAt).getTime() < Date.now()) return "expired";
  return "outstanding";
}

export async function listGiftCodes(): Promise<GiftCodeRow[]> {
  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase
    .from("gift_codes")
    .select(
      "code, kind, grants_plan, discount_pct, uses_count, max_uses, expires_at, active, created_at, issued_to_lead, issued_to_person, note, issued_by",
    )
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[listGiftCodes]", error.message);
    return [];
  }

  return (data ?? []).map((row) => ({
    code: row.code,
    kind: row.kind,
    grantsPlan: row.grants_plan,
    discountPct: Number(row.discount_pct),
    usesCount: row.uses_count,
    maxUses: row.max_uses,
    expiresAt: row.expires_at,
    active: row.active,
    createdAt: row.created_at,
    issuedToLead: row.issued_to_lead,
    issuedToPerson: row.issued_to_person,
    note: row.note,
    issuedBy: row.issued_by,
  }));
}

/** The outstanding, unused, unexpired code for a person — for the lead page. */
export async function getOutstandingGiftCode(
  personKey: string | null,
): Promise<string | null> {
  if (!personKey) return null;

  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase
    .from("gift_codes")
    .select("code")
    .eq("issued_to_person", personKey)
    .eq("active", true)
    .lt("uses_count", 1)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("[getOutstandingGiftCode]", error.message);
    return null;
  }
  return data?.code ?? null;
}
