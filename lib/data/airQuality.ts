import "server-only";

/**
 * HANDOVER-38 — the verified air-quality figures, as data.
 *
 * ── Why a module and not a JSON file ─────────────────────────────────────
 * §38 refers to a `dataset.json` that is not in this repository. The
 * figures themselves are in the handover, so they are transcribed here
 * instead — and typed, which a JSON file could not be. Every series
 * carries its unit and its source as required fields, so the §6 checklist
 * items "every chart title and figcaption names its unit and its source"
 * and "no chart mixes AQI with micrograms" are enforced by the compiler
 * rather than remembered by whoever edits next.
 *
 * ── The two mistakes §3 warns about, prevented structurally ──────────────
 * 1. Units. `Unit` is a closed union and a `Series` has exactly one. A
 *    chart renders one series, so there is no shape in this file that can
 *    express a mixed-unit chart. `AQI` and `PM25` are different quantities
 *    — AQI is a nonlinear transform of concentration — and they are never
 *    interchangeable.
 * 2. Part-years. A `Point` can be `partial`, and a partial point forces an
 *    asterisk and a note wherever it renders. There is no way to add a
 *    2026 point that quietly reads as a full year.
 *
 * ⚠️ Re-verify every March, when the next IQAir World Air Quality Report
 * lands. `verifiedOn` below is what that check updates.
 */

export const DATA_VERIFIED_ON = "2026-09-23";

/**
 * US AQI, or micrograms per cubic metre. Never both on one chart.
 *
 * `label` is what appears in the chart subtitle and the axis note. It is
 * spelled out rather than abbreviated because "µg/m³" beside "AQI" is
 * exactly the confusion §3.1 is about.
 */
export type Unit = "aqi" | "pm25";

export const UNIT_LABEL: Record<Unit, string> = {
  aqi: "US AQI",
  pm25: "Micrograms per cubic metre",
};

export type Point = {
  label: string;
  value: number;
  /** A second bar in the same group, e.g. the year's best month. */
  secondary?: { label: string; value: number };
  /** Sub-label under the bar, e.g. which month the value came from. */
  note?: string;
  /**
   * True when the point covers less than the period the others cover.
   * Forces an asterisk on the label and a note under the chart — §3.2.
   */
  partial?: boolean;
};

export type Series = {
  id: string;
  title: string;
  subtitle: string;
  unit: Unit;
  source: string;
  points: Point[];
  /** Explains every asterisk in `points`. Required when any point is partial. */
  partialNote?: string;
  /** Extra sentence under the figure, e.g. a cross-check against the publisher. */
  caption?: string;
};

/**
 * US EPA AQI categories.
 *
 * ── Boundaries are the EPA's, not the preview's ──────────────────────────
 * §4a is explicit that the brand palette gives way here, "because
 * inventing our own colours for a standard scale would be misleading". The
 * supplied preview drew its bands at 51 / 102 / 153 / 204 and named the
 * third one "Poor". Those are neither the EPA's boundaries (50 / 100 / 150
 * / 200 / 300) nor its names — 101–150 is "Unhealthy for Sensitive
 * Groups". Using the real boundaries and the real names is the same
 * argument §4a makes: a standard scale is only useful if it is the
 * standard one.
 *
 * The hues are the preview's softened versions rather than the EPA's
 * saturated primaries, which keeps the page readable beside the brand
 * without changing what any band means or where it starts.
 */
export type AqiBand = {
  name: string;
  from: number;
  to: number;
  colour: string;
};

export const AQI_BANDS: AqiBand[] = [
  { name: "Good", from: 0, to: 50, colour: "#4fae6b" },
  { name: "Moderate", from: 50, to: 100, colour: "#a9c74f" },
  { name: "Unhealthy for sensitive groups", from: 100, to: 150, colour: "#e8b23a" },
  { name: "Unhealthy", from: 150, to: 200, colour: "#dd7b3b" },
  { name: "Very unhealthy", from: 200, to: 300, colour: "#c4483f" },
  { name: "Hazardous", from: 300, to: 500, colour: "#7e4a63" },
];

export function bandForAqi(value: number): AqiBand {
  return (
    AQI_BANDS.find((b) => value > b.from && value <= b.to) ?? AQI_BANDS[0]
  );
}

const AQI_IN = "aqi.in monthly and annual analysis, Lahore, retrieved 23 September 2026";

/* ── The series ──────────────────────────────────────────────────────── */

/**
 * §4a's primary chart, and the reason the whole document argues for
 * monthly over yearly: an annual mean of 115 destroys the fact that
 * January is 182 and April is 84. Lahore does not have an air quality
 * problem, it has an air quality season.
 */
