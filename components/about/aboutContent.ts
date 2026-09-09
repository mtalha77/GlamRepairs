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

export const aboutHeroBackground = "/images,svgs/about-hero.png";

export const aboutHero = {
  headlineLead: "Online skin consultations, built for",
  headlineEmphasis: "Pakistani skin",
  subtitle:
    "Healthy skin starts with the right information, not the most expensive " +
    "products. Glam Repairs gives you a personalised skincare routine — " +
    "assessed by a certified aesthetics professional, written for the skin " +
    "you actually have, the climate you actually live in, and the products " +
    "you can actually buy in Pakistan.",
};

/** "What Glam Repairs is" */
export const whatWeAre = {
  headingLead: "What Glam Repairs",
  headingEmphasis: "is",
  paragraphs: [
    "Glam Repairs is an online skin consultation service. You answer a " +
      "structured questionnaire about your skin, its history and your " +
      "routine, you send photographs, and a certified aesthetics " +
      "professional reviews everything personally and writes you an " +
      "assessment with a routine you can follow.",
    "It is cosmetic guidance, and we are precise about that because the " +
      "distinction matters. We do not diagnose conditions, prescribe " +
      "medication or provide treatment — that is a doctor's work, and if " +
      "your concern needs one, our practitioner will tell you so and we " +
      "will refund you rather than sell you a routine that cannot help. " +
      "What we do is the part most people never get: someone qualified " +
      "looking at your actual skin and explaining what is happening, in " +
      "order, with reasons.",
  ],
};

/** "Who reviews your skin" — the expert bio. Renders inside OurStorySection. */
export const whoReviews = {
  headingLead: "Who reviews",
  headingEmphasis: "your skin",
  subheadingLead: "Reviewed by a",
  subheadingEmphasis: "certified professional.",
  expertName: "Ayma Arif, BS Cosmetology & Dermatology Science,",
  paragraphs: [
    "has spent years working across clinics in Pakistan with clients " +
      "whose concerns ranged from acne and pigmentation to dryness and " +
      "sensitivity. The pattern she kept seeing is the reason this " +
      'service exists: the same clients came back, not because the ' +
      "advice was wrong, but because there was no way to get consistent, " +
      'personalised guidance between appointments — and no affordable ' +
      'way to ask "is this working?" six weeks in.',
    "A clinic visit answers one question on one day. Skin does not work " +
      "on that schedule. Her name, her qualification and her review are " +
      "attached to every assessment that leaves here — if you want to " +
      "know who read your photographs, the answer is on this page.",
  ],
};

/** "How a consultation works" — four steps. */
export const howItWorks = [
  {
    title: "Tell us about your skin.",
    body:
      "A structured questionnaire covering your skin type, concerns, how " +
      "long they have persisted, your current products, and the lifestyle " +
      "factors that affect skin — sleep, water, stress, sun exposure.",
  },
  {
    title: "Send your photographs.",
    body:
      "We will guide you through taking usable images. Poor photographs " +
      "produce poor assessments, so if what you send is too dark, blurred " +
      "or filtered, we will ask you to retake them rather than guess.",
  },
  {
    title: "A professional reviews it.",
    body:
      "Manually. Your questionnaire, your history and your photographs " +
      "are read together, because a product that suits your skin type " +
      "can still be wrong given your history.",
  },
  {
    title: "You receive your routine.",
    body:
      "A written assessment explaining what is happening with your skin " +
      "and what to do about it — morning and evening, in order, with the " +
      "reasoning, and what to expect and when.",
  },
];

/** "Why skin in Pakistan needs advice written for Pakistan" */
export const whyPakistan = {
  headingLead: "Why skin in Pakistan needs advice",
  headingEmphasis: "written for Pakistan",
  paragraphs: [
    "Most skincare advice online is written for temperate climates and " +
      "soft water. It does not survive contact with a Lahore summer.",
    "Hard water across much of urban Pakistan leaves mineral deposits " +
      "that make cleansers less effective and skin feel tight after " +
      "washing — routinely misread as dryness and treated with heavier " +
      "creams that make congestion worse. Humidity in Karachi changes " +
      "which textures your skin can tolerate; a moisturiser that works " +
      "in Islamabad in January can be the reason you are breaking out in " +
      "June. Air quality in major cities means a meaningful particulate " +
      "load sitting on your skin all day, which changes how much " +
      "cleansing matters and what kind. Sun exposure at this latitude is " +
      "more intense year-round than the advice written for European skin " +
      "assumes, and it is the single biggest driver of the pigmentation " +
      "concerns we see most.",
    "A routine that ignores all of this is a routine built for someone " +
      "else's skin. Yours is assessed with these conditions taken as " +
      "given, not as an afterthought.",
  ],
};

/** "What we will not do" — four boundaries. */
export const whatWeWontDo = [
  {
    lead: "We do not recommend brands.",
    body:
      "We tell you ingredient categories and product types — a " +
      "niacinamide serum, a ceramide-based moisturiser — so you can buy " +
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


