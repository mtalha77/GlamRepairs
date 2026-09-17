import { clientNotesFromAnswers } from "@/lib/funnel/clientNotes";
import { sanitizeLeadAnswers } from "@/lib/leads/sanitizeLeadAnswers";
import type { LeadSubmitPayload } from "@/types/lead";

const PHOTO_TTL_DAYS = 30;

export type InsertLeadInput = LeadSubmitPayload & {
  imageUrls: string[];
  photoPaths: string[];
};

export type InsertLeadResult = {
  leadId: string;
  photosExpireAt: string | null;
  /*
   * HANDOVER-28 §1.1 — read back from the row the TRIGGERS produced, not
   * from anything the browser sent.
   *
   * The completion screen has to know whether a gift code actually applied,
   * and it cannot work that out for itself: the funnel store knows a code
   * was typed, but only `lead_zz_gift_redeem` knows whether it was valid,
   * unused, not self-redeemed and for a live plan. Both writes already use
   * `return=representation`, so this costs nothing beyond two more columns
   * in the select.
   */
  paymentStatus: string | null;
  finalPrice: number | string | null;
};

/** What both write paths read back, after the triggers have run. */
type LeadWriteRow = {
  id: string;
  photos_expire_at: string | null;
  payment_status: string | null;
  final_price: number | string | null;
};

export type FunnelProgressInput = {
  sessionId: string;
  fullName?: string | null;
  email?: string | null;
  /** As typed. The DB trigger owns phone_e164 — never normalise here. */
  phone?: string | null;
  selectedPlan?: string | null;
  planName?: string | null;
  planPrice?: string | null;
  answers?: Record<string, unknown>;
  funnelStep?: number | null;
  /**
   * HANDOVER-18 §2 — the client's own words from the photo step. Stored raw;
   * `leads_for_practitioner` serves the redacted version.
   */
  clientNotes?: string | null;
  /**
   * HANDOVER-20 Part 2. Written to `gift_code_used`; the `lead_gift_redeem`
   * trigger validates it, increments `uses_count` atomically, and on a 100%
   * gift forces the plan and zeroes the price. An invalid code is silently
   * dropped and grants nothing, so this is safe to write unvalidated.
   */
  giftCode?: string | null;
};

function restConfig() {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!base || !key) return null;
  return { base, key };
}

function restHeaders(key: string, prefer?: string) {
  return {
    Authorization: `Bearer ${key}`,
    apikey: key,
    "Content-Type": "application/json",
    ...(prefer ? { Prefer: prefer } : {}),
  };
}

async function findLeadBySession(sessionId: string) {
  const config = restConfig();
  if (!config) return null;

  const response = await fetch(
    `${config.base}/rest/v1/leads?session_id=eq.${encodeURIComponent(sessionId)}&select=id,photos_expire_at,funnel_complete&limit=1`,
    { headers: restHeaders(config.key) },
  );

  if (!response.ok) return null;
  const rows = (await response.json()) as Array<{
    id: string;
    photos_expire_at: string | null;
    funnel_complete?: boolean;
  }>;
  return rows[0] ?? null;
}

