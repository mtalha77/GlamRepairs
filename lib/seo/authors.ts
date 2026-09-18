/**
 * Author and medical-reviewer registry — the E-E-A-T backbone.
 *
 * ── Why this file exists ─────────────────────────────────────────────────────
 * Skincare is YMYL ("Your Money or Your Life"). Google holds it to the
 * strictest quality bar in search, and sites that publish YMYL content without
 * a named, credentialed author and a visible reviewer are the exact profile
 * that core updates demote.
 *
 * A byline alone is not enough. Google's raters look for a bio *page* carrying
 * the credential, the registration number where one exists, a photo, and links
 * out to verifiable profiles. That is what `/authors/[slug]` renders from here.
 *
 * ── One decision you have to make ────────────────────────────────────────────
 * E-E-A-T cannot be done anonymously. The practitioner's real name and
 * credentials must be public for any of this to work. If the brand would
 * rather stay unnamed, the honest answer is that the blog strategy does not
 * work in a YMYL niche and the budget belongs in paid instead.
 */
import { CREDENTIALS, getCredential } from "./site";

export type Author = {
  slug: string;
  name: string;
  /**
   * The one job title used for this person everywhere they're credited.
   * e.g. "Certified Aesthetics Practitioner" — do not let a second variant
   * ("Certified Aesthetician", "Aesthetics Practitioner", ...) creep back in
   * anywhere this person is named. Inconsistent titles for the same named
   * person undercut the Person schema / `sameAs` wiring, whose whole point is
   * telling Google these mentions are one entity.
   */
  title: string;
  /** e.g. "BS Cosmetology & Dermatology Science" — BS, never BSc; Pakistani
   * universities award BS. */
  credentials: string;
  /** Professional registration number, when one applies. */
  regNo?: string;
  /** Path under /public. Square, at least 400×400. */
  photo?: string;
  /** 2–4 sentences. Concrete experience beats adjectives. */
  bio: string;
  /** Verifiable external profiles — LinkedIn, professional register, etc. */
  profiles?: { label: string; url: string }[];
  /** A professional body membership worth carrying in structured data. */
  memberOf?: { name: string; url: string; membershipNo?: string };
  /**
   * @deprecated HOTFIX-26 §1 — nothing renders this, and nothing should.
   *
   * It fed two things and broke both: the visible degree line (dropped in
   * HOTFIX-25 §2.2) and `recognizedBy` on the degree node in the Person
   * schema, which is emitted site-wide and so put the university on all 16
   * public pages. `recognizedBy` now names the attesting body, which is what
   * the node's `identifier` actually refers to.
   *
   * The awarding university belongs on /credentials, in the `hec-degree`
   * note, where there is room for the sentence that makes it meaningful.
   * Do not reintroduce a field that renders it anywhere else.
   */
  institution?: string;
  /**
   * HEC (Higher Education Commission of Pakistan) e-Attestation reference for
   * the primary credential. This is the load-bearing verification line on the
   * whole site — an official Government of Pakistan confirmation the degree
   * is genuine — so give it visual weight wherever CredentialsBlock renders.
   * See HOTFIX-6 §2: the reference number alone is a claim; pairing it with
   * the actual redacted e-Attestation certificate on /credentials is evidence.
   */
  hecReference?: string;
  /** Non-degree continuing education — credited, never conflated with the degree. */
  continuingEducation?: string[];
  /**
   * Hands-on practice, as one line for the credential stack — HOTFIX-30.
   *
   * ── Experience, and deliberately not a credential ────────────────────────
   * This sits at the END of the stack, after the degree, the attestation, the
   * membership and the coursework, because it is a different kind of claim:
   * nothing issued it and no reference number confirms it. Putting it last
   * keeps the checkable items at the top, where a sceptical reader looks
   * first, and stops an unverifiable line borrowing their authority.
   *
   * In structured data it is `hasOccupation`, never
   * `EducationalOccupationalCredential` — see personSchema.
   *
   * ⚠️ WORDING IS FIXED. HOTFIX-30 Part 3 chose each word against a specific
   * failure:
   *   "aesthetic clinics"  not "well-known clinics"   — unverifiable puff
   *                                                     beside two real
   *                                                     reference numbers
   *   "practice"           not "clinical experience"  — "clinical" implies a
   *                                                     clinician, which she
   *                                                     is not
   *   "in Lahore"          not "across Pakistan"      — a named city reads as
   *                                                     fact, vague geography
   *                                                     reads as padding
   *   "Five years"         not "5 years"              — words, matching the
   *                                                     rest of the stack
   * Never "worked alongside doctors": it borrows authority nobody claimed.
   */
  experience?: string;
  /**
   * The same fact as an argument, for pages with room to make one.
   *
   * `experience` is a credential line. This is why the credential matters:
   * it connects her background to the thing clients actually pay for, which
   * is whether a photograph can be read. Only /about and /authors/[slug]
   * have the space; everywhere else uses the single line.
   */
  experienceLong?: string;
  /**
   * One sentence stating the limits of this person's scope. HOTFIX-6 §1:
   * this is not a hedge to soften — it is the fix. An AI crawler flagged this
   * site for being unclear whether these are medical credentials; stating the
   * limit plainly resolves the ambiguity that grander language would deepen.
   * Rendered every time CredentialsBlock appears.
   */
  scopeDisclaimer?: string;
  /** Topics for the Person schema's `knowsAbout` — what the engines should associate this person with. */
  knowsAbout?: string[];
  /**
   * Which entries in `CREDENTIALS` (lib/seo/site.ts) belong to this person.
   * The degree and the society membership already have dedicated fields
   * above, which the Person schema uses; this exists so *coursework* also
   * reaches structured data without inventing a second place to type it.
   */
  credentialIds?: string[];
  /** Can this person sign off clinical accuracy on a post? */
  canReview: boolean;
};

