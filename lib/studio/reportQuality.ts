/**
 * HANDOVER-16 Part 6 — the qualifying criteria, as one shared module.
 *
 * ── Why this is not just a client-side checklist ─────────────────────────
 * The handover says "Block sending until every box passes." A checklist that
 * only lives in the browser is a suggestion: the send action is a server
 * action reachable by a crafted POST, and a disabled submit button is one
 * devtools click away. So the checks live here as pure functions with no
 * React and no Supabase, and both sides call the same `evaluateReport`:
 * the editor to render live ticks, `sendCustomerReportAction` to refuse.
 *
 * Sharing the implementation is the point. Two copies drift, and the copy
 * that drifts is always the one doing the enforcing.
 *
 * ── On false positives ──────────────────────────────────────────────────
 * Every rule here can block a practitioner from sending a report a client is
 * waiting for, so each one names exactly what tripped it (`detail`) rather
 * than saying "failed". A gate you cannot argue with is a gate people route
 * around — by writing "D.r" or "brand-name-redacted" — and then the check is
 * worse than nothing because it reads as passing.
 *
 * Word boundaries are used everywhere for the same reason: "cure" must not
 * fire on "manicure", and "MD" must not fire inside a word.
 */

import type { SkinReportContent } from "@/lib/studio/report";

export type ReportCheckId =
  | "photos-opened"
  | "client-name"
  | "noticed-length"
  | "routines-complete"
  | "avoid-items"
  | "no-brand-names"
  | "no-banned-words"
  | "disclaimer";

export type ReportCheck = {
  id: ReportCheckId;
  label: string;
  passed: boolean;
  /** What specifically failed, or what was found. Shown next to the tick. */
  detail?: string;
  /**
   * True when the check cannot fail by anything the practitioner types —
   * the disclaimer, or photo checks on a lead with no photographs. Rendered
   * differently so the list does not imply work that does not exist.
   */
  automatic?: boolean;
};

/** ~300 characters, per the handover. The others are proportionate. */
export const MIN_NOTICED_LENGTH = 300;
export const MIN_ROUTINE_LENGTH = 120;

/**
 * Brands, not ingredients. The report names ingredient categories and budget
 * ranges — naming a brand either looks like an endorsement we are paid for
 * (we are not) or sends someone hunting for a product their local pharmacy
 * does not stock.
 *
 * Deliberately includes the drugstore names that come to mind first when
 * writing quickly, plus the Pakistani market brands, plus the ones a
 * practitioner is most likely to actually use themselves.
 */
export const BRAND_BLOCKLIST = [
  "cerave",
  "cetaphil",
  "la roche posay",
  "la roche-posay",
  "the ordinary",
  "neutrogena",
  "olay",
  "nivea",
  "ponds",
  "pond's",
  "garnier",
  "loreal",
  "l'oreal",
  "clean and clear",
  "clean & clear",
  "himalaya",
  // NOTE: "Simple" and "J." are real brands but are omitted deliberately —
  // as bare words they fire on "a simple routine" and on any sentence-initial
  // "J.", and a check that cries wolf is one practitioners learn to work
  // around. A brand blocklist is only useful while its hits are all real.
  "aveeno",
  "eucerin",
  "bioderma",
  "avene",
  "vichy",
  "sebamed",
  "dermacos",
  "saeed ghani",
  "conatural",
  "rivaj",
  "medicam",
  "skinoren",
  "differin",
  "retin-a",
  "accutane",
  "roaccutane",
  "melacare",
  "faiza",
  "stillman",
  "goree",
  "caro light",
  "beauty cream",
  "paula's choice",
  "paulas choice",
  "inkey list",
  "good molecules",
  "cosrx",
  "some by mi",
  "skin1004",
  "beauty of joseon",
  "isntree",
  "purito",
  "dr rashel",
  "dr. rashel",
] as const;

/**
 * The words that turn a cosmetic assessment into something it legally is
 * not. "Dr." and "MD" misrepresent who wrote it; "diagnose", "prescribe" and
 * "cure" misrepresent what it is; "guaranteed" is a promise we cannot keep.
 *
 * `label` is what the practitioner is told they wrote — the raw regex would
 * be no help to someone trying to fix it.
 */
export const BANNED_PATTERNS: { label: string; pattern: RegExp }[] = [
  { label: "Dr.", pattern: /\bdr\b\.?/i },
  { label: "MD", pattern: /\bmd\b/i },
  { label: "licensed", pattern: /\blicen[cs]ed\b/i },
  { label: "diagnose", pattern: /\bdiagnos(?:e|es|ed|ing|is|tic)\b/i },
  {
    label: "prescribe",
    pattern: /\bprescrib(?:e|es|ed|ing)\b|\bprescriptions?\b/i,
  },
  { label: "cure", pattern: /\bcures?\b|\bcured\b|\bcuring\b/i },
  { label: "guaranteed", pattern: /\bguarantee(?:d|s)?\b/i },
];

/** Everything the practitioner typed, as one blob, for the text-wide rules. */
function allText(content: SkinReportContent) {
  return [
    content.noticed,
    content.morningRoutine,
    content.nightRoutine,
    content.avoidItems,
    content.extraNotes,
  ].join("\n");
}

/**
 * The client's first name only. `fullName` is whatever they typed into the
 * funnel, so it can be one word, three words, or empty.
 */
