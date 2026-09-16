export type LeadSubmitPayload = {
  sessionId: string;
  fullName?: string;
  email?: string;
  selectedPlan?: string | null;
  planName?: string;
  planPrice?: string;
  /**
   * HOTFIX-7 §1 — "record what was quoted". The pricing_regions.code the
   * client resolved (geo or an explicit switcher choice) at the moment of
   * submission, the currency it quoted in, and the regional list price for
   * the selected plan before any member discount. Written verbatim to
   * leads.pricing_region / leads.currency / leads.list_price — never
   * re-derived server-side, since the server's own IP-based guess could
   * differ from what the visitor actually saw and agreed to.
   */
  pricingRegion?: string;
  currency?: string;
  listPrice?: number;
  /** @deprecated Prefer photoDataUrls — kept for older callers. */
  selfieDataUrl?: string | null;
  /** All assessment photos as compressed JPEG/PNG data URLs. */
  photoDataUrls?: string[];
  answers?: Record<string, unknown>;
  /**
   * HANDOVER-20 Part 2 — a gift code claimed by this submission. Validated
   * and redeemed by a database trigger, never trusted from the client.
   */
  giftCode?: string | null;
};

export type LeadSubmitSuccess = {
  ok: true;
  leadId: string;
  /** First photo public URL (compat). */
  imageUrl: string | null;
  /** All uploaded photo public URLs for WhatsApp. */
  imageUrls: string[];
  /**
   * HANDOVER-28 §1.1/§2.3 — decided on the SERVER, from the row the
   * triggers produced, and sent as booleans rather than as raw fields.
   *
   * The completion screen cannot work this out for itself. The funnel store
   * knows a gift code was typed; only `lead_zz_gift_redeem` knows whether it
   * was valid, unused, not self-redeemed and for a plan still on sale. And
   * shipping `payment_status` and `final_price` to the browser to re-derive
   * the rule there would be a fifth copy of it.
   */
  payment: {
    /** Gate the bank block, IBAN, copy buttons and screenshot request. */
    showBankDetails: boolean;
    /** A gift covered the whole assessment. */
    isGifted: boolean;
  };
};

export type LeadSubmitFailure = {
  ok: false;
  reason: "validation" | "not_configured" | "network" | "unknown";
  message?: string;
};

export type LeadSubmitResult = LeadSubmitSuccess | LeadSubmitFailure;
