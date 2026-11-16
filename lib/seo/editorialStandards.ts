/**
 * The "How this was written" box at the end of every article (Handover 73
 * Part 3.1). One constant, so a change is a one-line edit.
 *
 * 🔴 The commission sentence is a live promise. If a paid brand arrangement
 * goes ahead (Handover 61 Part 12), THIS is one of the places that must
 * change, along with /about, /editorial-policy and the Terms.
 *
 * It says "where we discuss a brand" rather than "we never name brands":
 * the COSRX, Beauty of Joseon and Anua guides do name brands, describing
 * what the products contain.
 */
export const EDITORIAL_STANDARDS = {
  lead: "How this was written.",
  body:
    "Written by a certified aesthetics practitioner and reviewed before publication. " +
    "We name ingredients and strengths, and where we discuss a brand we describe what its products contain. " +
    "No brand pays to appear, and we take no commission from any brand. " +
    "Where a concern needs a doctor, we say so.",
  links: [
    { label: "Our editorial policy", href: "/editorial-policy" },
    { label: "How an assessment works", href: "/how-assessments-work" },
  ],
} as const;
