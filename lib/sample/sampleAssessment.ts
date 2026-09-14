/**
 * The demonstration assessment shown at /sample-assessment.
 *
 * HANDOVER-22 §3 created this page; HANDOVER-23 rebuilt it to the design
 * Talha supplied — a sticky report card beside a column that annotates what
 * each section of the report is doing, then the value grid.
 *
 * ── Why this page exists ─────────────────────────────────────────────────
 * The single biggest objection to paying for an online skin assessment is
 * not price, it is "what do I actually get?". Every competitor answers that
 * with adjectives. Answering it with the document itself removes the doubt
 * in the only way that works: showing it. The annotation column is what
 * turns showing into explaining — the report alone demonstrates quality to
 * someone who already knows what to look for, and the column tells everyone
 * else where to look.
 *
 * ── Why the content lives here rather than in the page ────────────────────
 * The section names and their order are not marketing copy — they are the
 * real report's structure, and they must not drift from it. If a section is
 * added, renamed or reordered in lib/studio/reportPdf.ts, change it here
 * too, or this page starts advertising a document that is no longer
 * delivered.
 *
 * ── Honesty rules this file is written under ──────────────────────────────
 * 1. The client is a COMPOSITE, not a person. No real client's report,
 *    name, age, photograph or history appears here, and none may be added —
 *    a delivered assessment is health information about an identifiable
 *    person, and publishing one as a marketing asset is not something a
 *    consent checkbox at the photo step covers.
 *
 *    ⚠️ The supplied design labelled this "shared with permission,
 *    identifying details removed". That wording is NOT used, and must not
 *    be reintroduced: it asserts that a real client's real report is on
 *    this page and that they agreed to it. Neither is true. A composite
 *    makes exactly the same sales argument without making a false claim
 *    about a real person's medical information — and if the claim were ever
 *    questioned, there is no permission to produce. The reference is
 *    "GR-SAMPLE" for the same reason: a realistic-looking one implies a
 *    record that could be looked up.
 * 2. Nothing here is a testimonial or an outcome. It demonstrates the
 *    format and the depth of the writing, not results.
 * 3. No product brand names. The report's own quality gate
 *    (lib/studio/reportQuality.ts) blocks brand names in real reports; a
 *    sample that broke that rule would advertise the opposite of the
 *    service's stated no-brand-bias position.
 */

export const SAMPLE_PATIENT = {
  clientName: "Sana",
  age: "26",
  concern: "Pigmentation",
  location: "Lahore",
  /** Deliberately not a realistic-looking reference. See rule 1 above. */
  reference: "GR-SAMPLE",
} as const;

/** A paragraph block — the body of most sections. */
type ProseBlock = { kind: "prose"; paragraphs: string[] };
/** A numbered routine, where the order is the instruction. */
type StepsBlock = { kind: "steps"; steps: { lead: string; rest: string }[] };
/** Short chips. Used only for "avoid", where a list would read as a routine. */
type ChipsBlock = { kind: "chips"; chips: string[] };
/** The week-by-week rail. */
type TimelineBlock = { kind: "timeline"; entries: { when: string; what: string }[] };
/** The single boxed safety note. */
type NoticeBlock = { kind: "notice"; body: string };

export type SampleBlock =
  | ProseBlock
  | StepsBlock
  | ChipsBlock
  | TimelineBlock
  | NoticeBlock;

export type SampleSection = {
  /** Exactly the heading the delivered report prints. */
  title: string;
  block: SampleBlock;
};

