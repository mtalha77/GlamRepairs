import { PRACTITIONER } from "@/lib/seo/authors";

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
 * ── Two claims that had to be earned first ───────────────────────────────
 * 1. `photo-deletion` ("what happens to my photos afterwards?") was held
 *    back until the cleanup job had actually run. Checked against
 *    production on 28 October 2026: photographs deleted on 34 leads, and
 *    none past their 30 days still held. It is in now (HANDOVER-61).
 * 2. (Shipped, HOTFIX-43.) The `photo-privacy` answer now says the photos
 *    are held in private storage with no public address and opened only
 *    through a signed-in portal. That became true on 25 September 2026,
 *    when `storage.buckets.public` went false for assessment-photos and the
 *    policy letting the anon role read the bucket was dropped. If either of
 *    those is ever reverted, this sentence must go with it.
 *
 * Removing a claim is not a downgrade. A privacy promise a competitor could
 * disprove in one request is worth less than a smaller one that holds.
 */

export type FaqGroup = "money" | "trust" | "privacy" | "practical";
export type FaqTag = "home" | "about" | "contact" | "pricing";

/**
 * Live prices, so the cost answer can never go stale against the database.
 *
 * HANDOVER-27 §1.4 — one paid price, not two. This was
 * `{ clarity, transform }` and the answer named both tiers; Clarity is
 * retired, so an answer mentioning it described a plan nobody can buy.
 * `paid` rather than `transform` on purpose: the internal plan key is not
 * the point here, and naming it invites the next rename to reach into the
 * FAQ copy again.
 */
export type FaqPricing = { paid: string; videoMinutes: number };

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
   * HANDOVER-61 Part 3a: words people actually type, so the search finds
   * "refund" under "What if I am not satisfied?". Search only; never shown.
   */
  keywords?: string[];
  /** A small visual under the answer, drawn from live data (Part 3b). */
  proof?: "receipt" | "timeline";
  /**
   * When set, `a` is ignored and this builds the answer from live prices.
   * An entry marked this way is omitted entirely when no pricing context is
   * passed — a price question rendering without live prices is worse than
   * the question being absent.
   */
  fromPricing?: (pricing: FaqPricing) => string;
};

export const FAQ_GROUP_LABEL: Record<FaqGroup, string> = {
  money: "Money",
  trust: "Trust",
  privacy: "Privacy",
  practical: "Practical",
};

/** Render order. Money first: it is what blocks a purchase. */
const GROUP_ORDER: FaqGroup[] = ["money", "trust", "privacy", "practical"];

/**
 * The revision window in the Terms ("tell us within 14 days of delivery").
 * Change both together.
 */
export const REVISION_DAYS = 14;

/** Live figures for the proof blocks. Pages without a pricing region pass none and the blocks are omitted. */
export type FaqProofData = {
  receipt?: { planLabel: string; price: string; lines: string[] };
  timeline?: { checkIns: boolean; supportDays: number | null };
};

