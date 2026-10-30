/**
 * Client reviews — HANDOVER-12 §4.
 *
 * Data, not JSX. The drum (HANDOVER-61) always has six faces and repaints
 * them as it turns, so adding a seventh review, or a hundredth, is one object
 * here and changes nothing about the geometry.
 *
 * ── Two things to keep true ──────────────────────────────────────────────
 * 1. These are real clients' words, supplied by Talha. Nothing here is
 *    written by anyone other than the person credited. Do not paraphrase a
 *    quote to make it scan better, do not compose a new one to fill a gap,
 *    and do not add an entry that is not a review someone actually left.
 *    A fabricated testimonial is a false statement about a named person on
 *    a YMYL site, which is a different order of problem from a typo.
 * 2. Keep quotes to roughly 30 words. The drum's faces are a fixed height,
 *    which is what stops the section jolting as reviews of different
 *    lengths come round, so a much longer quote will be clipped.
 */
export type Review = {
  quote: string;
  name: string;
  /**
   * City only. Never a full address, and never a surname the client did not give.
   * Kept for the record: the site shows the country instead (Handover 61 Part 8.2).
   */
  city: string;
  /**
   * ISO country code, for the filter chips (HANDOVER-61 Part 2). The chips
   * only appear once reviews come from more than one country: two chips
   * where one is empty is worse than none.
   */
  country: string;
};

export const REVIEWS: Review[] = [
  {
    quote:
      "What I liked was that they asked questions first and actually looked " +
      "at what I was already using. After a few weeks I was getting " +
      "noticeably fewer breakouts.",
    name: "Areeba Siddiqui",
    city: "Lahore",
    country: "PK",
  },
  {
    quote:
      "Most places I went to just wanted to sell me another product. That was " +
      "the difference here. Ayma took the time to understand what I was " +
      "already doing.",
    name: "Komal Rauf",
    city: "Karachi",
    country: "PK",
  },
  {
    quote:
      "I was a bit sceptical about doing this online. Nobody was trying to " +
      "sell me anything. After about a month my skin was much easier to " +
      "manage.",
    name: "Saba H.",
    city: "Karachi",
    country: "PK",
  },
  {
    quote:
      "I expected to be handed a list of products to buy. Instead it was " +
      "about working out what I was doing wrong. My skin is much less " +
      "congested now.",
    name: "Hania Shah",
    city: "Lahore",
    country: "PK",
  },
  {
    quote:
      "My skin is quite sensitive so I am always hesitant. Ayma helped me " +
      "work out what was actually irritating it, rather than adding more to " +
      "my routine.",
    name: "Alina Javed",
    city: "Faisalabad",
    country: "PK",
  },
  {
    quote:
      "The form took a few minutes and was easy to follow. My concern was " +
      "dullness and uneven texture, and my skin was looking fresher after a " +
      "few weeks.",
    name: "Rabia Nadeem",
    city: "Rawalpindi",
    country: "PK",
  },
];
