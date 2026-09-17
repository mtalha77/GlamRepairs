/**
 * HANDOVER-20 Part 2 — gifted assessments.
 *
 * ── The switch used to live here. It does not any more ───────────────────
 * `isGiftProgrammeEnabled()` read `GIFT_PROGRAMME_ENABLED` from the
 * environment. HOTFIX-29 removed it, because there were two switches for
 * one thing: the database had `pricing_settings.gift_programme_enabled` and
 * the studio read the environment variable, so correcting the database
 * changed nothing visible and the "switched off" notice kept returning.
 *
 * Read the switch from `lib/gifts/giftSettings.ts`. Do not reintroduce an
 * environment variable for it — the next deploy from an environment missing
 * the key would silently switch the programme off again, which is exactly
 * how this bug went unexplained for as long as it did.
 *
 * Redemption is still deliberately NOT gated. If a code has been issued,
 * the person holding it must be able to use it even if the programme is
 * later switched off — otherwise turning it off silently voids gifts real
 * people are holding. The database enforces the switch on INSERT only, for
 * this reason.
 */

/**
 * The code format, and where codes actually come from.
 *
 * ── One generator, in the database ───────────────────────────────────────
 * HOTFIX-29 §2.2: `public.generate_gift_code()` makes every code, as
 * `GR-XXXXX-XXXXX` from a 32-character alphabet with no O, 0, I or 1 —
 * about 10^15 combinations.
 *
 * A TypeScript generator used to live here producing `GLAM-GIFT-XXXXXX`,
 * and for a while both existed. That is the same shape of bug as the two
 * switches HOTFIX-29 Part 1 removed: two sources for one value, drifting
 * apart, with no way to tell from a code which one made it. The database
 * function wins because the cap and uniqueness are enforced there anyway.
 *
 * The excluded characters are not fussiness. People read these aloud over
 * the phone and retype them from a screenshot of a WhatsApp message, and
 * O/0 and I/1 are a support conversation waiting to happen.
 */
export const GIFT_CODE_PREFIX = "GR-";

/** The body of a generated code: two groups of five, without the prefix. */
const GENERATED_BODY_LENGTH = 10;

/**
 * Normalise whatever the user typed or pasted.
 *
 * `check_gift_code` already upper-cases and trims server-side, so this is
 * for display, for building URLs, and for the one convenience below — it is
 * not a security boundary.
 *
 * The convenience: someone reading a code off a screenshot often types only
 * the body, or loses the hyphen. Ten valid characters with no prefix are
 * re-assembled into `GR-XXXXX-XXXXX`. Anything else is passed through
 * cleaned, because guessing further would risk turning one real code into a
 * different real code.
 */
export function normaliseGiftCode(input: string): string {
  const cleaned = input
    .trim()
    .toUpperCase()
    // Strip the spaces and stray punctuation people add when transcribing.
    .replace(/[^A-Z0-9-]/g, "");
  if (!cleaned) return "";
  if (cleaned.startsWith(GIFT_CODE_PREFIX)) return cleaned;

  const body = cleaned.replace(/-/g, "");
  if (body.length === GENERATED_BODY_LENGTH) {
    return `${GIFT_CODE_PREFIX}${body.slice(0, 5)}-${body.slice(5)}`;
  }
  // A typed campaign code (AYESHA20) or something we cannot interpret.
  return cleaned;
}

export function giftCodeUrl(code: string, appUrl?: string) {
  const base = (appUrl ?? process.env.NEXT_PUBLIC_APP_URL ?? "https://glamrepairs.com")
    .replace(/\/$/, "");
  return `${base}/gift/${encodeURIComponent(code)}`;
}

/**
 * Rejection reasons, exactly as `check_gift_code` returns them.
 *
 * ── Nine, not six ────────────────────────────────────────────────────────
 * Three of these come from the three-argument overload of the database
 * function, which is the one the app now calls. The two-argument version
 * cannot return them at all, which is why this list was short: the reasons
 * existed in the database and nothing in the application could receive them.
 *
 * `already_gifted` and `plan_unavailable` are real refusals a person will
 * hit. `rate_limited` is the database's own brute-force guard answering.
 * Left off this union they were coerced to `not_found` by
 * `isGiftCheckReason`, so someone who had already used a gift was told their
 * code did not exist — which is both untrue and unactionable.
 */
export type GiftCheckReason =
  | "ok"
  | "not_found"
  | "inactive"
  | "expired"
  | "already_used"
  | "self_redemption"
  | "already_gifted"
  | "plan_unavailable"
  | "rate_limited";

export type GiftCheckResult = {
  valid: boolean;
  reason: GiftCheckReason;
  grantsPlan: string | null;
  discountPct: number | null;
};

/**
 * What to tell the person holding the code.
 *
 * Every one of these ends somewhere other than a dead end — the handover is
 * explicit that an invalid code should "say why and offer the normal paid
 * route". Someone who was given a used code is still a person who wants an
 * assessment.
 */
export const GIFT_REJECTION_COPY: Record<
  Exclude<GiftCheckReason, "ok">,
  { title: string; body: string }
> = {
  not_found: {
    title: "We don't recognise this code",
    body: "Check the spelling — it may have been mistyped. Codes look like GLAM-GIFT-ABC123.",
  },
  inactive: {
    title: "This code is no longer active",
    body: "It may have been cancelled. If someone gave it to you recently, ask them to check.",
  },
  expired: {
    title: "This gift has expired",
    body: "Gift codes are valid for 90 days. This one is past its date.",
  },
  already_used: {
    title: "This gift has already been used",
    body: "Each code covers one assessment and this one has been claimed.",
  },
  self_redemption: {
    title: "This is your own gift code",
    body: "It's meant for someone else — send them the link and their assessment is on us.",
  },
  already_gifted: {
    title: "You've already had a gifted assessment",
    body: "Gifts are one per person. You're very welcome to book at the usual price.",
  },
  plan_unavailable: {
    title: "This gift covers a plan we no longer offer",
    body: "Nothing has gone wrong on your end. Message us and we'll sort out an equivalent.",
  },
  rate_limited: {
    title: "Too many attempts",
    body: "Wait a few minutes and try again. If you're sure the code is right, send it to us on WhatsApp instead.",
  },
};

const GIFT_CHECK_REASONS = new Set<string>([
  "ok",
  "not_found",
  "inactive",
  "expired",
  "already_used",
  "self_redemption",
  "already_gifted",
  "plan_unavailable",
  "rate_limited",
]);

/**
 * A membership test rather than a chain of comparisons, so adding a reason
 * to the union above and forgetting to add it here is one edit, not two.
 * Anything unrecognised still falls back to `not_found` at the call site.
 */
export function isGiftCheckReason(value: string): value is GiftCheckReason {
  return GIFT_CHECK_REASONS.has(value);
}
