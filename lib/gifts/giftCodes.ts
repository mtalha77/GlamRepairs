/**
 * HANDOVER-20 Part 2 — gifted assessments.
 *
 * ── The kill switch, and why it defaults to off ──────────────────────────
 * The handover is explicit: "The gift programme should stay switched off
 * until practitioners exist. Giving away Ayma's capacity while she is the
 * only person writing reports would slow your paying clients, which is the
 * opposite of what a gift is for."
 *
 * So the whole issuing path is gated on `GIFT_PROGRAMME_ENABLED`, and the
 * gate is written the safe way round: anything other than an explicit
 * "true" leaves it off. An unset variable, a typo, a copied environment
 * that forgot the key — every one of those fails closed, and the failure
 * mode of failing closed is "no gift codes", which is the current state
 * anyway.
 *
 * Redemption is deliberately NOT gated. If a code has been issued, the
 * person holding it must be able to use it even if the programme is later
 * switched off — otherwise turning the flag off silently voids gifts real
 * people are holding, which is a worse outcome than honouring a handful of
 * outstanding codes.
 */

export function isGiftProgrammeEnabled() {
  return process.env.GIFT_PROGRAMME_ENABLED?.trim().toLowerCase() === "true";
}

/**
 * Unambiguous characters only.
 *
 * Removed: 0 and O, 1 and I and L. People read these aloud over the phone
 * and retype them from a screenshot of a WhatsApp message, and every one of
 * those pairs is a support conversation waiting to happen. 31 characters
 * instead of 36 costs a little entropy and saves the ambiguity.
 */
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const CODE_LENGTH = 6;
export const GIFT_CODE_PREFIX = "GLAM-GIFT-";

/**
 * 31^6 ≈ 887 million. With a monthly cap of 20 codes the collision risk is
 * negligible, but the insert is still guarded by a unique constraint and
 * the caller retries — this generates candidates, it does not guarantee
 * uniqueness on its own.
 */
export function generateGiftCode(): string {
  const bytes = new Uint8Array(CODE_LENGTH);
  crypto.getRandomValues(bytes);
  let body = "";
  for (const byte of bytes) {
    body += CODE_ALPHABET[byte % CODE_ALPHABET.length];
  }
  return `${GIFT_CODE_PREFIX}${body}`;
}

/**
 * Normalise whatever the user typed or pasted.
 *
 * `check_gift_code` already upper-cases and trims server-side (verified
 * against production), so this is for display and for building URLs — not a
 * security boundary. It also accepts a bare six-character body, because
 * someone reading a code off a screenshot will often type only that part.
 */
export function normaliseGiftCode(input: string): string {
  const cleaned = input
    .trim()
    .toUpperCase()
    // Strip the spaces and stray punctuation people add when transcribing.
    .replace(/[^A-Z0-9-]/g, "");
  if (!cleaned) return "";
  if (cleaned.startsWith(GIFT_CODE_PREFIX)) return cleaned;
  // A bare body, with or without hyphens the user invented.
  const body = cleaned.replace(/-/g, "");
  if (body.length === CODE_LENGTH) return `${GIFT_CODE_PREFIX}${body}`;
  return cleaned;
}

export function giftCodeUrl(code: string, appUrl?: string) {
  const base = (appUrl ?? process.env.NEXT_PUBLIC_APP_URL ?? "https://glamrepairs.com")
    .replace(/\/$/, "");
  return `${base}/gift/${encodeURIComponent(code)}`;
}

/** Rejection reasons, exactly as `check_gift_code` returns them. */
export type GiftCheckReason =
  | "ok"
  | "not_found"
  | "inactive"
  | "expired"
  | "already_used"
  | "self_redemption";

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
};

export function isGiftCheckReason(value: string): value is GiftCheckReason {
  return (
    value === "ok" ||
    value === "not_found" ||
    value === "inactive" ||
    value === "expired" ||
    value === "already_used" ||
    value === "self_redemption"
  );
}
