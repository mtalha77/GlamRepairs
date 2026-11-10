/**
 * Copy for /about, kept as data so the section components stay pure
 * presentation. Rewritten 4 September 2026 — see app/about/page.tsx for the
 * word-count and credential-accuracy verification this rewrite must satisfy.
 *
 * ⚠️ Credential accuracy: Ayma Arif holds a BS in Cosmetology & Dermatology
 * Science (BS, not BSc — Pakistani universities award BS). She is never
 * "Dr." anywhere in this file — that title implies PMDC
 * registration in a health context, contradicts the site's own Terms (no
 * diagnosis, no prescription), and is a disprovable E-E-A-T liability rather
 * than a credibility asset. See lib/seo/authors.ts for the same credential
 * carried in structured data.
 */

export const aboutHeroBackground = "/images,svgs/about-hero.webp";

export const aboutHero = {
  headlineLead: "Online skin consultations, read by",
  headlineEmphasis: "a person",
  subtitle:
    "Healthy skin starts with the right information, not the most expensive " +
    "products. Glam Repairs gives you a personalised skincare routine, " +
    "assessed by a certified aesthetics practitioner, written for the skin " +
    "you actually have, the climate you actually live in, and the products " +
    "you can actually buy where you are.",
};

/** "What Glam Repairs is" */
export const whatWeAre = {
  headingLead: "What Glam Repairs",
  headingEmphasis: "is",
  paragraphs: [
    "Glam Repairs is an online skin consultation service. You answer a " +
      "structured questionnaire about your skin, its history and your " +
      "routine, you send photographs, and a certified aesthetics " +
      "practitioner reviews everything personally and writes you an " +
      "assessment with a routine you can follow.",
    "It is cosmetic guidance, and we are precise about that because the " +
      "distinction matters. We do not diagnose conditions, prescribe " +
      "medication or provide treatment. That is a doctor's work, and if " +
      "your concern needs one, our practitioner will tell you so and hold " +
      "your fee as a credit rather than sell you a routine that cannot help. " +
      "What we do is the part most people never get: someone qualified " +
      "looking at your actual skin and explaining what is happening, in " +
      "order, with reasons.",
  ],
};

/**
 * "Who reviews your skin". About page rewrite, 10 November 2026: no single
 * named person reviews every assessment any more. The client chooses a
 * practitioner, and that practitioner's name and qualification go on the
 * assessment. Ayma's own paragraph (PRACTITIONER.experienceLong) and her
 * credentials card follow these paragraphs.
 */
export const whoReviews = {
  headingLead: "Who reviews",
  headingEmphasis: "your skin",
  subheadingLead: "Reviewed by a certified practitioner,",
  subheadingEmphasis: "and you choose which one.",
  paragraphs: [
    "The pattern our practitioners kept seeing is the reason this service " +
      "exists: the same clients came back, not because the advice was " +
      "wrong, but because there was no way to get consistent, personalised " +
      'guidance between appointments, and no affordable way to ask "is ' +
      'this working?" six weeks in.',
    "A clinic visit answers one question on one day. Skin does not work " +
      "on that schedule.",
    "The name and qualification of the practitioner who read your " +
      "photographs is attached to every assessment that leaves here. If " +
      "you want to know who read yours, you picked them.",
  ],
};

/** "You choose who reads your skin". The countries line is generated from practitioner_public. */
export const youChoose = {
  headingLead: "You choose who",
  headingEmphasis: "reads your skin",
  paragraphs: [
    "Most services assign you someone. We do not.",
    "Every practitioner publishes their qualification with its reference " +
      "number, the languages they work in, the concerns they read most " +
      "often, and how soon they can take you. Read them and pick. If you " +
      "would rather we chose, say so and we will.",
  ],
  /** Followed by the countries line, then this. */
  countriesNote: "Where they are affects when they are awake, not whether they can help you.",
  cta: { label: "Meet the practitioners", href: "/practitioners" },
};

/** "How a consultation works" — four steps. */
export const howItWorks = [
  {
    title: "Tell us about your skin.",
    body:
      "A structured questionnaire covering your skin type, concerns, how " +
      "long they have persisted, your current products, and the lifestyle " +
      "factors that affect skin: sleep, water, stress, sun exposure.",
  },
  {
    title: "Send your photographs.",
    body:
      "We will guide you through taking usable images. Poor photographs " +
      "produce poor assessments, so if what you send is too dark, blurred " +
      "or filtered, we will ask you to retake them rather than guess.",
  },
  {
    title: "A practitioner reviews it.",
    body:
      "Manually. Your questionnaire, your history and your photographs " +
      "are read together, because a product that suits your skin type " +
      "can still be wrong given your history.",
  },
  {
    title: "You receive your routine.",
    body:
      "A written assessment explaining what is happening with your skin " +
      "and what to do about it: morning and evening, in order, with the " +
      "reasoning, and what to expect and when.",
  },
];

/**
 * "Why a routine has to know where you live". Retitled 10 November 2026 from
 * "Why skin in Pakistan needs advice written for Pakistan". Every Pakistani
 * example stays: the specificity is what makes the service credible. The
 * third paragraph carries the same reasoning to the other places clients
 * write from.
 */
export const whereYouLive = {
  headingLead: "Why a routine has to know",
  headingEmphasis: "where you live",
  paragraphs: [
    "Most skincare advice online is written for temperate climates and " +
      "soft water. It does not survive contact with a Lahore summer.",
    "Hard water across much of urban Pakistan leaves mineral deposits " +
      "that make cleansers less effective and skin feel tight after " +
      "washing, routinely misread as dryness and treated with heavier " +
      "creams that make congestion worse. Humidity in Karachi changes " +
      "which textures your skin can tolerate; a moisturiser that works " +
      "in Islamabad in January can be the reason you are breaking out in " +
      "June. Air quality in major cities means a meaningful particulate " +
      "load sitting on your skin all day, which changes how much " +
      "cleansing matters and what kind. Sun exposure at this latitude is " +
      "more intense year-round than the advice written for European skin " +
      "assumes, and it is the single biggest driver of the pigmentation " +
      "concerns we see most.",
    "The same reasoning applies wherever you are. Hard water in London " +
      "does what hard water in Lahore does. Air conditioning in Dubai " +
      "dehydrates skin the way a Toronto winter does, by a different " +
      "route. Lagos humidity changes which textures work, as Karachi's " +
      "does. None of this is exotic once someone asks about it, and " +
      "almost nobody asks.",
    "A routine that ignores all of this is a routine built for someone " +
      "else's skin. Yours is assessed with your conditions taken as " +
      "given, not as an afterthought.",
  ],
};

/** "What we will not do" — four boundaries. */
export const whatWeWontDo = [
  {
    lead: "We do not recommend brands.",
    body:
      "We tell you ingredient categories and product types (a " +
      "niacinamide serum, a ceramide-based moisturiser) so you can buy " +
      "whatever is available and affordable near you. We take no " +
      "commission from any brand, and if that ever changes we will say " +
      "so on this page.",
  },
  {
    lead: "We do not use AI to write your assessment.",
    body:
      "There is no algorithm generating your routine. A person with a " +
      "qualification reads your case and writes it.",
  },
  {
    lead: "We do not guarantee outcomes.",
    body:
      "Skin varies. Any timeline in your report is an estimate based on " +
      "typical responses, not a promise, and anyone promising you " +
      "certainty is selling something.",
  },
  {
    lead: "We do not treat medical conditions.",
    body: "If your concern needs a doctor, we will say so.",
  },
];