export async function saveFunnelProgress(input: FunnelProgressInput) {
  const config = restConfig();
  if (!config) return null;

  const existing = await findLeadBySession(input.sessionId);
  if (existing?.funnel_complete) {
    return existing.id;
  }

  /*
   * HANDOVER-28 §2.2 — "Never send a price, a discount percentage or a
   * payment status from the browser."
   *
   * `payment_status: "pending"` used to be on this object, and this object is
   * reused for BOTH the insert and the PATCH below. That combination
   * destroyed redeemed gifts, which I reproduced against the real database
   * before removing it:
   *
   *   after insert            payment_status=waived   final_price=0.00
   *   after one funnel step   payment_status=pending  final_price=3000.00
   *
   * Two things did it together. Resending `payment_status` overwrote the
   * `waived` that `lead_zz_gift_redeem` had just set. And resending
   * `plan_price` re-fired `lead_price_compute`, which is
   * BEFORE INSERT OR UPDATE OF plan_price, list_price, is_member_booking and
   * recomputes `final_price` unconditionally — while `lead_zz_gift_redeem`
   * is BEFORE INSERT ONLY, so nothing re-applied the gift afterwards.
   *
   * The §1.1 showBankDetails rule cannot catch this: after the second write
   * the row genuinely IS pending with a non-zero price, so the client is
   * shown the bank block and charged in full for an assessment they were
   * gifted.
   *
   * The column defaults to 'pending', so dropping it here loses nothing on
   * insert and stops the clobber on update. Price fields are omitted from
   * the update for the same reason — see `updatableRow` below.
   */
  const row = {
    session_id: input.sessionId,
    full_name: input.fullName?.trim() || null,
    email: input.email?.trim() || null,
    // Raw, exactly as the client typed it. A database trigger derives
    // phone_e164 on every insert and update, so the app must not parse or
    // reformat here — doing so would give one number two sources of truth.
    phone: input.phone?.trim() || null,
    selected_plan: input.selectedPlan ?? null,
    plan_name: input.planName ?? null,
    plan_price: input.planPrice ?? null,
    answers: sanitizeLeadAnswers(input.answers),
    // Trimmed but otherwise untouched. Redaction happens in the view, not
    // here — the raw text is what a super admin needs to read, and losing it
    // on write would be unrecoverable.
    client_notes:
      input.clientNotes?.trim() || clientNotesFromAnswers(input.answers),
    gift_code_used: input.giftCode?.trim() || null,
    status: "new",
    source: "funnel",
    funnel_complete: false,
    funnel_step: input.funnelStep ?? null,
    /**
     * HANDOVER-15 §0 — the fix that makes abandonment recovery work at all.
     *
     * This row object is used for BOTH the insert and the update below, so
     * stamping it here means every step transition refreshes the timestamp,
     * not just the first save. Before this, `last_seen_at` was null on all
     * three real abandoned leads: the recovery cron filters on it, the studio
     * sorts by it, and `leads_abandoned_idx` indexes it, so a null made every
     * one of them inert.
     *
     * `updated_at` is not a substitute. It moves for any write, including
     * staff edits in the studio, so it cannot answer "when did the client
     * last touch the funnel" — which is the only question recovery asks.
     */
    last_seen_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  /**
   * The insert row minus the fields the DATABASE owns once the row exists.
   *
   * `plan_price` is the only one today, and it is here because
   * `lead_price_compute` watches it (see the PATCH below). Anything else
   * that a trigger derives should be added here rather than being resent on
   * every funnel step — a progressive save is meant to record what the
   * client typed, not to restate what the database computed.
   */
  const updatableRow: Partial<typeof row> = { ...row };
  delete updatableRow.plan_price;

  if (existing) {
    const response = await fetch(
      `${config.base}/rest/v1/leads?id=eq.${existing.id}`,
      {
        method: "PATCH",
        headers: restHeaders(config.key),
        /*
         * `plan_price` is deliberately NOT resent on update.
         *
         * `lead_price_compute` fires on UPDATE OF plan_price, so including
         * it makes every funnel step recompute `final_price` from
         * `list_price` — wiping any gift or promo the row already carries,
         * with no trigger left to re-apply it. The price the client sees is
         * resolved server-side per request anyway; the row does not need it
         * restated on every step.
         */
        body: JSON.stringify(updatableRow),
      },
    );
    if (!response.ok) {
      console.error("[saveFunnelProgress] update", response.status);
      return null;
    }
    return existing.id;
  }

  const response = await fetch(`${config.base}/rest/v1/leads?select=id`, {
    method: "POST",
    headers: restHeaders(config.key, "return=representation"),
    body: JSON.stringify({
      ...row,
      image_urls: [],
      photo_paths: [],
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    console.error("[saveFunnelProgress] insert", response.status, detail);
    return null;
  }

  const rows = (await response.json()) as Array<{ id: string }>;
  return rows[0]?.id ?? null;
}

/**
 * Insert or update a durable lead row. Photo files expire later; this row stays.
 */
export async function insertLead(
  input: InsertLeadInput,
): Promise<InsertLeadResult | null> {
  const config = restConfig();
  if (!config) return null;

  const photosExpireAt =
    input.photoPaths.length > 0
      ? new Date(Date.now() + PHOTO_TTL_DAYS * 24 * 60 * 60 * 1000).toISOString()
      : null;

  const row = {
    session_id: input.sessionId,
    full_name: input.fullName ?? null,
    email: input.email ?? null,
    selected_plan: input.selectedPlan ?? null,
    plan_name: input.planName ?? null,
    plan_price: input.planPrice ?? null,
    // HOTFIX-7 §1 — record what was quoted, not what the server would
    // guess now. list_price feeds the existing member-discount trigger;
    // pricing_region/currency are what a revenue report groups by.
    pricing_region: input.pricingRegion ?? null,
    currency: input.currency ?? null,
    list_price: input.listPrice ?? null,
    answers: sanitizeLeadAnswers(input.answers),
    // Derived from the answers blob because `sanitizeLeadAnswers` strips it
    // out of there (see that file) — without this the completed submission
    // would silently drop a note the progressive save had already stored.
    client_notes: clientNotesFromAnswers(input.answers),
    gift_code_used: input.giftCode?.trim() || null,
    image_urls: input.imageUrls,
    photo_paths: input.photoPaths,
    photos_expire_at: photosExpireAt,
    photos_deleted_at: null,
    status: "new",
    source: "funnel" as const,
    payment_status: "pending" as const,
    funnel_complete: true,
    updated_at: new Date().toISOString(),
  };

  const existing = await findLeadBySession(input.sessionId);
  if (existing) {
    const response = await fetch(
      `${config.base}/rest/v1/leads?id=eq.${existing.id}&select=id,photos_expire_at,payment_status,final_price`,
      {
        method: "PATCH",
        headers: restHeaders(config.key, "return=representation"),
        body: JSON.stringify(row),
      },
    );
    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      console.error("[insertLead] update", response.status, detail);
      return null;
    }
    const rows = (await response.json()) as Array<LeadWriteRow>;
    const lead = rows[0];
    if (!lead) {
      return {
        leadId: existing.id,
        photosExpireAt,
        paymentStatus: null,
        finalPrice: null,
      };
    }
    return {
      leadId: lead.id,
      photosExpireAt: lead.photos_expire_at,
      paymentStatus: lead.payment_status,
      finalPrice: lead.final_price,
    };
  }

  const response = await fetch(
    `${config.base}/rest/v1/leads?select=id,photos_expire_at,payment_status,final_price`,
    {
      method: "POST",
      headers: restHeaders(config.key, "return=representation"),
      body: JSON.stringify(row),
    },
  );

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    console.error("[insertLead] Failed:", response.status, detail);
    return null;
  }

  const rows = (await response.json()) as Array<LeadWriteRow>;

  const lead = rows[0];
  if (!lead) return null;

  return {
    leadId: lead.id,
    photosExpireAt: lead.photos_expire_at,
    paymentStatus: lead.payment_status,
    finalPrice: lead.final_price,
  };
}
