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
   * The one business number. HOTFIX-8: the Google Business Profile number
   * (0301 8770506) replaces the previous funnel number (0335 5880333)
   * everywhere, including the WhatsApp conversion handoff — confirmed by
   * Talha on 8 Sep 2026 that it is WhatsApp-enabled and monitored.
   *
   * NAP consistency is the point: Google cross-references name, address and
   * phone to decide a business is real, so the site and the GBP listing
   * have to agree. Every tel:, wa.me, display string and schema value is
   * derived from here — never hardcode a number at a call site.
   *
   * This also absorbs what HOTFIX-9 §4 called `supportPhone`. That was
   * introduced as a deliberately separate help line; it turned out to be
   * this same GBP number, so there is now one number and one constant.
   */
  phone: {
    /** E.164 — `tel:` links and structured data. The canonical form. */
    e164: "+923018770506",
    /** Digits only, no "+" — what wa.me requires. */
    digits: "923018770506",
    /** Local form, the one people in Pakistan recognise on sight. */
    display: "0301 8770506",
    /** International form, for contexts where the country matters. */
    displayInternational: "+92 301 8770506",
  },
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

/**
 * HOTFIX-6 §2 — every credential, as data.
 *
 * `/credentials` used to be hand-typed table markup: adding a qualification
 * meant writing a `<tr>`, and the *wording* of each cell was up to whoever
 * typed it. That is the exact failure mode this file exists to prevent —
 * one careless "Certificate No." above a free, open membership discredits
 * the HEC attestation sitting in the row beside it.
 *
 * So credentials are objects and the page is a renderer. Adding one is a
 * single entry here; the label wording is derived from `kind` and is not the
 * author's to choose.
 *
 * ── What each `kind` means, and what may never be said about it ──────────
 * • `degree`     — an academic qualification from a degree-awarding
 *                  institution. The only kind that may be described as
 *                  attested, and only where a `reference` proves it.
 * • `membership` — joining a body. Says nothing about competence. Renders as
 *                  "Member" / "Membership No." Never "certified", never
 *                  "Certificate No.".
 * • `course`     — completed coursework or a platform specialization. Real
 *                  learning, and genuinely not a licence or a certification
 *                  to practise. Renders as completed coursework. Never
 *                  "certified".
 *
 * The renderer in app/credentials/page.tsx derives its labels from `kind`
 * precisely so this rule cannot be broken by editing a string.
 */
export type CredentialKind = "degree" | "membership" | "course";

export type Credential = {
  /** Stable key — referenced from lib/seo/authors.ts, so don't rename casually. */
  id: string;
  kind: CredentialKind;
  /** The qualification itself, exactly as the issuer names it. */
  name: string;
  /** The body that awarded or attested it. */
  issuer: string;
  /** Where it was taken, when that differs from who awarded it (e.g. Coursera). */
  platform?: string;
  /** A number a third party can quote back to the issuer. */
  reference?: string;
  /**
   * Overrides the kind-derived reference label. Use only to be *more*
   * specific, never to upgrade what the credential is.
   */
  referenceLabel?: string;
  /** A public URL anyone can open and check for themselves. The strongest form. */
  verifyUrl?: string;
  /** A redacted supporting document under /public, once one exists. */
  documentUrl?: string;
  /** Component courses inside a specialization. */
  includes?: string[];
  /** Plain-English note: what this is, and — where it matters — what it isn't. */
  note: string;
};

export const CREDENTIALS: Credential[] = [
  {
    id: "hec-degree",
    kind: "degree",
    name: "BS Cosmetology & Dermatology Science",
    issuer: "Higher Education Commission of Pakistan (HEC)",
    reference: "HEC/A&A/DAS/2026/5290888",
    referenceLabel: "HEC Attestation Reference No.",
    // documentUrl: "/credentials/hec-attestation.pdf",
    //   ↑ uncomment once the redacted e-Attestation certificate (CNIC, DOB,
    //   home address and signature removed) is dropped at that path. Until
    //   then `note` says so plainly rather than linking to a 404.
    note:
      "The strongest verification on this page — an official Government of " +
      "Pakistan confirmation that the degree, awarded by King Faisal " +
      "University, is genuine. A redacted copy of the e-Attestation " +
      "certificate will be published here; until then this reference number " +
      "can be quoted when asking HEC to confirm it directly.",
  },
  {
    id: "ids-membership",
    kind: "membership",
    name: "International Dermoscopy Society",
    issuer: "International Dermoscopy Society",
    reference: "D.2629.9466",
    verifyUrl: "https://dermoscopy-ids.org/",
    note:
      "A professional interest society (16,000+ members across 160+ " +
      "countries) — open membership, not a competence credential. Listed " +
      "for transparency, not as proof of clinical certification.",
  },
  {
    id: "duke-telehealth",
    kind: "course",
    name: "Telehealth: Essentials, Teamwork, and Dermatology",
    issuer: "Duke University",
    platform: "Coursera",
    verifyUrl:
      "https://www.coursera.org/account/accomplishments/specialization/XQMQARLK1WFC",
    includes: [
      "Telehealth Clinical Essentials",
      "Telehealth: Interprofessional Team-Based Care",
      "Telehealth: Dermatology Assessment",
    ],
    note:
      "Completed coursework, directly relevant to how this service actually " +
      "works — remote assessment, including dermatology specifically. " +
      "Verifiable at the Coursera link. It is coursework, not a licence or a " +
      "certification to practise.",
  },
];

export function getCredential(id: string): Credential | undefined {
  return CREDENTIALS.find((c) => c.id === id);
}

/** Absolute URL helper — schema and sitemaps must never emit relative URLs. */
export function abs(path = "/"): string {
  return `${SITE.url}${path.startsWith("/") ? path : `/${path}`}`;
}
