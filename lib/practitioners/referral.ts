/**
 * A practitioner's own link to send their clients (/with/[slug]). Shared by
 * the route that sets the cookie, the funnel that reads it, and the portal
 * that shows the link.
 */

export const REFERRAL_COOKIE = "gr_ref";
export const REFERRAL_MAX_AGE = 30 * 24 * 60 * 60;
/** The answer key the lead trigger reads to set `referred_by_practitioner_id`. */
export const REFERRED_BY_KEY = "onboarding.referredBy";

export const referralPath = (slug: string) => `/with/${slug}`;
