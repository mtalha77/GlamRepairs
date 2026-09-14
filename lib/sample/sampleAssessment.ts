/**
 * HANDOVER-22 §3 — the demonstration assessment shown at /sample-assessment.
 *
 * ── Why this page exists ─────────────────────────────────────────────────
 * The single biggest objection to paying for an online skin assessment is
 * not price, it is "what do I actually get?". Every competitor answers that
 * with adjectives. Answering it with the document itself removes the doubt
 * in the only way that works: showing it.
 *
 * ── Why the content lives here rather than in the page ────────────────────
 * The section names, their order and their wording are not marketing copy —
 * they are the real report's structure, and they must not drift from it.
 * `SECTION_ORDER` below mirrors lib/studio/reportPdf.ts exactly. If a
 * section is added, renamed or reordered in the PDF, change it here too, or
 * this page starts advertising a document that is no longer delivered.
 *
 * ── Honesty rules this file is written under ──────────────────────────────
 * 1. The client is a composite, not a person. No real client's report, name,
 *    age, photograph or history appears here, and none may be added — a
 *    delivered assessment is health information about an identifiable
 *    person, and publishing one as a marketing asset is not something a
 *    consent checkbox at the photo step covers.
 * 2. Nothing here is presented as a testimonial or an outcome. It
 *    demonstrates the format and the depth of the writing, not results.
 * 3. The page states both of those in visible text, not only in this
 *    comment. See app/sample-assessment/page.tsx.
 * 4. No product brand names. The report's own quality gate
 *    (lib/studio/reportQuality.ts) blocks brand names in real reports; a
 *    sample that broke that rule would be advertising the opposite of the
 *    service's stated no-brand-bias position.
 */

export type SampleSection = {
  /** Exactly the heading the delivered PDF prints. */
  title: string;
  /** Rendered as paragraphs; blank lines separate them. */
  body?: string;
  /** Rendered as a list. Used where the PDF draws a bullet list. */
  bullets?: string[];
  /** Rendered as labelled sub-blocks, as the PDF's two-part sections are. */
  parts?: { label: string; body: string }[];
  /** Visually emphasised, matching the PDF's callout treatment. */
  callout?: boolean;
};

export const SAMPLE_PATIENT = {
  clientName: "Sample client",
  gender: "Female",
  age: "27 years",
  concern: "Post-acne marks and uneven tone",
  plan: "Clarity Plan",
  location: "Lahore, Pakistan",
  reportDate: "Illustrative — not a dated document",
  reference: "SAMPLE-0000",
} as const;

/**
 * The practitioner's own framing of what she was looking at. Written in the
 * second person, as delivered reports are, because the shift from "the
 * client presents with" to "your skin is doing" is most of what people are
 * paying for.
 */
