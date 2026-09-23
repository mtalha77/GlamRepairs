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
  /**
   * HANDOVER-11 §5 — support hours, defined once so the footer, the
   * Organization schema and any future contact surface cannot drift apart.
   *
   * ⚠️ Noon, not midnight. The handover read "12 am to 10pm"; confirmed with
   * Talha that it means 12:00 PM — a ten-hour day, not a twenty-two-hour one.
   *
   * ⚠️ NAP consistency: the Google Business Profile still says "Open 24
   * hours", which contradicts this. Hours are part of the name/address/phone
   * triple Google cross-references, so a mismatch weakens both the listing
   * and the site. Talha updates the profile; this is the site half.
   *
   * `opens`/`closes` are 24-hour ISO times because that is what
   * OpeningHoursSpecification requires; `display*` is what humans read.
   * (PKT) is explicit — the site quotes USD, GBP and EUR prices, so
   * visitors reading these hours may have no idea which zone they are in.
   */
  hours: {
    days: [
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ] as string[],
    opens: "12:00",
    closes: "22:00",
    displayDays: "Monday to Saturday",
    displayTime: "12:00 PM to 10:00 PM (PKT)",
    /**
     * Sets the expectation the hours alone would break: the site promises
     * assessments within 24 hours, which is a different clock from when
     * someone answers a message. Without this, a client who writes at 11 PM
     * on Saturday thinks they have been ignored.
     */
    note:
      "Assessments are delivered within 24 hours. Messages outside these " +
      "hours are answered the next working day.",
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
 * • `course`     — a course or specialization from a named institution.
 *                  Real learning, and not a licence to practise. Renders
 *                  under the awarding institution's name. Never
 *                  "certified", and — HOTFIX-36 §1.3 — never labelled
 *                  "completed coursework", which reads as a hedge rather
 *                  than a description.
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
  /** A number a third party can quote back to the issuer. */
  reference?: string;
  /**
   * Overrides the kind-derived reference label. Use only to be *more*
   * specific, never to upgrade what the credential is.
   */
  referenceLabel?: string;
  /** A public URL anyone can open and check for themselves. The strongest form. */
  verifyUrl?: string;
  /** The wording of the verify action, e.g. "Check with HEC". */
  verifyLabel?: string;
  /** A redacted supporting document under /public, once one exists. */
  documentUrl?: string;
  /** Component courses inside a specialization. */
  includes?: string[];
  /**
   * The plain-English paragraph: how a stranger checks this, and why it
   * matters to a client.
   *
   * HOTFIX-36 §2.3 — what this field may NOT contain any more. It used to
   * carry a "what it isn't" clause on every entry: the membership was
   * "open membership, not a competence credential", the coursework was
   * "not a licence or a certification to practise". Each was true and each
   * was volunteered. Stating the limit once, in the scope panel, is honest;
   * restating it under every credential in turn argues the opposite of what
   * the page exists to argue. The `kind` map still prevents a membership
   * being labelled a certification, which is the part that actually needed
   * enforcing.
   */
  check: string;
  /** Overrides the bolded lead-in, e.g. "Why it is relevant". */
  checkLabel?: string;
  /** An optional aside below the paragraph, in its own bordered block. */
  aside?: { lead: string; body: string };
};

/**
 * The chip shown beside each credential, derived from `kind` rather than
 * typed. Same reasoning as the label maps in the renderer: an open
 * membership must not be able to acquire a stronger badge than the
 * government attestation sitting above it by way of someone editing a
 * string.
 */
export function credentialStatus(kind: CredentialKind): string {
  return kind === "degree" ? "Government verified" : "Verifiable";
}

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
    verifyUrl: "https://eservices.hec.gov.pk/",
    verifyLabel: "Check with HEC",
    /*
     * HOTFIX-36 §1.1 — the awarding university is gone, for the third and
     * last time. It survived two previous passes because it was sitting in
     * this string rather than in the byline they each edited. The sentence
     * does not need it: what the reference proves is that the Government of
     * Pakistan checked the degree, not who printed it.
     */
    check:
      "quote the reference number to the Higher Education Commission and ask " +
      "them to confirm the attestation. HEC attestation means the Government " +
      "of Pakistan has independently confirmed the degree is genuine, which " +
      "is a stronger test than the certificate itself.",
    aside: {
      lead: "The strongest item on this page.",
      body:
        "A redacted copy of the e-Attestation certificate will be published " +
        "here once available.",
    },
  },
  {
    id: "ids-membership",
    kind: "membership",
    name: "International Dermoscopy Society",
    issuer: "International Dermoscopy Society",
    reference: "D.2629.9466",
    verifyUrl: "https://dermoscopy-ids.org/",
    verifyLabel: "Visit the society",
    check:
      "the membership number can be confirmed with the society directly. It " +
      "connects more than 16,000 members across 160 countries, focused on " +
      "dermoscopy and skin imaging.",
  },
  {
    id: "duke-telehealth",
    kind: "course",
    /*
     * HOTFIX-36 §1.3 fixes this title, on the third asking.
     *
     * HOTFIX-25 and HOTFIX-26 both requested "Essentials, Teamwork &
     * Dermatology" and both times it was left alone with a note saying it
     * needed a decision rather than a quiet edit, because it is not exactly
     * how Duke punctuates it and altering an issuer's own credential title
     * is a misquote. §1.3 now asks a third time and supplies the exact
     * wording, which is the decision that note was waiting for. The
     * `verifyUrl` below remains the authority if it is ever queried.
     */
    name: "Telehealth: Essentials, Teamwork & Dermatology",
    issuer: "Duke University",
    /*
     * HOTFIX-36 §1.4 — `platform` is deleted rather than left unrendered.
     * A field that exists only so a renderer can be careful not to print it
     * is an invitation to print it. The verification link is kept, because
     * a checkable link is the point of this page; it just no longer names
     * the platform beside the university that awarded the thing.
     */
    verifyUrl:
      "https://www.coursera.org/account/accomplishments/specialization/XQMQARLK1WFC",
    verifyLabel: "Verify the certificate",
    includes: [
      "Telehealth Clinical Essentials",
      "Telehealth: Interprofessional Team-Based Care",
      "Telehealth: Dermatology Assessment",
    ],
    checkLabel: "Why it is relevant",
    check:
      "the three parts are clinical essentials, team-based care, and " +
      "dermatology assessment, all delivered remotely. That is precisely how " +
      "this service works, so it applies here more directly than a general " +
      "qualification would.",
  },
];

