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
  /** Institution that awarded the primary credential, e.g. "King Faisal University". */
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
    institution: "King Faisal University",
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
     * ⚠️ §2.2 also asked for "Telehealth: Essentials, Teamwork &
     * Dermatology". Not applied, and it should not be: that is not what
     * Duke calls it. An ampersand in place of the issuer's own ", and" is a
     * misquoted credential title, which costs more on a YMYL page than the
     * punctuation inconsistency it tidies. The name here is whatever
     * CREDENTIALS says — see the accuracy note on `duke-telehealth` in
     * lib/seo/site.ts before editing either.
     */
    continuingEducation: TELEHEALTH
      ? [`${TELEHEALTH.name} — ${TELEHEALTH.issuer}`]
      : [],
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