const LAHORE_MONTHLY_2026: Series = {
  id: "lahore-monthly-2026",
  title: "Lahore monthly mean, January to September 2026",
  subtitle: "Background bands are the US EPA category thresholds.",
  unit: "aqi",
  source: AQI_IN,
  points: [
    { label: "Jan", value: 182 },
    { label: "Feb", value: 159 },
    { label: "Mar", value: 118 },
    { label: "Apr", value: 84 },
    { label: "May", value: 101 },
    { label: "Jun", value: 100 },
    { label: "Jul", value: 104 },
    { label: "Aug", value: 87 },
    { label: "Sep", value: 91 },
  ],
  caption:
    "October, November and December have not happened yet, and they are always the worst months of the year.",
};

/** §4a chart 2. 2026 is asterisked because it has no smog season yet. */
const LAHORE_SEASON: Series = {
  id: "lahore-season",
  title: "Worst and best month, each year since 2020",
  subtitle: "Worst month in purple, best month in lavender.",
  unit: "aqi",
  source: AQI_IN,
  points: [
    { label: "2020", value: 288, note: "Dec", secondary: { label: "Aug", value: 82 } },
    { label: "2021", value: 262, note: "Feb", secondary: { label: "Jul", value: 108 } },
    { label: "2022", value: 251, note: "Jan", secondary: { label: "Sep", value: 112 } },
    { label: "2023", value: 218, note: "Dec", secondary: { label: "Jul", value: 69 } },
    { label: "2024", value: 202, note: "Jan", secondary: { label: "Jun", value: 57 } },
    { label: "2025", value: 276, note: "Dec", secondary: { label: "Aug", value: 79 } },
    {
      label: "2026",
      value: 182,
      note: "Jan",
      secondary: { label: "Apr", value: 84 },
      partial: true,
    },
  ],
  partialNote:
    "2026 has no October to December yet, so its peak is not comparable with the others. Compare January to January instead: 182 this year against 202 in 2024 and 251 in 2022.",
};

/**
 * §4a chart 3 — the honest way to place a part-year, by holding the month
 * constant. The cross-check in `caption` is the validation §4a asks to be
 * reproduced whenever this method is reused.
 */
const LAHORE_SEPTEMBER: Series = {
  id: "lahore-september",
  title: "September mean, 2023 to 2026",
  subtitle: "Computed by us from published daily values.",
  unit: "aqi",
  source: AQI_IN,
  points: [
    { label: "2023", value: 81.5 },
    { label: "2024", value: 142.8 },
    { label: "2025", value: 88.9 },
    { label: "2026", value: 90.9, partial: true },
  ],
  partialNote:
    "2023 to 2025 are full 30-day months. 2026 covers 1 to 21 September, 21 days.",
  caption:
    "Our September 2026 figure of 90.9 matches the 91 that aqi.in publishes independently, which is the check that the arithmetic is right.",
};

/**
 * §4.4 — the intra-city spread, and the most useful thing on the page:
 * the honest answer to "what is the air like where I live".
 *
 * ⚠️ Micrograms, NOT AQI. This is the one series on this page in a
 * different unit, which is exactly why `unit` is a required field.
 */
const LAHORE_STATIONS: Series = {
  id: "lahore-stations",
  title: "PM2.5 by Lahore monitoring station, one hour",
  subtitle: "All readings taken at 20:00 on 23 September 2026.",
  unit: "pm25",
  source:
    "Punjab Environmental Protection Agency live dashboard, aqi.punjab.gov.pk",
  points: [
    { label: "Safari Park", value: 127.8 },
    { label: "DHA Phase 6", value: 111.7 },
    { label: "Shahdara", value: 111.3 },
    { label: "Kahna Nau", value: 109.0 },
    { label: "Punjab University", value: 93.8 },
    { label: "Multan Road", value: 93.6 },
    { label: "GT Road", value: 90.1 },
    { label: "Egerton Road", value: 86.7 },
    { label: "Barki Road", value: 81.4 },
    { label: "Wagha Border", value: 56.3 },
  ],
  caption:
    "Safari Park read 127.8 and Wagha Border read 56.3 in the same hour: a 2.27-fold difference inside one city. Presented as a range, never averaged into a single number.",
};

export const SERIES: Record<string, Series> = {
  [LAHORE_MONTHLY_2026.id]: LAHORE_MONTHLY_2026,
  [LAHORE_SEASON.id]: LAHORE_SEASON,
  [LAHORE_SEPTEMBER.id]: LAHORE_SEPTEMBER,
  [LAHORE_STATIONS.id]: LAHORE_STATIONS,
};

export function getSeries(id: string): Series | undefined {
  return SERIES[id];
}
