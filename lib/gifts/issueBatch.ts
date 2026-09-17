import "server-only";

import { createAdminSupabaseClient } from "@/lib/supabase/admin";

/**
 * Generating a batch of codes — HOTFIX-29 §2.2 and §3.2.
 *
 * Generating one code and generating fifty are the same call, which is why
 * there is no separate "issue one" path: a batch of one is a batch.
 *
 * ── Why the errors are matched on their text ─────────────────────────────
 * `issue_gift_codes` validates only `p_count`. The gift toggle, the monthly
 * cap and the retired-plan check are TRIGGERS on `gift_codes`, so they raise
 * during the insert rather than returning a value — and two of them raise
 * errcodes that mean something else in every other context:
 *
 *   cap raises 23505, the same code as a genuine unique violation
 *   toggle and plan guard raise 23514, the same as any CHECK failure
 *
 * So the errcode cannot identify them and the message must. These strings
 * are matched against the live trigger sources; if those change, this
 * breaks loudly into "could not generate" rather than silently mislabelling,
 * which is the failure direction to prefer.
 *
 * The trigger messages are surfaced VERBATIM where they already say the
 * useful thing — the cap message names both numbers and says where to change
 * them, which is better than anything this layer could write.
 */

export type IssueBatchInput = {
  count: number;
  batchLabel: string;
  kind: "gift" | "referral" | "promo";
  discountPct: number;
  /** Blank uses pricing_settings.gift_default_plan. */
  grantsPlan?: string | null;
  /** Blank uses pricing_settings.gift_expiry_days. */
  expiresDays?: number | null;
  recipient?: string | null;
  note?: string | null;
  issuedBy?: string | null;
};

export type IssuedCode = { code: string; expiresAt: string };

export type IssueBatchResult =
  | { ok: true; codes: IssuedCode[] }
  | { ok: false; error: string };

export async function issueBatch(
  input: IssueBatchInput,
): Promise<IssueBatchResult> {
  const count = Number(input.count);
  if (!Number.isInteger(count) || count < 1 || count > 500) {
    return { ok: false, error: "Generate between 1 and 500 codes at a time." };
  }

  const batchLabel = input.batchLabel.trim();
  if (!batchLabel) {
    /*
     * Required, and worth being strict about. Without a label you cannot
     * tell later which collaboration drove anything, and tracking codes has
     * no other purpose — an unlabelled batch is a cost with no reporting.
     */
    return {
      ok: false,
      error: "Give the batch a label, so you can tell later where these codes went.",
    };
  }

  const discountPct = Number(input.discountPct);
  if (!Number.isFinite(discountPct) || discountPct < 1 || discountPct > 100) {
    return { ok: false, error: "Discount must be between 1 and 100 percent." };
  }

  const expiresDays =
    input.expiresDays == null || Number.isNaN(input.expiresDays)
      ? null
      : Number(input.expiresDays);
  if (
    expiresDays != null &&
    (!Number.isInteger(expiresDays) || expiresDays < 1 || expiresDays > 3650)
  ) {
    return { ok: false, error: "Valid for must be between 1 and 3650 days, or blank." };
  }

  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase.rpc("issue_gift_codes", {
    p_count: count,
    p_batch_label: batchLabel,
    p_kind: input.kind,
    p_discount_pct: discountPct,
    p_grants_plan: input.grantsPlan?.trim() || null,
    p_expires_days: expiresDays,
    p_recipient: input.recipient?.trim() || null,
    p_note: input.note?.trim() || null,
    p_issued_by: input.issuedBy || null,
  });

  if (error) {
    const message = error.message ?? "";

    if (message.includes("gift programme is switched off")) {
      return {
        ok: false,
        error:
          "The gift programme is switched off, so no codes were created. Turn it on above and try again.",
      };
    }
    if (message.includes("Monthly gift code limit reached")) {
      return { ok: false, error: message };
    }
    if (message.includes("which is not currently offered")) {
      return {
        ok: false,
        error:
          "These codes would grant a plan that is no longer offered. Pick an active plan, or clear the field to use the default.",
      };
    }
    if (message.includes("p_count must be between")) {
      return { ok: false, error: "Generate between 1 and 500 codes at a time." };
    }

    console.error("[issueBatch]", message);
    return { ok: false, error: "Could not generate the codes." };
  }

  const rows = (data ?? []) as { code: string; expires_at: string }[];
  if (!rows.length) {
    // The function returns what it inserted, so an empty result means the
    // insert did not happen — never report that as success.
    return { ok: false, error: "No codes were created. Nothing has changed." };
  }

  return {
    ok: true,
    codes: rows.map((r) => ({ code: r.code, expiresAt: r.expires_at })),
  };
}

/** Kills a whole batch. Already-redeemed codes are left alone. */
export async function deactivateBatch(
  batchLabel: string,
): Promise<{ ok: boolean; count?: number; error?: string }> {
  const label = batchLabel.trim();
  if (!label) return { ok: false, error: "No batch given." };

  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase.rpc("deactivate_gift_batch", {
    p_batch_label: label,
  });

  if (error) {
    console.error("[deactivateBatch]", error.message);
    return { ok: false, error: "Could not deactivate that batch." };
  }
  return { ok: true, count: Number(data ?? 0) };
}
