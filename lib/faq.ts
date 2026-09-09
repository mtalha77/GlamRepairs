/**
 * HANDOVER-13 — every FAQ on the site, once.
 *
 * Before this there were two hardcoded arrays (one in FaqSection, one in
 * aboutContent) and the same question drifted between them: "photos" here,
 * "photographs" there; six questions on one page, seven on another; two
 * different phrasings of how long an assessment takes. Every page now filters
 * this array by tag, and the FAQPage schema is generated from the same
 * filtered list, so the markup cannot say something the page does not.
 *
 * ── Ordering is deliberate ───────────────────────────────────────────────
 * Money first, then trust, then practical. Not alphabetical, not
 * chronological: this is the order in which questions actually stop someone
 * from paying. The payment question in particular was missing entirely —
 * people reached the end of a 25-step form with no idea how to pay.
 *
 * ── Two answers are deliberately NOT here ────────────────────────────────
 * 1. `photo-deletion` ("what happens to my photos afterwards?"). The
 *    handover gates it on the cleanup job being verified. It has not run:
 *    checked against production, `photos_deleted_at` is null on all 36 lead
 *    rows and 22 are past the 30-day mark. Claiming automatic deletion today
 *    would be false. Add the entry once a purge has actually run.
 * 2. The stronger `photo-privacy` wording ("stored privately, not on any
 *    public address… links that expire"). The assessment-photos bucket is
 *    still public — verified, `storage.buckets.public` is true — so that
 *    copy would also be false. The wording below is what is true today.
 *    Swap it only when the bucket flip ships.
 *
 * Removing a claim is not a downgrade. A privacy promise a competitor could
 * disprove in one request is worth less than a smaller one that holds.
 */

export type FaqGroup = "money" | "trust" | "practical";
export type FaqTag = "home" | "about" | "contact" | "pricing";

/** Live prices, so the cost answer can never go stale against the database. */
export type FaqPricing = { clarity: string; transform: string };

export type Faq = {
  /** Stable slug. Used as the DOM id, the deep-link hash, and in schema. Renaming one breaks shared links. */
  id: string;
  q: string;
  /**
   * Plain text. Not a ReactNode, because an FAQPage node has to emit this
   * exact string and structured data cannot carry markup — see `links`.
   */
  a: string;
  /**
   * Substrings of `a` to render as internal links. Naming the target
   * separately is what keeps the visible copy and the schema value
   * character-for-character identical.
   */
  links?: { text: string; href: string }[];
  group: FaqGroup;
  tags: FaqTag[];
  /**
   * When set, `a` is ignored and this builds the answer from live prices.
   * An entry marked this way is omitted entirely when no pricing context is
   * passed — a price question rendering without live prices is worse than
   * the question being absent.
   */
  fromPricing?: (pricing: FaqPricing) => string;
};

export const FAQ_GROUP_LABEL: Record<FaqGroup, string> = {
  money: "Pricing and process",
  trust: "Trust and privacy",
  practical: "Practical",
};

/** Render order. Money first: it is what blocks a purchase. */
const GROUP_ORDER: FaqGroup[] = ["money", "trust", "practical"];