export function getCredential(id: string): Credential | undefined {
  return CREDENTIALS.find((c) => c.id === id);
}

/** Absolute URL helper — schema and sitemaps must never emit relative URLs. */
export function abs(path = "/"): string {
  return `${SITE.url}${path.startsWith("/") ? path : `/${path}`}`;
}

/**
 * The site-wide social card, as an explicit `images` entry — HOTFIX-25 §2.4.
 *
 * ── The bug this exists to close ─────────────────────────────────────────
 * `app/opengraph-image.tsx` is a file convention: Next injects it as
 * `og:image` into every route under `app/`. That works right up until a
 * page declares its own `openGraph` object. Metadata merges per key, so a
 * page-level `openGraph` REPLACES the inherited one — and if it has no
 * `images`, the generated card does not come back.
 *
 * Measured on production before this was added: /compare and
 * /sample-assessment were the only two public pages with no `og:image` at
 * all, and they are the only two that declare `openGraph` without
 * `images`. Both were also emitting `twitter:card=summary_large_image`
 * with no image to put in it.
 *
 * Those are the site's two highest-intent commercial pages — the "what do
 * I actually get" page and the "why you and not a clinic" page, both built
 * in HANDOVER-22 to close the sale. They were producing a bare, thumbnailless
 * link preview on WhatsApp, which is how things actually get shared in
 * Pakistan, and on X and Facebook. That is a conversion cost, not a
 * cosmetic one.
 *
 * ── Use it whenever you declare `openGraph` or `twitter` on a page ───────
 *     openGraph: { title, description, url: "/x", type: "article",
 *                  images: [SOCIAL_CARD] },
 *     twitter:   { card: "summary_large_image", title, description,
 *                  images: [SOCIAL_CARD.url] },
 *
 * A page with a genuinely page-specific card should point at that instead
 * — /blog/[slug] does, via its own `opengraph-image.tsx` in-segment, which
 * is why posts are not affected by any of this.
 */
export const SOCIAL_CARD = {
  url: abs("/opengraph-image"),
  width: 1200,
  height: 630,
  alt: `${SITE.name} — ${SITE.tagline}`,
} as const;

/**
 * Canonical and `og:url` from ONE path — HOTFIX-31 §4.2.
 *
 * ── The bug this closes ──────────────────────────────────────────────────
 * Ten public pages set `alternates.canonical` and did not set
 * `openGraph.url`. Page metadata merges field by field against the root, so
 * canonical became the page while `og:url` stayed whatever the root layout
 * declared — the HOMEPAGE. Every one of those pages told a crawler "I am
 * /pricing" and told a social scraper "I am /". Ahrefs counted nine, which
 * is the ten minus the homepage, where the two happen to agree.
 *
 * HOTFIX-31 §4.1/§4.2 blamed a non-www redirect. That is not it: production
 * emits www everywhere and there is not one bare-domain URL in the markup.
 * The mismatch is path-level, not host-level.
 *
 * ── Why `images` is not optional here ────────────────────────────────────
 * A page-level `openGraph` REPLACES the inherited object rather than
 * merging into it, so declaring `{ url }` alone would silently drop
 * `og:image` and hand WhatsApp a thumbnailless preview — the exact
 * regression HANDOVER-22 fixed. `SOCIAL_CARD` is therefore included by
 * default, and a page with its own card passes `images` to override it.
 */
export function canonicalOg(
  path: string,
  extra: Record<string, unknown> = {},
) {
  const openGraph = {
    url: path,
    images: [SOCIAL_CARD],
    ...extra,
  } as Record<string, unknown>;

  /*
   * HOTFIX-36 §3.1 — the Twitter block is derived here, not left to fall
   * through.
   *
   * Next merges metadata per key, exactly as it does for `openGraph`. A
   * page that sets a title and an `openGraph` but no `twitter` inherits the
   * ROOT `twitter` object wholesale, so every such page was serving the
   * homepage's title and description to Twitter, Slack, WhatsApp and
   * anything else reading `twitter:` in preference to `og:`. Measured on
   * production: /credentials sent `og:title = "Credentials | GlamRepairs"`
   * and `twitter:title = "GlamRepairs — Online skin assessment, read by a
   * certified practitioner"` in the same document.
   *
   * §3.1 asked for this to be fixed in the shared helper rather than on the
   * page, which is right: nine routes call `canonicalOg`, and fixing them
   * one at a time is how the defect reached nine routes in the first place.
   * The page passes its own title and description through `extra` and both
   * blocks are built from the one set of values, so they cannot disagree
   * again.
   */
  const twitter: Record<string, unknown> = {
    card: "summary_large_image",
    images: [SOCIAL_CARD.url],
  };
  if (typeof openGraph.title === "string") twitter.title = openGraph.title;
  if (typeof openGraph.description === "string") {
    twitter.description = openGraph.description;
  }

  return {
    alternates: { canonical: path },
    openGraph,
    twitter,
  };
}