export const FAQS: Faq[] = [
  /* ── Money and process ─────────────────────────────────────────────── */
  {
    id: "how-much",
    keywords: ["price", "cost", "fee", "expensive", "cheap", "rupees", "how much", "worth it"],
    q: "How much does it cost?",
    group: "money",
    proof: "receipt",
    // Only the two pages that already resolve a pricing region. Tagging this
    // onto /about or /contact would drag those pages from static to dynamic
    // rendering for one sentence.
    tags: ["home", "pricing"],
    a: "",
    // HANDOVER-27 §1.4 — the video consultation is stated here, not just on
    // the card. At Rs. 3,000 as the only paid option it is the main reason
    // to choose this over a clinic visit at the same price, and the cost
    // question is exactly where someone is making that comparison.
    fromPricing: ({ paid, videoMinutes }) =>
      // HANDOVER-62: the free tier's offer ended on 30 September, and
      // payment is only possible in rupees, so neither old sentence is true.
      `Skin Transform is ${paid}, one payment, and includes a ${videoMinutes} ` +
      "minute video consultation with your practitioner. Payment is by bank " +
      "transfer in Pakistani rupees, and from abroad by international bank " +
      "transfer.",
  },
  {
    id: "how-to-pay",
    keywords: ["payment", "bank", "transfer", "card", "jazzcash", "easypaisa", "screenshot"],
    q: "How do I pay?",
    group: "money",
    tags: ["home", "pricing", "contact"],
    a:
      "By bank transfer. After you complete the assessment we show you the " +
      "account details, and you send the payment " +
      "screenshot on WhatsApp. We confirm it and your assessment begins.",
  },
  {
    id: "how-long",
    keywords: ["time", "fast", "quick", "when", "delivery", "hours", "wait"],
    q: "How long does it take?",
    group: "money",
    tags: ["home", "pricing", "contact", "about"],
    a:
      "Your assessment is written and sent within 24 hours of your payment " +
      "being confirmed.",
  },
  {
    id: "do-i-buy-products",
    keywords: ["commission", "brands", "sell", "products", "affiliate", "sponsored", "buy"],
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
    keywords: ["ai", "bot", "automated", "chatgpt", "human", "real person"],
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
    keywords: ["practitioner", "qualified", "credentials", "who", "ayma", "expert"],
    q: "Who reviews my photographs?",
    group: "trust",
    tags: ["home", "about"],
    a:
      // HOTFIX-30 §2 — name and title from PRACTITIONER, not retyped.
      `${PRACTITIONER.name}, ${PRACTITIONER.title}, with a BS in Cosmetology ` +
      "and Dermatology Science attested by the Higher Education Commission of " +
      `Pakistan. ${PRACTITIONER.experience}. See her credentials.`,
    links: [
      { text: "Ayma Arif", href: "/authors/ayma-arif" },
      { text: "See her credentials", href: "/credentials" },
    ],
  },
  {
    id: "photo-privacy",
    keywords: ["photos", "pictures", "private", "safe", "leak", "shared", "face"],
    q: "Are my photographs private?",
    group: "privacy",
    tags: ["home", "about", "contact"],
    // ⚠️ Every clause here is checked against the system, not the intent.
    // See the file header before strengthening it: the previous homepage
    // copy ("stored under an anonymous case ID") described a system that
    // does not exist, and "private storage" was only added once it was true.
    a:
      "Your photographs are used only to prepare your assessment. They are " +
      "held in private storage with no public web address, and opened only " +
      "through our practitioner portal, which requires a sign-in. They are " +
      "seen by the practitioner working on your case, and are never " +
      "published, sold, or used in marketing without your separate written " +
      "permission.",
  },
  {
    id: "is-this-medical",
    keywords: ["doctor", "dermatologist", "medicine", "prescription", "diagnose"],
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
    keywords: ["refund", "money back", "not working", "guarantee", "unhappy", "revise", "rewrite"],
    q: "What if I am not satisfied?",
    group: "trust",
    proof: "timeline",
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

  {
    id: "see-a-doctor",
    keywords: ["doctor", "urgent", "emergency", "painful", "spreading", "infection", "rash", "mole"],
    q: "When should I see a doctor instead?",
    group: "trust",
    tags: ["home", "about", "contact"],
    // The same wording as the consent step and the Terms (HANDOVER-58).
    a:
      "If your skin is painful, spreading quickly, bleeding or blistering, or " +
      "you feel unwell with it, see a doctor, and if it is urgent contact your " +
      "local emergency service rather than waiting for us. We give cosmetic " +
      "guidance and do not diagnose. If what we see needs a doctor, we tell " +
      "you so and refund you rather than write a routine.",
  },

  /* ── Privacy ───────────────────────────────────────────────────────── */
  {
    id: "photo-deletion",
    keywords: ["delete", "deleted", "keep", "stored", "how long", "photos", "data"],
    q: "What happens to my photographs afterwards?",
    group: "privacy",
    tags: ["home", "about", "contact"],
    // See the file header: true since the cleanup job's first runs, checked
    // on 28 October 2026. If the job stops, this sentence stops being true.
    a:
      "They are deleted automatically 30 days after you send them. Your " +
      "written report is kept, so you can refer back to it. If you want " +
      "everything deleted sooner, tell us and we will do it.",
  },

  /* ── Practical ─────────────────────────────────────────────────────── */
  {
    id: "what-photos",
    keywords: ["selfie", "camera", "filter", "makeup", "lighting", "angles"],
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
    keywords: ["follow up", "whatsapp", "support", "check in", "questions", "video call"],
    q: "Can I ask questions after I get my report?",
    group: "practical",
    tags: ["home", "pricing", "about"],
    // HANDOVER-27 §1.4 — one paid plan, so one answer. This described the
    // two-tier split ("Clarity includes one, Transform includes two"), which
    // is a distinction that no longer exists.
    a:
      "Yes. Skin Transform includes two follow-up check-ins across a month, " +
      "direct WhatsApp access to your practitioner for 30 days, and a 15 " +
      "minute video consultation.",
  },
  {
    id: "outside-pakistan",
    keywords: ["abroad", "overseas", "uk", "dubai", "usa", "international", "currency"],
    q: "Do you work with clients outside Pakistan?",
    group: "practical",
    tags: ["home", "pricing", "contact"],
    a:
      // Talha, 29 October 2026: clients abroad can pay by international
      // transfer; the account details are shared once they get in touch.
      "Yes, the assessment is online. Prices are in Pakistani rupees. From " +
      "abroad you can pay by international bank transfer: message us on " +
      "WhatsApp and we will send the details. Advice is written for the " +
      "climate and water conditions " +
      "where you actually live.",
  },
  {
    id: "men",
    keywords: ["male", "man", "boys", "gender"],
    q: "Is this only for women?",
    group: "practical",
    tags: ["home", "about"],
    // Every photograph on the site is of a woman, so men reasonably assume
    // the service is not for them. One line removes that barrier.
    a: "No. The assessment works the same regardless of gender.",
  },
];

/**
 * HANDOVER-52 §3.2 — "Who reviews my photographs?" names Ayma, which is
 * true while she is the only practitioner reviewing assessments. Pages pass
 * `team: await hasReviewingTeam()`, so the day a second reviewing
 * practitioner is approved this answer replaces it, and not before.
 */
const TEAM_REVIEWS: Pick<Faq, "id" | "a" | "links"> = {
  id: "who-reviews",
  a:
    "A qualified practitioner on our team reads your photographs and writes " +
    "your assessment, and their name and credentials are on your report. " +
    "Every practitioner's qualification is checked before they take on any " +
    "client. Meet the team.",
  links: [{ text: "Meet the team", href: "/about" }],
};

/** A question with its answer already resolved — no functions, ready to render or serialise. */
export type ResolvedFaq = Omit<Faq, "fromPricing">;

/**
 * The questions for one page, in group order.
 *
 * Pass `pricing` only from a page that already resolves a pricing region.
 * Without it, price-dependent questions are dropped rather than rendered
 * with a placeholder.
 */
export function resolveFaqs(tag: FaqTag, pricing?: FaqPricing, options: { team?: boolean } = {}): ResolvedFaq[] {
  return FAQS.filter((faq) => faq.tags.includes(tag))
    .filter((faq) => !faq.fromPricing || Boolean(pricing))
    .map(({ fromPricing, ...faq }) => ({
      ...faq,
      a: fromPricing && pricing ? fromPricing(pricing) : faq.a,
    }))
    .map((faq) => (options.team && faq.id === TEAM_REVIEWS.id ? { ...faq, ...TEAM_REVIEWS } : faq))
    .sort((a, b) => GROUP_ORDER.indexOf(a.group) - GROUP_ORDER.indexOf(b.group));
}

/** The groups actually present in a resolved set, in render order. */
export function faqGroupsPresent(faqs: ResolvedFaq[]): FaqGroup[] {
  return GROUP_ORDER.filter((group) => faqs.some((faq) => faq.group === group));
}
