/**
 * HANDOVER-22 §5b — every figure on /compare, with the place it came from.
 *
 * ── The rule this file enforces ──────────────────────────────────────────
 * "Cite every number, with a link. This page will be checked." So a figure
 * that has no entry here does not belong on the page: cells carry a source
 * id, the footnote list is generated from the ids actually used, and an
 * uncited number is a visible gap rather than an invisible claim.
 *
 * ── Figures deliberately NOT used ────────────────────────────────────────
 * The handover suggested three fairness-cream statistics — 51.5% usage
 * among women 18–45, mercury at 3.6–240 ppm, and "one of twelve products
 * within approved hydroquinone limits". None could be traced to a specific
 * citable study: the 51.5% figure appears attributed to a 412-respondent
 * survey that could not be identified, and the PAFMJ paper it is often
 * confused with surveyed 250 patients, not 412. The handover's own rule is
 * "Do not invent a statistic", so the published, checkable figures from the
 * two studies below are used instead. They make the same point with numbers
 * that survive being looked up.
 *
 * ⚠️ `checkedOn` is when the figure was read, not when it was published.
 * Consultation fees move; the page says so in the sourcing note rather than
 * presenting a 2026 reading as a permanent fact. Re-check the two oladoc
 * rows before quoting them in anything dated much later than this.
 */

export type CompareSource = {
  id: string;
  /** What the reader is being pointed at, in plain words. */
  label: string;
  url: string;
  /** ISO date the figure was read from the source. */
  checkedOn: string;
  /** The claim this source actually supports, stated exactly. */
  supports: string;
};

export const COMPARE_SOURCES: Record<string, CompareSource> = {
  oladocLahore: {
    id: "oladocLahore",
    label: "oladoc — dermatology consultation prices, Lahore",
    url: "https://oladoc.com/pakistan/lahore/treatment/dermatology",
    checkedOn: "2026-09-14",
    supports:
      "oladoc's own stated range for top doctors treating dermatology in Lahore is Rs. 300 to Rs. 5,000.",
  },
  oladocVideo: {
    id: "oladocVideo",
    label: "oladoc — dermatologist video consultations",
    url: "https://oladoc.com/pakistan/video-consultation/dermatologist",
    checkedOn: "2026-09-14",
    supports:
      "Dermatologist video consultation fees are stated as typically Rs. 1,000 to Rs. 3,500, varying with the doctor's experience.",
  },
  marhamFees: {
    id: "marhamFees",
    label: "Marham — doctor consultation fees in Pakistan",
    url: "https://www.marham.pk/healthhub/medical-consultation-cost-in-pakistan/",
    checkedOn: "2026-09-14",
    supports:
      "General doctor consultation fees in Pakistan are given as roughly Rs. 500 to Rs. 5,000 depending on seniority and setting.",
  },
  creamsLahore2026: {
    id: "creamsLahore2026",
    label:
      "Biological Trace Element Research (2026) — hydroquinone, mercury and steroids in skin-lightening creams marketed in Pakistan",
    url: "https://link.springer.com/article/10.1007/s12011-026-05237-9",
    checkedOn: "2026-09-14",
    supports:
      "Ten brands sampled from the Lahore market contained hydroquinone up to 5.56% and mercury up to 4.9 ppm, above USFDA and PSQCA limits, plus undeclared corticosteroids — hydrocortisone in 50% of samples, betamethasone and prednisolone in 30%, dexamethasone in 20%.",
  },
  creamsSustainability: {
    id: "creamsSustainability",
    label:
      "Sustainability 13(16):8786 (2021) — hydroquinone and mercury in skin-lightening creams available in Pakistan",
    url: "https://doi.org/10.3390/su13168786",
    checkedOn: "2026-09-14",
    supports:
      "Across 20 samples from the Pakistani market, mercury was detected in 95% and exceeded Pakistan's 1 ppm limit in 75%, ranging from 0 to 7.7 ppm with a median of 2.5 ppm.",
  },
  ftcInfluencers: {
    id: "ftcInfluencers",
    label: "US Federal Trade Commission — Disclosures 101 for Social Media Influencers",
    url: "https://www.ftc.gov/business-guidance/resources/disclosures-101-social-media-influencers",
    checkedOn: "2026-09-14",
    supports:
      "A paid relationship, free product or discount is a 'material connection' that has to be disclosed with the endorsement itself — the standard that exists where influencer marketing is regulated.",
  },
};

export function compareSource(id: string): CompareSource {
  const source = COMPARE_SOURCES[id];
  if (!source) {
    // Loud rather than silent: an unknown id means a figure lost its
    // citation, which is the one failure this page cannot ship with.
    throw new Error(`[compare] no source registered for "${id}"`);
  }
  return source;
}