export const SAMPLE_SECTIONS: SampleSection[] = [
  {
    title: "What we noticed",
    body:
      "Your photographs show flat brown marks across both cheeks and along the jawline, sitting where earlier breakouts were rather than anywhere new. They are not scars. Scar tissue changes the surface of the skin — you can see it catch the light at an angle — and yours does not. This is pigment left behind after inflammation settled, and pigment fades.\n\n" +
      "It fades slowly. On deeper skin tones the pigment response is stronger and lasts longer, which is why the advice written for lighter skin tends to disappoint people here: it is not that the routine failed, it is that the timeline it promised was never yours.\n\n" +
      "Two things in your photographs are working against the fading. The first is that you are still getting occasional new spots along the jawline, so fresh marks keep arriving behind the ones that are clearing. The second is sun exposure — the marks on the side of your face that gets the window light in the car are visibly darker than their mirror images on the other side. That asymmetry is the most useful thing in these photographs, because it tells you the pigment is still being actively driven, not just sitting there.\n\n" +
      "Your questionnaire says you have been using a vitamin C serum, an exfoliating toner most nights, and a clay mask twice a week. Between them, that is three separate actives competing for the same skin. The dryness and the stinging you described are not a reaction to any one of them; they are what happens when a barrier is asked to absorb all three.",
  },
  {
    title: "Start here",
    callout: true,
    body:
      "For the next fourteen days, do only this: a gentle cleanser at night, a plain moisturiser morning and night, and sunscreen every morning. Nothing else. Stop the exfoliating toner and the clay mask completely.\n\n" +
      "This is not a soft opening before the real routine. It is the part that makes the rest work. Your barrier is irritated, and actives applied to irritated skin drive more pigment, not less — you would be paying for the treatment and funding the problem at the same time. Two weeks of nothing is the fastest route you have.\n\n" +
      "If your skin is calm at the end of the fortnight — no stinging on application, no tight feeling after cleansing — add the routine below one product at a time, a week apart.",
  },
  {
    title: "Morning routine",
    body:
      "Rinse with water only. Your skin has not accumulated anything overnight that needs a cleanser, and cleansing twice a day is one of the quiet causes of the tightness you described.\n\n" +
      "Moisturiser while the skin is still slightly damp. Look for glycerin or hyaluronic acid high in the ingredients list, and a cream texture rather than a gel — gels evaporate quickly in dry air, which is most of the Lahore year.\n\n" +
      "Sunscreen, SPF 30 or higher, every single morning, including on days you do not leave the house and days when it is overcast. This is the one step in the whole report that is not optional. Everything else here fades pigment; this is what stops new pigment arriving. A vitamin C serum and an exfoliant without sunscreen is money spent on the wrong half of the problem.\n\n" +
      "Two fingers' length is the amount for a face. Almost everyone uses a third of that, and a third of the amount is closer to a third of the protection than to most of it. If the texture makes that quantity unbearable, change the sunscreen rather than the quantity — a sunscreen you will actually reapply beats a better one you will not.",
  },
  {
    title: "Night routine",
    body:
      "Cleanse. A cream or gel cleanser that does not leave your skin feeling squeaky — squeaky is stripped, not clean.\n\n" +
      "From week three, on alternate nights: a niacinamide serum at 4–5%. Higher percentages are widely sold and are not more effective for pigment; they are more likely to flush and sting. Niacinamide is the active with the best evidence for post-inflammatory pigment on deeper skin tones and the least likely to provoke the irritation that makes pigment worse.\n\n" +
      "From week six, on the nights you are not using niacinamide: an azelaic acid product at 10%. It works on both halves of your problem — the marks and the spots that keep producing new ones — which matters because you do not have enough calm nights to run a separate treatment for each.\n\n" +
      "Moisturiser on top, every night, over whichever active you used. This is not optional either: the moisturiser is what lets you keep using the actives long enough for them to do anything.\n\n" +
      "Do not add a third active. If you find yourself wanting to, that is the week to send us a photograph instead.",
  },
  {
    title: "What to avoid",
    bullets: [
      "Any physical scrub, brush or cloth. The marks are below the surface; scrubbing the surface inflames it and deepens them.",
      "Layering vitamin C, an exfoliating acid and a retinoid in the same routine. Pick one lane at a time.",
      "Lemon juice, baking soda, toothpaste and any other kitchen remedy on your face. All four are common here, all four raise or lower skin pH far outside what the barrier tolerates, and lemon juice in particular causes its own pigmentation in sunlight.",
      "Skin-lightening creams sold without a full ingredients list. The ones that work quickly usually contain a steroid or mercury, and both cause damage that is far harder to undo than the marks you started with.",
      "Changing the routine because nothing has happened in three weeks. Pigment fading is measured in months.",
      "Picking or squeezing new spots. Every one you press adds a mark that will still be there next summer.",
    ],
  },
  {
    title: "What to expect, week by week",
    body:
      "Weeks 1–2: nothing visible. The stinging and tightness should stop. That is the result for this fortnight, and it is the one the rest depends on.\n\n" +
      "Weeks 3–6: still little change in the marks. You may notice fewer new spots along the jawline. Your skin should tolerate the niacinamide without redness; if it does not, that is information, not failure — stop it and tell us.\n\n" +
      "Weeks 6–12: the first real change. The newest marks — the ones from the last couple of months — lighten first. Older marks lag, which makes progress look uneven before it looks good.\n\n" +
      "Months 3–6: the older marks begin to fade. Photograph yourself in the same light every four weeks, because this is slow enough that you will not see it happening day to day and quick enough that a photograph from six weeks ago will surprise you.\n\n" +
      "If there is no visible change at all by week eight, message us. That is not a signal to buy something stronger; it is a signal that something in the assessment needs revisiting, and revisiting it is included.",
  },
  {
    title: "How to tell it is working",
    parts: [
      {
        label: "Good signs",
        body:
          "Fewer new spots. Marks that look flatter and browner rather than red. Skin that feels comfortable an hour after the routine rather than tight. Make-up sitting better — usually the first thing people notice, and it happens before the marks visibly change.",
      },
      {
        label: "Stop and message us if",
        body:
          "Your skin burns or stings for more than a few minutes after applying anything. You develop redness, swelling, or small itchy bumps. The marks darken rather than lighten. Any spot becomes painful, grows, changes shape, or bleeds — that last one is outside what a skin assessment can answer and needs a doctor, not a routine.",
      },
    ],
  },
  {
    title: "Extra notes",
    body:
      "You mentioned a wedding in March. Six months is enough time for the newer marks and not enough for the oldest ones, so plan on improvement rather than clearance, and do not add anything aggressive in February to try to close the gap — a reaction three weeks before an event is the one outcome worse than the marks.\n\n" +
      "Your questionnaire mentioned that your sister has the same pattern of marks. That is common and it is not a reason to assume the same routine suits her; the jawline spots in your photographs point to something the marks alone would not, and she may not have that.",
  },
];

/**
 * The line every delivered report carries. Reproduced here because a sample
 * that omitted the limitations would be advertising a different product from
 * the one that arrives.
 */
export const SAMPLE_CLOSING =
  "This assessment is written from photographs and the answers you gave. It is not a diagnosis and it does not replace seeing a doctor. If anything on your skin is painful, spreading, bleeding or changing shape, see a dermatologist — tell us and we will say so plainly rather than writing you a routine.";

/** What the buyer is actually paying for, stated without adjectives. */
export const SAMPLE_VALUE_POINTS: { title: string; body: string }[] = [
  {
    title: "A person reads it, not a model",
    body:
      "Every assessment is written by a certified practitioner who has looked at your photographs. Nothing on this site is generated from a questionnaire score.",
  },
  {
    title: "Written for your skin tone and your climate",
    body:
      "Most skincare advice online is written for lighter skin in temperate weather, and the timelines it promises are not achievable here. The pigment timeline in the sample above is the honest one.",
  },
  {
    title: "No brand is being sold to you",
    body:
      "Assessments name ingredients and percentages, never product brands. Glam Repairs takes no commission from any brand, which is why it can afford to tell you the thing you already own is fine.",
  },
  {
    title: "It says what it cannot do",
    body:
      "Every report carries the limitations above, and an assessment that should be a doctor's visit is told so instead of being written a routine.",
  },
  {
    title: "Yours to keep",
    body:
      "Delivered as a PDF you can read, save and take to a dermatologist. It is not locked behind an app or a subscription.",
  },
];
