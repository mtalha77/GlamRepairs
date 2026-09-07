/**
 * Single source of truth for site-wide SEO values.
 *
 * ── The `www` matters ────────────────────────────────────────────────────────
 * Verified live: `https://glamrepairs.com/pricing` 301s to
 * `https://www.glamrepairs.com/pricing`. **www is the canonical host.**
 *
 * Setting NEXT_PUBLIC_APP_URL to the bare domain makes every canonical tag,
 * sitemap entry and OG URL point at a host that redirects. That splits ranking
 * signals across two hosts and is exactly what produces "Page with redirect"
 * and "Duplicate, Google chose a different canonical" in Search Console —
 * which is the 4-URL error currently showing in the Ahrefs crawl.
 */
export const SITE = {
  name: "GlamRepairs",
  legalName: "GlamRepairs",
  tagline: "Online skin assessment, read by a certified practitioner",
  description:
    "Answer a few questions, send a few photos, and a certified practitioner " +
    "reads your skin and writes you a personalised plan you keep. No clinic, " +
    "no waiting room.",
  /** Canonical origin. Always www. No trailing slash. */
  url: (process.env.NEXT_PUBLIC_APP_URL || "https://www.glamrepairs.com").replace(
    /\/$/,
    "",
  ),
  locale: "en_PK",
  country: "PK",
  language: "en",
  /**
   * Business WhatsApp, stored in INTERNATIONAL form (no "+", no leading 0).
   * The local form is 0335-5880333; converting it at each call site is how
   * you end up with one place doing it wrong, so it is converted once, here.
   * lib/funnel/whatsapp.ts reads this as its fallback.
   */
  whatsapp: "923355880333",
  /**
   * Help line for people stuck mid-funnel (HOTFIX-9 §4). Stored in
   * INTERNATIONAL form for tel:/wa.me links; supportPhoneDisplay is the
   * local form people actually recognise and can read off the screen.
   * Deliberately a different number from `whatsapp` above — that one is the
   * business/assessment line, this one is "I can't get the upload to work".
   */
  supportPhone: "923018770506",
  supportPhoneDisplay: "0301 8770506",
  // Consolidates the brand entity: tells Google these profiles and this site
  // are the same organisation. Only includes profiles that are live, public and
  // actually branded GlamRepairs — a 404 or an abandoned handle here is a
  // negative signal, not a neutral one. URLs match the ones already live in
  // Footer.tsx and CeoSection.tsx; no TikTok entry because no TikTok handle
  // exists elsewhere in the codebase — add one here only once it does.
  sameAs: [
    "https://www.instagram.com/glam.repairs/",
    "https://web.facebook.com/profile.php?id=61590698607527",
    "https://www.linkedin.com/company/glamrepairs/",
  ] as string[],
} as const;

/**
 * HANDOVER-9 §1 — bank transfer details, shown in exactly three places
 * (the completion screen, the WhatsApp message body, and the confirmation
 * email) and defined only here.
 *
 * ⚠️ The amount is NEVER in this constant. It comes from public.pricing_regions
 * via lib/pricing/regions.ts, because it differs per region and changing it is
 * a database update, not a deploy. Adding an `amount` field here would quietly
 * re-introduce the stale-price bug HOTFIX-7 removed.
 *
 * IBAN checked: 24-character PK format, mod-97 checksum valid, and the
 * embedded account number matches accountNumber below.
 */
export const PAYMENT = {
  bank: "United Bank Limited (UBL)",
  /** Compact form for the WhatsApp prefill, where every character counts. */
  bankShort: "UBL",
  accountTitle: "Muhammad Talha",
  accountNumber: "010900024325",
  iban: "PK47UNIL0109000243258774",
  /**
   * Approved wording (Talha, HANDOVER-9). The account is in a personal name
   * that appears nowhere else on the site, which is a moment of hesitation
   * right at the payment step. Naming him, and his relationship to the
   * business, turns a surprise into a disclosure. Shown directly above the
   * bank block everywhere the block appears.
   */
  ownerDisclosure:
    "Payments are received into the account of Muhammad Talha, who runs " +
    "Glam Repairs alongside Ayma Arif.",
  /**
   * How long we tell clients it takes to confirm a transfer.
   *
   * ⚠️ DEFAULT — Talha should set this to whatever he can actually honour.
   * Silence after someone has sent money is where trust dies, so a generous
   * but stated window beats no window at all. One-line change, and it updates
   * the completion screen, the WhatsApp message and the email together.
   */
  confirmationWindow: "12 hours",
} as const;

/** Absolute URL helper — schema and sitemaps must never emit relative URLs. */
export function abs(path = "/"): string {
  return `${SITE.url}${path.startsWith("/") ? path : `/${path}`}`;
}
