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
};

export type LeadSubmitSuccess = {
  ok: true;
  leadId: string;
  /** First photo public URL (compat). */
  imageUrl: string | null;
  /** All uploaded photo public URLs for WhatsApp. */
  imageUrls: string[];
};

export type LeadSubmitFailure = {
  ok: false;
  reason: "validation" | "not_configured" | "network" | "unknown";
  message?: string;
};

export type LeadSubmitResult = LeadSubmitSuccess | LeadSubmitFailure;
