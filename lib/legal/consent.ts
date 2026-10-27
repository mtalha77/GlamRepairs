/**
 * The consent step's wording, versioned. HANDOVER-58 Part 2.
 *
 * ATA direct-to-patient guidance asks that consent, given before the
 * encounter, covers the nature and limits of the service, an explicit
 * emergency plan, and when the service stops and refers. The items below are
 * that text, in plain words, shown on the consent step.
 *
 * Each lead records the version it agreed to (leads.consent_version and
 * consent_at). When this wording changes, add a new version and keep the old
 * one in CONSENT_VERSIONS: a client who agreed to the old text agreed to the
 * old text, and we have to be able to show which.
 *
 * No emergency number appears on purpose. It differs by country, and the
 * client's country governs.
 */

export const CONSENT_VERSION = "2026-10-23";

/** Every version a client may have been shown. Never remove one. */
export const CONSENT_VERSIONS = ["2026-10-23"] as const;

export type ConsentPoint = { lead: string; rest: string };

export const CONSENT_POINTS: ConsentPoint[] = [
  {
    lead: "What this is.",
    rest: " A written assessment from your photographs and answers, by a certified aesthetics practitioner. It is cosmetic guidance, not a medical diagnosis, and photographs can miss what an in-person examination would find.",
  },
  {
    lead: "When a clinic is the right choice.",
    rest: " If your skin is painful, spreading or changing quickly, tell us. We will say so plainly and refund you.",
  },
  {
    lead: "If something is urgent, do not wait for us.",
    rest: " We reply within 24 hours and we are not an emergency service. If your skin is painful, rapidly spreading or blistering, or you feel unwell with it, contact a doctor or your local emergency service now.",
  },
  {
    lead: "If you already see a doctor,",
    rest: " keep following their advice and tell us about any prescribed treatment. We work around it, never against it.",
  },
];

export function isKnownConsentVersion(value: unknown): value is (typeof CONSENT_VERSIONS)[number] {
  return typeof value === "string" && (CONSENT_VERSIONS as readonly string[]).includes(value);
}
