import { formatRegionPrice, type PricingRegion } from "@/lib/pricing/regions";

export type ComparisonCell =
  | { type: "check" }
  | { type: "empty" }
  | { type: "text"; value: string };

export type ComparisonRow = {
  feature: string;
  values: [ComparisonCell, ComparisonCell, ComparisonCell];
};

export const comparisonHeaders = [
  "Features",
  "Skin Starter",
  "Skin Clarity",
  "Skin Transform",
] as const;

// HOTFIX-7 §1: the Price row is region-dependent, so it's built at render
// time from buildComparisonRows(region) rather than hardcoded here — see
// FeaturesComparisonSection.tsx.
const staticComparisonRows: ComparisonRow[] = [
  {
    feature: "Skin quiz & type assessment",
    values: [{ type: "check" }, { type: "check" }, { type: "check" }],
  },
  {
    feature: "Generic routine guide",
    values: [{ type: "check" }, { type: "empty" }, { type: "empty" }],
  },
  {
    feature: "Photo upload",
    values: [
      { type: "empty" },
      { type: "text", value: "Up to 3" },
      { type: "text", value: "Up to 6" },
    ],
  },
  {
    feature: "Expert manual review",
    values: [
      { type: "empty" },
      { type: "text", value: "24 hrs" },
      { type: "text", value: "24 hrs" },
    ],
  },
  {
    feature: "Written skin report",
    values: [
      { type: "empty" },
      { type: "check" },
      { type: "text", value: "Detailed" },
    ],
  },
  {
    feature: "AM + PM routine",
    values: [{ type: "empty" }, { type: "check" }, { type: "check" }],
  },
  {
    feature: "Ingredient & product guidance",
    values: [
      { type: "empty" },
      { type: "check" },
      { type: "text", value: "Multi Budget" },
    ],
  },
  {
    feature: "What to avoid list",
    values: [{ type: "empty" }, { type: "check" }, { type: "check" }],
  },
  {
    feature: "Week-by-week plan",
    values: [{ type: "empty" }, { type: "empty" }, { type: "check" }],
  },
  {
    feature: "Vitamin & supplement guide",
    values: [{ type: "empty" }, { type: "empty" }, { type: "check" }],
  },
  {
    feature: "Life style & diet tips",
    values: [{ type: "empty" }, { type: "empty" }, { type: "check" }],
  },
  {
    feature: "Aesthetic procedure roadmap",
    values: [
      { type: "empty" },
      { type: "text", value: "1 (at two weeks)" },
      { type: "text", value: "2 (biweekly, 1 monthly)" },
    ],
  },
  {
    feature: "Follow-up check-ins",
    values: [{ type: "empty" }, { type: "empty" }, { type: "check" }],
  },
];

export function buildComparisonRows(region: PricingRegion): ComparisonRow[] {
  const priceRow: ComparisonRow = {
    feature: "Price",
    values: [
      { type: "text", value: "Free" },
      { type: "text", value: formatRegionPrice(region, "clarity") },
      { type: "text", value: formatRegionPrice(region, "transform") },
    ],
  };
  return [priceRow, ...staticComparisonRows];
}
