import "server-only";

import { createAdminSupabaseClient } from "@/lib/supabase/admin";

/**
 * The two admin views — HOTFIX-29 §2.3 and §3.3.
 *
 * `state` is computed in the database, not here. A code's state is derived
 * from four facts (active, expiry, uses, max uses) and deriving it in two
 * places is how a list and a detail screen end up disagreeing about whether
 * a code is usable.
 */

export type GiftCodeState =
  | "available"
  | "redeemed"
  | "expired"
  | "deactivated";

export function isGiftCodeState(v: string): v is GiftCodeState {
  return (
    v === "available" || v === "redeemed" || v === "expired" || v === "deactivated"
  );
}

export type AdminGiftCode = {
  code: string;
  kind: string;
  batchLabel: string | null;
  recipient: string | null;
  grantsPlan: string;
  discountPct: number;
  usesCount: number;
  maxUses: number;
  expiresAt: string;
  createdAt: string;
  note: string | null;
  state: GiftCodeState;
  redeemedByLead: string | null;
  redeemedAt: string | null;
};

export type AdminGiftBatch = {
  batchLabel: string | null;
  issuedOn: string | null;
  codes: number;
  redeemed: number;
  available: number;
  recipient: string | null;
  redemptionPct: number | null;
};

export type CodeFilters = {
  /** Blank or "all" shows everything. */
  state?: string;
  /** Matches code, batch label or recipient. */
  search?: string;
  limit?: number;
};

export async function listGiftBatches(): Promise<AdminGiftBatch[]> {
  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase
    .from("gift_batches_admin")
    .select(
      "batch_label, issued_on, codes, redeemed, available, recipient, redemption_pct",
    )
    .order("issued_on", { ascending: false });

  if (error) {
    console.error("[listGiftBatches]", error.message);
    return [];
  }

  return (data ?? []).map((r) => ({
    batchLabel: r.batch_label,
    issuedOn: r.issued_on,
    codes: Number(r.codes),
    redeemed: Number(r.redeemed),
    available: Number(r.available),
    recipient: r.recipient,
    // numeric arrives as a string over PostgREST.
    redemptionPct: r.redemption_pct == null ? null : Number(r.redemption_pct),
  }));
}

export async function listAdminGiftCodes(
  filters: CodeFilters = {},
): Promise<AdminGiftCode[]> {
  const supabase = createAdminSupabaseClient();
  let query = supabase
    .from("gift_codes_admin")
    .select(
      "code, kind, batch_label, recipient, grants_plan, discount_pct, uses_count, max_uses, expires_at, created_at, note, state, redeemed_by_lead, redeemed_at",
    )
    .order("created_at", { ascending: false })
    .limit(filters.limit ?? 500);

  if (filters.state && isGiftCodeState(filters.state)) {
    query = query.eq("state", filters.state);
  }

  const search = filters.search?.trim();
  if (search) {
    /*
     * Escaped before interpolation. `%` and `,` are both meaningful to
     * PostgREST's `or` filter — a comma would split it into extra
     * conditions, which is a filter-injection bug rather than a cosmetic
     * one. `\` is escaped first so it cannot re-introduce the others.
     */
    const safe = search
      .replace(/\\/g, "\\\\")
      .replace(/[%_]/g, (m) => `\\${m}`)
      .replace(/[(),]/g, " ");
    query = query.or(
      `code.ilike.%${safe}%,batch_label.ilike.%${safe}%,recipient.ilike.%${safe}%`,
    );
  }

  const { data, error } = await query;

  if (error) {
    console.error("[listAdminGiftCodes]", error.message);
    return [];
  }

  return (data ?? []).map((r) => ({
    code: r.code,
    kind: r.kind,
    batchLabel: r.batch_label,
    recipient: r.recipient,
    grantsPlan: r.grants_plan,
    discountPct: Number(r.discount_pct),
    usesCount: Number(r.uses_count),
    maxUses: Number(r.max_uses),
    expiresAt: r.expires_at,
    createdAt: r.created_at,
    note: r.note,
    state: isGiftCodeState(r.state) ? r.state : "available",
    redeemedByLead: r.redeemed_by_lead,
    redeemedAt: r.redeemed_at,
  }));
}

/** Active plans, for the default-plan select. */
export async function listActivePlanKeys(): Promise<
  { planKey: string; label: string }[]
> {
  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase
    .from("plan_settings")
    .select("plan_key, label")
    .eq("active", true)
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("[listActivePlanKeys]", error.message);
    return [];
  }
  return (data ?? []).map((r) => ({ planKey: r.plan_key, label: r.label }));
}