export function firstNameOf(fullName: string | null | undefined) {
  return (fullName ?? "").trim().split(/\s+/)[0]?.trim() ?? "";
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function countOccurrences(haystack: string, needle: string) {
  if (!needle) return 0;
  const matches = haystack.match(
    new RegExp(`\\b${escapeRegExp(needle)}\\b`, "gi"),
  );
  return matches?.length ?? 0;
}

export function findBrandNames(text: string): string[] {
  const found = new Set<string>();
  for (const brand of BRAND_BLOCKLIST) {
    // Leading \b plus a negative lookahead for a letter, rather than a
    // trailing \b: "retin-a" and "pond's" end in characters where \b would
    // land in the wrong place, and the lookahead still stops "olay" from
    // matching inside a longer word.
    if (new RegExp(`\\b${escapeRegExp(brand)}(?![a-z])`, "i").test(text)) {
      found.add(brand);
    }
  }
  return [...found];
}

export function findBannedWords(text: string): string[] {
  return BANNED_PATTERNS.filter(({ pattern }) => pattern.test(text)).map(
    ({ label }) => label,
  );
}

export type ReportQualityContext = {
  /** The client's name as recorded on the lead. */
  clientFullName: string | null | undefined;
  /** How many photographs this lead actually has. Zero means nothing to open. */
  photoCount: number;
  /** Whether the practitioner ticked the "I opened every photograph" box. */
  photosOpened: boolean;
};

/**
 * The whole gate, in one call. Order matches the handover's checklist so the
 * editor and the server error message read the same way.
 */
export function evaluateReport(
  content: SkinReportContent,
  context: ReportQualityContext,
): ReportCheck[] {
  const text = allText(content);
  const firstName = firstNameOf(context.clientFullName);
  const nameCount = countOccurrences(text, firstName);
  const brands = findBrandNames(text);
  const banned = findBannedWords(text);

  const avoidCount = content.avoidItems
    .split("\n")
    .map((line) => line.replace(/^[-•*]\s*/, "").trim())
    .filter(Boolean).length;

  const noticedLength = content.noticed.trim().length;
  const morningLength = content.morningRoutine.trim().length;
  const nightLength = content.nightRoutine.trim().length;

  return [
    {
      id: "photos-opened",
      label: "All photographs opened",
      // Nothing to open is not a failure — it is a lead that sent no photos,
      // and blocking on it would strand the report entirely.
      passed: context.photoCount === 0 || context.photosOpened,
      automatic: context.photoCount === 0,
      detail:
        context.photoCount === 0
          ? "This client sent no photographs"
          : context.photosOpened
            ? `Confirmed for all ${context.photoCount}`
            : `Open all ${context.photoCount} at full size, then tick the box`,
    },
    {
      id: "client-name",
      label: "Client's first name used in the text",
      // Auto-passes when the lead genuinely has no name — the check cannot
      // demand a word nobody knows.
      passed: !firstName || nameCount >= 1,
      automatic: !firstName,
      detail: !firstName
        ? "No name recorded for this client"
        : nameCount === 0
          ? `Write "${firstName}" into the report`
          : nameCount === 1
            ? `Used once — the guidelines ask for at least twice`
            : `Used ${nameCount} times`,
    },
    {
      id: "noticed-length",
      label: `"What we noticed" is at least ${MIN_NOTICED_LENGTH} characters`,
      passed: noticedLength >= MIN_NOTICED_LENGTH,
      detail: `${noticedLength} / ${MIN_NOTICED_LENGTH}`,
    },
    {
      id: "routines-complete",
      label: "Morning and night routines both written",
      passed:
        morningLength >= MIN_ROUTINE_LENGTH && nightLength >= MIN_ROUTINE_LENGTH,
      detail: `Morning ${morningLength} / ${MIN_ROUTINE_LENGTH} · Night ${nightLength} / ${MIN_ROUTINE_LENGTH}`,
    },
    {
      id: "avoid-items",
      label: "At least one item under “what to avoid”",
      passed: avoidCount >= 1,
      detail: avoidCount === 1 ? "1 item" : `${avoidCount} items`,
    },
    {
      id: "no-brand-names",
      label: "No brand names",
      passed: brands.length === 0,
      detail: brands.length
        ? `Found: ${brands.join(", ")} — name the ingredient category instead`
        : "None found",
    },
    {
      id: "no-banned-words",
      label: "No banned words",
      passed: banned.length === 0,
      detail: banned.length
        ? `Found: ${banned.join(", ")}`
        : "None found",
    },
    {
      id: "disclaimer",
      label: "Medical disclaimer present",
      // Drawn into every PDF by `drawClosingBlock`, from a constant, with no
      // way for the editor to omit it. It is listed so the practitioner can
      // see it is handled, not so they can do anything about it.
      passed: true,
      automatic: true,
      detail: "Added to every report automatically",
    },
  ];
}

export function failedChecks(checks: ReportCheck[]) {
  return checks.filter((check) => !check.passed);
}

/** One line naming what is blocking the send. Used in the server redirect. */
export function describeFailures(checks: ReportCheck[]) {
  const failed = failedChecks(checks);
  if (!failed.length) return "";
  return `Report not sent — ${failed
    .map((check) => `${check.label}${check.detail ? ` (${check.detail})` : ""}`)
    .join("; ")}`;
}