export const FAQS: Faq[] = [
  /* ── Money and process ─────────────────────────────────────────────── */
  {
    id: "how-much",
    q: "How much does it cost?",
    group: "money",
    // Only the two pages that already resolve a pricing region. Tagging this
    // onto /about or /contact would drag those pages from static to dynamic
    // rendering for one sentence.
    tags: ["home", "pricing"],
    a: "",
    fromPricing: ({ clarity, transform }) =>
      `Skin Clarity is ${clarity} and Skin Transform is ${transform}. Skin ` +
      "Starter is free. Prices are shown in your local currency if you are " +
      "outside Pakistan.",
  },
  {
    id: "how-to-pay",
    q: "How do I pay?",
    group: "money",
    tags: ["home", "pricing", "contact"],
    a:
      "By bank transfer. After you complete the assessment we show you the " +
      "account details and a reference number, and you send the payment " +
      "screenshot on WhatsApp. We confirm it and your assessment begins.",
  },
  {
    id: "how-long",
    q: "How long does it take?",
    group: "money",
    tags: ["home", "pricing", "contact", "about"],
    a:
      "Your assessment is written and sent within 24 hours of your payment " +
      "being confirmed.",
  },
  {
    id: "do-i-buy-products",
    q: "Do I have to buy the products you recommend?",
    group: "money",
    tags: ["home", "pricing", "about"],
    a:
      "No. We name ingredient types and product categories, not brands, so " +
      "you can buy whatever is available and affordable near you. We take no " +
      "commission from any brand.",
  },

  /* ── Trust ─────────────────────────────────────────────────────────── */
  {
    id: "is-this-ai",
    q: "Is this an AI tool?",
    group: "trust",
    tags: ["home", "about", "pricing"],
    a:
      "No. A certified practitioner reads your questionnaire, your history " +
      "and your photographs, and writes your assessment personally. There " +
      "are no automated reports.",
  },
  {
    id: "who-reviews",
    q: "Who reviews my photographs?",
    group: "trust",
    tags: ["home", "about"],
    a:
      "Ayma Arif, Certified Aesthetics Practitioner, with a BS in Cosmetology " +
      "and Dermatology Science attested by the Higher Education Commission of " +
      "Pakistan. See her credentials.",
    links: [
      { text: "Ayma Arif", href: "/authors/ayma-arif" },
      { text: "See her credentials", href: "/credentials" },
    ],
  },
  {
    id: "photo-privacy",
    q: "Are my photographs private?",
    group: "trust",
    tags: ["home", "about", "contact"],
    // ⚠️ This is the true-today wording. See the file header before changing
    // it: the stronger version depends on the bucket flip, and the previous
    // homepage copy ("stored under an anonymous case ID") described a system
    // that does not exist.
    a:
      "Your photographs are used only to prepare your assessment. They are " +
      "seen by the practitioner working on your case, and are never " +
      "published, sold, or used in marketing without your separate written " +
      "permission.",
  },
  {
    id: "is-this-medical",
    q: "Is this a medical consultation?",
    group: "trust",
    tags: ["home", "about"],
    a:
      "No. Glam Repairs provides cosmetic skincare guidance. We do not " +
      "diagnose conditions or prescribe medication. If your concern needs a " +
      "doctor we will tell you and refund you rather than sell you a routine " +
      "that cannot help.",
  },
  {
    id: "not-satisfied",
    q: "What if I am not satisfied?",
    group: "trust",
    tags: ["home", "about", "pricing", "contact"],
    // Bounded on purpose. An earlier version promised responsibility "until
    // you're confident in your routine", which is an open-ended commitment
    // the Terms explicitly disclaim. A stated window is both keepable and
    // more reassuring than an unlimited promise nobody believes.
    a:
      "We'll revise your assessment until the routine makes sense for you and " +
      "you're confident following it. Tell us within 14 days and we'll revise " +
      "it at no cost.",
  },

  /* ── Practical ─────────────────────────────────────────────────────── */
  {
    id: "what-photos",
    q: "What photos do I need?",
    group: "practical",
    tags: ["home", "contact"],
    a:
      "Clear, unfiltered photos in natural light, taken without makeup. We " +
      "guide you through it during the assessment. If what you send is too " +
      "dark or blurred we will ask you to retake them rather than guess.",
  },
  {
    id: "ask-questions-after",
    q: "Can I ask questions after I get my report?",
    group: "practical",
    tags: ["home", "pricing", "about"],
    a:
      "Yes. Clarity includes one follow-up check in after two weeks. " +
      "Transform includes two follow-ups across a month, plus direct " +
      "WhatsApp access during your plan.",
  },
  {
    id: "outside-pakistan",
    q: "Do you work with clients outside Pakistan?",
    group: "practical",
    tags: ["home", "pricing", "contact"],
    a:
      "Yes. The assessment is online, and prices are shown in your local " +
      "currency. Advice is written for the climate and water conditions " +
      "where you actually live.",
  },
  {
    id: "men",
    q: "Is this only for women?",
    group: "practical",
    tags: ["home", "about"],
    // Every photograph on the site is of a woman, so men reasonably assume
    // the service is not for them. One line removes that barrier.
    a: "No. The assessment works the same regardless of gender.",
  },
];

/** A question with its answer already resolved — no functions, ready to render or serialise. */
export type ResolvedFaq = Omit<Faq, "fromPricing">;

/**
 * The questions for one page, in group order.
 *
 * Pass `pricing` only from a page that already resolves a pricing region.
 * Without it, price-dependent questions are dropped rather than rendered
 * with a placeholder.
 */
export function resolveFaqs(tag: FaqTag, pricing?: FaqPricing): ResolvedFaq[] {
  return FAQS.filter((faq) => faq.tags.includes(tag))
    .filter((faq) => !faq.fromPricing || Boolean(pricing))
    .map(({ fromPricing, ...faq }) => ({
      ...faq,
      a: fromPricing && pricing ? fromPricing(pricing) : faq.a,
    }))
    .sort((a, b) => GROUP_ORDER.indexOf(a.group) - GROUP_ORDER.indexOf(b.group));
}

/** The groups actually present in a resolved set, in render order. */
export function faqGroupsPresent(faqs: ResolvedFaq[]): FaqGroup[] {
  return GROUP_ORDER.filter((group) => faqs.some((faq) => faq.group === group));
}