/**
 * Resolved from lib/seo/site.ts so the reference numbers exist in exactly one
 * place. `/credentials` renders the CREDENTIALS array; the Person schema and
 * every CredentialsBlock render these fields. Before this they were two
 * hand-typed copies of the same numbers, which is how a site ends up quoting
 * a membership number that no longer matches the one it publishes.
 */
const HEC = getCredential("hec-degree");
const IDS = getCredential("ids-membership");
const TELEHEALTH = getCredential("duke-telehealth");

export const AUTHORS: Record<string, Author> = {
  "ayma-arif": {
    slug: "ayma-arif",
    name: "Ayma Arif",
    title: "Certified Aesthetics Practitioner",
    credentials: "BS Cosmetology & Dermatology Science",
    // Deliberately left unset. Schema pointing at a 404 image is worse than no
    // image — Google flags unresolvable `image` values. Drop a square photo at
    // `public/authors/ayma-arif.jpg` (≥400×400), then uncomment:
    // photo: "/authors/ayma-arif.jpg",
    bio:
      "Ayma Arif is a certified aesthetics practitioner who has reviewed skin " +
      "assessments for clients across Pakistan. She writes and reviews the " +
      "diagnostic content on GlamRepairs, with a focus on telling people what " +
      "their skin is actually doing rather than which product to buy.",
    // A real, checkable person behind the byline. This feeds `sameAs` on the
    // Person node and renders as a visible link — both matter: the schema
    // tells engines this profile and this author are one entity, and the
    // visible link lets an actual reader confirm it in one click.
    profiles: [
      {
        label: "Ayma Arif on LinkedIn",
        url: "https://www.linkedin.com/in/aymaarif1/",
      },
    ],
    hecReference: HEC?.reference,
    // IMPORTANT: IDS membership is free and open (16,000+ members, 160+
    // countries) — a professional interest society, not a credentialing body.
    // Never label this "Certificate No." or "IDS Certified": that reads as an
    // earned clinical certification next to an HEC-attested degree, and a
    // single mislabel like that discredits the genuinely valuable HEC
    // reference sitting beside it. Always "Member" / "Membership No."
    memberOf:
      IDS && IDS.verifyUrl
        ? {
            name: IDS.issuer,
            url: IDS.verifyUrl,
            membershipNo: IDS.reference,
          }
        : undefined,
    /*
     * Named specifically rather than the old vague "continuing education in
     * telehealth practice (Coursera)". A named Duke University
     * specialization with a public verification link is evidence; a category
     * is not.
     *
     * HOTFIX-25 §2.2 — `platform` is deliberately NOT appended. This is
     * HANDOVER-11 §2 Rule 2, which /about's CredentialsCard has followed
     * since it was built and this record never did: the course title above
     * the awarding university already says what it is, and "via Coursera"
     * next to "Duke University" invites the reader to weigh the delivery
     * platform against the issuer. The platform and the full
     * "coursework, not a licence" note are on /credentials, where there is
     * room to explain them. `platform` stays in CREDENTIALS because
     * /credentials still renders it.
     *
     * HOTFIX-26 §1.3 — the separator is a comma, not an em dash. That is
     * both the requested format and one less em dash in shared output: this
     * string renders on six pages, so the single character was counted six
     * times in the 376-em-dash audit.
     *
     * ⚠️ BOTH hotfixes also asked for "Telehealth: Essentials, Teamwork &
     * Dermatology". Not applied, and it needs a decision from Talha rather
     * than a quiet edit: that is not what Duke calls it. Its sibling
     * specializations are "Telehealth: Essentials, Teamwork, and HEENT Exam"
     * and "...and Neurologic Exam", and Duke's own write-up of this one uses
     * ", and" (and may include a trailing "Exam" this record omits).
     * Replacing an issuer's punctuation inside their own credential title is
     * a misquote, which on a YMYL credentials page costs more than the
     * inconsistency it tidies. One click on `verifyUrl` settles it — see the
     * `duke-telehealth` entry in lib/seo/site.ts.
     */
    continuingEducation: TELEHEALTH
      ? [`${TELEHEALTH.name}, ${TELEHEALTH.issuer}`]
      : [],
    /*
     * HOTFIX-30 Part 1. "aesthetic clinics", not "aesthetics clinics" —
     * Talha chose this, knowing it sits a few lines from the job title
     * "Certified Aesthetics Practitioner". Both are correct English. If the
     * two should ever match, it is one word in this one constant, and it is
     * his call to make, not a tidy-up to do in passing.
     */
    experience: "Five years of practice in aesthetic clinics in Lahore",
    experienceLong:
      "Before Glam Repairs, Ayma spent five years in practice at aesthetic " +
      "clinics in Lahore, assessing skin face to face. That is where the " +
      "pattern recognition comes from. Several hundred faces a year, in the " +
      "same climate and the same hard water, is what makes a photograph " +
      "readable.",
    scopeDisclaimer:
      "Ayma is not a physician or dermatologist. Glam Repairs provides " +
      "cosmetic skincare guidance and does not diagnose, prescribe for, or " +
      "treat medical conditions.",
    knowsAbout: [
      "Skincare",
      "Cosmetic dermatology science",
      "Dermoscopy",
      "Teledermatology",
    ],
    credentialIds: CREDENTIALS.map((c) => c.id),
    canReview: true,
  },
};

export const DEFAULT_AUTHOR_SLUG = "ayma-arif";

/**
 * The practitioner behind the service — HOTFIX-25 §2.2 asked for prose to
 * read her title from here rather than retyping it.
 *
 * Defined AS `AUTHORS[DEFAULT_AUTHOR_SLUG]`, not as a second record, so the
 * two cannot diverge: this is the same object, under the name that reads
 * correctly in body copy. Use it wherever prose needs her name or title —
 * `${PRACTITIONER.title.toLowerCase()}` beats a hand-typed
 * "certified aesthetician", which is what /editorial-policy had and which
 * is exactly the drift the `title` doc comment above forbids.
 */
export const PRACTITIONER: Author = AUTHORS[DEFAULT_AUTHOR_SLUG];

export function getAuthor(slug: string): Author | undefined {
  return AUTHORS[slug];
}

export function listAuthors(): Author[] {
  return Object.values(AUTHORS);
}

export function listReviewers(): Author[] {
  return listAuthors().filter((a) => a.canReview);
}
