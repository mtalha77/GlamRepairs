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
    status: "new",
    source: "funnel",
    payment_status: "pending",
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

  if (existing) {
    const response = await fetch(
      `${config.base}/rest/v1/leads?id=eq.${existing.id}`,
      {
        method: "PATCH",
        headers: restHeaders(config.key),
        body: JSON.stringify(row),
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
      `${config.base}/rest/v1/leads?id=eq.${existing.id}&select=id,photos_expire_at`,
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
    const rows = (await response.json()) as Array<{
      id: string;
      photos_expire_at: string | null;
    }>;
    const lead = rows[0];
    if (!lead) return { leadId: existing.id, photosExpireAt };
    return { leadId: lead.id, photosExpireAt: lead.photos_expire_at };
  }

  const response = await fetch(
    `${config.base}/rest/v1/leads?select=id,photos_expire_at`,
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

  const rows = (await response.json()) as Array<{
    id: string;
    photos_expire_at: string | null;
  }>;

  const lead = rows[0];
  if (!lead) return null;

  return {
    leadId: lead.id,
    photosExpireAt: lead.photos_expire_at,
  };
}
