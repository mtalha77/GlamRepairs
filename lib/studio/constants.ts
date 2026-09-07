export const CUSTOMER_STATUSES = [
  "new",
  "reviewing",
  "contacted",
  "done",
] as const;

export const CUSTOMER_STATUS_LABELS: Record<
  (typeof CUSTOMER_STATUSES)[number],
  string
> = {
  new: "New",
  reviewing: "Reviewing",
  contacted: "Contacted",
  done: "Done",
};

export const PAYMENT_STATUS_LABELS: Record<
  "pending" | "verified",
  string
> = {
  pending: "Payment pending",
  verified: "Payment verified",
};

export const REVIEW_DECISIONS = [
  "ready_for_report",
  "need_more_photos",
  "not_suitable",
] as const;

export const REVIEW_DECISION_LABELS: Record<
  (typeof REVIEW_DECISIONS)[number],
  string
> = {
  ready_for_report: "Ready for report",
  need_more_photos: "Need more photos",
  not_suitable: "Not suitable for a remote plan",
};

// HOTFIX-7 §1: names/ids only. Price used to be hardcoded here and got
// stale the moment PK pricing changed (1,500 → 2,000, 3,000 → 3,500) — it
// now lives in public.pricing_regions (lib/pricing/regions.ts). The two
// call sites that used to read .price here (NewCustomerForm.tsx,
// createCustomerAction in actions.ts) resolve the studio's own region
// (PK — this business is Pakistan-run) live instead.
export const PLAN_OPTIONS = [
  { id: "free", name: "Skin Starter" },
  { id: "clarity", name: "Clarity" },
  { id: "transform", name: "Transform" },
] as const;
