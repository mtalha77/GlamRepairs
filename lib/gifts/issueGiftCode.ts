import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  generateGiftCode,
  isGiftCheckReason,
  isGiftProgrammeEnabled,
  normaliseGiftCode,
  type GiftCheckResult,
} from "@/lib/gifts/giftCodes";

/**
 * HANDOVER-20 Part 2 — issuing and validating gift codes.
 *
 * ── Capacity is the constraint, not fraud ────────────────────────────────
 * A free Clarity assessment is Rs. 2,000 of Ayma's time and she is the only
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

const DEFAULT_EXPIRY_DAYS = 90;
const DEFAULT_MONTHLY_CAP = 20;

async function getGiftSettings() {
  const supabase = createAdminSupabaseClient();
  const { data } = await supabase
    .from("pricing_settings")
    .select("gift_codes_per_month, gift_expiry_days")
    .limit(1)
    .maybeSingle();

  return {
    cap: data?.gift_codes_per_month ?? DEFAULT_MONTHLY_CAP,
    expiryDays: data?.gift_expiry_days ?? DEFAULT_EXPIRY_DAYS,
  };
}

/** Codes created since the start of the current calendar month. */
export async function countGiftCodesThisMonth(): Promise<number> {
  const supabase = createAdminSupabaseClient();
  const start = new Date();
  start.setUTCDate(1);
  start.setUTCHours(0, 0, 0, 0);

  const { count, error } = await supabase
    .from("gift_codes")
    .select("code", { count: "exact", head: true })
    .eq("kind", "gift")
    .gte("created_at", start.toISOString());

  if (error) {
    console.error("[countGiftCodesThisMonth]", error.message);
    // Report the cap as reached rather than 0. Failing closed here costs a
    // gift code; failing open costs practitioner capacity.
    return Number.MAX_SAFE_INTEGER;
  }
  return count ?? 0;
}

export async function getGiftCapacity() {
  const [{ cap }, used] = await Promise.all([
    getGiftSettings(),
    countGiftCodesThisMonth(),
  ]);
  const safeUsed = used === Number.MAX_SAFE_INTEGER ? cap : used;
  return { cap, used: safeUsed, remaining: Math.max(cap - safeUsed, 0) };
}

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
  // Gate 0: the programme itself. Off until practitioners exist.
  if (!isGiftProgrammeEnabled()) {
    return {
      ok: false,
      refusal: "programme_disabled",
      message:
        "The gift programme is switched off. Turn it on by setting GIFT_PROGRAMME_ENABLED=true once there is more than one practitioner.",
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

  // Gate 3: the monthly cap. Stop rather than queue.
  const { cap, expiryDays } = await getGiftSettings();
  const used = await countGiftCodesThisMonth();
  if (used >= cap) {
    return {
      ok: false,
      refusal: "monthly_cap_reached",
      message: `The monthly limit of ${cap} gift codes has been reached. It resets at the start of next month.`,
    };
  }

  const expiresAt = new Date(
    Date.now() + expiryDays * 24 * 60 * 60 * 1000,
  ).toISOString();

  // Retry on the unique constraint rather than trusting 31^6 blindly.
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const code = generateGiftCode();
    const { error } = await supabase.from("gift_codes").insert({
      code,
      kind: "gift",
      issued_to_lead: options.leadId,
      issued_to_person: lead.person_key,
      grants_plan: "clarity",
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
): Promise<GiftCheckResult> {
  const code = normaliseGiftCode(rawCode);
  if (!code) {
    return { valid: false, reason: "not_found", grantsPlan: null, discountPct: null };
  }

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .rpc("check_gift_code", { p_code: code, p_person_key: personKey ?? "" })
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
      "code, kind, grants_plan, discount_pct, uses_count, max_uses, expires_at, active, created_at, issued_to_lead, issued_to_person",
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