export const SAMPLE_SECTIONS: SampleSection[] = [
  {
    title: "What we noticed",
    block: {
      kind: "prose",
      paragraphs: [
        "Sana, the patches across your cheekbones are symmetrical, and they sit in the same pattern on both sides. That symmetry matters, because it separates melasma from the post-acne marks you mentioned worrying about. The two respond to very different things.",
        "Your barrier also looks stressed. You described stinging with vitamin C, and there is visible redness around the nose in your second photograph. That tells me we start gently, not aggressively.",
        "You mentioned four hours a day commuting. Combined with a car window on your right side, that is almost certainly why the right cheek is a shade darker.",
      ],
    },
  },
  {
    title: "Start here",
    block: {
      kind: "prose",
      paragraphs: [
        "If you do only one thing for the next two weeks: sunscreen, every morning, including indoors and in the car. Everything else on this page depends on it.",
      ],
    },
  },
  {
    title: "Morning",
    block: {
      kind: "steps",
      steps: [
        {
          lead: "Gentle non-foaming cleanser.",
          rest: "Yours is stripping, which is feeding the redness.",
        },
        {
          lead: "Niacinamide serum.",
          rest: "Not vitamin C for now. It irritated you, and niacinamide works on pigment without the sting.",
        },
        { lead: "Light moisturiser", rest: "— gel or fluid." },
        {
          lead: "SPF 50, reapplied on commute days.",
          rest: "A tinted one helps, because visible light drives melasma too.",
        },
      ],
    },
  },
  {
    title: "Evening",
    block: {
      kind: "steps",
      steps: [
        { lead: "Same cleanser, used properly.", rest: "Thirty seconds, not five." },
        { lead: "Azelaic acid,", rest: "three nights a week to begin." },
        { lead: "Moisturiser", rest: "with ceramides." },
      ],
    },
  },
  {
    title: "Avoid for now",
    block: {
      kind: "chips",
      chips: [
        "Vitamin C serums",
        "Scrubs",
        "Brightening creams",
        "Hot water",
        "Adding anything new",
      ],
    },
  },
  {
    title: "What to expect",
    block: {
      kind: "timeline",
      entries: [
        {
          when: "Weeks 1 to 2.",
          what: "Redness settles. Pigment unchanged, and that is normal.",
        },
        {
          when: "Weeks 3 to 6.",
          what: "Skin tolerates azelaic acid better. Edges of patches soften.",
        },
        {
          when: "Weeks 8 to 12.",
          what: "Visible lightening, if sunscreen has been daily.",
        },
        {
          when: "No change by week 12?",
          what: "Message me. That is information, not failure.",
        },
      ],
    },
  },
  {
    title: "When to see a doctor",
    block: {
      kind: "notice",
      body: "If any patch changes shape, develops an irregular border or bleeds, see a doctor rather than waiting. Nothing in your photographs suggests that, but it is worth knowing what to watch for.",
    },
  },
];

/**
 * The annotation column.
 *
 * `section` is the 1-based number of the report section each note refers to,
 * so the two columns cannot drift apart when a section is added.
 */
export const SAMPLE_ANNOTATIONS: {
  section: string;
  title: string;
  body: string;
}[] = [
  {
    section: "Section 1",
    title: "She names what she saw",
    body: "Not a skin type label. Actual observations from the photographs: which side is darker, where the redness sits, whether the pattern is symmetrical. A questionnaire cannot produce this.",
  },
  {
    section: "Section 1",
    title: "Your answers come back to you",
    body: "The commute, the vitamin C reaction, the thing you were worried about. Your report references what you actually told us, because it was read rather than processed.",
  },
  {
    section: "Section 2",
    title: "One instruction to start with",
    body: "Seven new habits at once is how routines fail. You get told which single change matters most, and when to add the rest.",
  },
  {
    section: "Sections 3 & 4",
    title: "Ingredients, with the reason",
    body: "Every step says why it is there and why it suits you specifically. Niacinamide instead of vitamin C, because yours stung. Reasoning you can carry to any shop.",
  },
  {
    section: "Section 6",
    title: "Honest timelines",
    body: "Including what will not have changed yet. Most people quit at week three because nobody told them week three looks like nothing.",
  },
  {
    section: "Section 7",
    title: "The limits, stated",
    body: "If your case needs a doctor we say so and refund you. We would rather lose the sale than sell a routine that cannot help.",
  },
];

/** Keys into SAMPLE_ICONS in components/sample/SampleIcons.tsx. */
export type SampleValueIcon =
  | "magnifier"
  | "document"
  | "chat"
  | "shield"
  | "clock"
  | "star";

/**
 * What the buyer is actually paying for, stated without adjectives.
 *
 * `body` is a function where the claim depends on data, so the follow-up
 * window and the price come from plan_settings and pricing_regions rather
 * than being typed here — the same rule /compare is built under. A marketing
 * card that outlives the decision to change "30 days" is exactly how these
 * numbers go stale.
 */
export type SampleValueCard = {
  icon: SampleValueIcon;
  title: string;
  body: string;
};

export function sampleValueCards(opts: {
  supportDays: number | null;
}): SampleValueCard[] {
  const followUp = opts.supportDays
    ? `${opts.supportDays} days of follow-up`
    : "Follow-up included";

  return [
    {
      icon: "magnifier",
      title: "A person reads your photographs",
      body: "Not an algorithm, and not a questionnaire. A certified practitioner opens every image at full size before writing a word.",
    },
    {
      icon: "document",
      title: "A plan you keep",
      body: "Written down, in order, with the reasoning. Re-read it in six months instead of half-remembering a conversation.",
    },
    {
      icon: "chat",
      title: followUp,
      body: "Questions answered on WhatsApp by the practitioner who wrote your plan, not a support desk.",
    },
    {
      icon: "shield",
      title: "Nothing to sell you",
      body: "We take no commission from any brand. If the cheaper option suits your skin, your report says so.",
    },
    {
      icon: "clock",
      title: "Within 24 hours",
      body: "No waiting list, no appointment, no travel. Sent once your payment is confirmed.",
    },
    {
      icon: "star",
      title: "Credentials you can check",
      body: "A named practitioner with an HEC-attested degree. Every reference number is on the site, not just claimed.",
    },
  ];
}
