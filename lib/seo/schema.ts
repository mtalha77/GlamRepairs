/**
 * JSON-LD builders.
 *
 * ── A deliberate restraint ───────────────────────────────────────────────────
 * It is tempting to reach for `Physician` and `MedicalClinic` because they
 * carry more weight. Do not. A certified aesthetics practitioner is not a
 * physician, and
 * GlamRepairs is not a clinic. Claiming either in structured data is a false
 * credential claim — the fastest way to lose trust in a YMYL niche, and a
 * genuine liability if a client ever relies on it.
 *
 * HOTFIX-39 §3 takes that one step further, and it is right to.
 * `MedicalBusiness` was chosen as "accurate — a business providing
 * health-related services", and it is not. Three things were wrong with it:
 *
 * 1. It contradicts the footer, which says on the same page that we do not
 *    diagnose or treat medical conditions. The structured data asserted the
 *    opposite of the visible copy.
 * 2. It is the type that puts a site in the YMYL *medical* category, judged
 *    against hospitals and dermatology clinics. That is a comparison a
 *    single-practitioner aesthetics service loses by definition.
 * 3. HANDOVER-35 §3.2 asked for no medical schema on these pages.
 *
 * `HealthAndBeautyBusiness` is a real schema.org type, sits under
 * LocalBusiness, and describes exactly what this is. Together with `Person`
 * carrying an explicit `hasCredential`, it states the qualification
 * precisely and lets Google weigh it correctly, without claiming a category
 * the business is not in.
 *
 * Everything here is typed loosely as `object` on purpose. schema.org is not a
 * closed vocabulary and over-typing it produces friction with no payoff.
 */
import { CREDENTIALS, SITE, abs, getCredential } from "./site";
import type { Author } from "./authors";

/**
 * The attesting body for the degree node below — see the comment there.
 * Read from CREDENTIALS rather than typed, so the name in the graph and the
 * name on /credentials are the same string.
 */
const HEC_DEGREE = getCredential("hec-degree");

/** Wraps several nodes into one @graph. One script tag beats five. */
export function graph(...nodes: object[]) {
  return { "@context": "https://schema.org", "@graph": nodes };
}

/* ── Site-wide entities ──────────────────────────────────────────────────── */

export function organizationSchema() {
  return {
    // HOTFIX-39 §3 — was MedicalBusiness. See the note at the top of this
    // file. One line, sitewide, and the highest-value change in that audit.
    "@type": "HealthAndBeautyBusiness",
    "@id": abs("/#organization"),
    name: SITE.name,
    legalName: SITE.legalName,
    url: SITE.url,
    description: SITE.description,
    areaServed: { "@type": "Country", name: "Pakistan" },
    // Online-only: no storefront is declared, because there isn't one.
    // (An earlier comment here said a Google Business Profile was therefore
    // unavailable to us. That is out of date — a profile exists, and
    // HOTFIX-8 exists to make the site's phone number match the one listed
    // on it.)
    /*
     * `Service`, not `MedicalTherapy`. HOTFIX-39 §3 did not name this one —
     * it read the @type of the organisation node and stopped — but it is
     * the same error one property deeper, and leaving it would have kept a
     * medical claim in the graph on every page of the site after the fix
     * that was supposed to remove them. An online skin assessment is a
     * service. It is not a therapy, and nothing here treats anything.
     */
    availableService: {
      "@type": "Service",
      name: "Online skin assessment",
      serviceType: "Skincare assessment",
    },
    // HOTFIX-8 — NAP consistency. Google cross-references name, address and
    // phone across sources to decide a business is real, so this has to be
    // the same number as the Google Business Profile, in E.164.
    telephone: SITE.phone.e164,
    contactPoint: {
      "@type": "ContactPoint",
      telephone: SITE.phone.e164,
      contactType: "customer service",
      areaServed: "PK",
      availableLanguage: ["en", "ur"],
      // HANDOVER-11 §5 — hours live HERE, on the ContactPoint, and
      // deliberately not as a top-level `openingHoursSpecification` on the
      // organisation. The top-level form is how a business with premises
      // states its opening times; asserting it would imply a storefront that
      // does not exist. On a ContactPoint it says the honest thing: this is
      // when someone answers. Schema-valid either way.
      hoursAvailable: {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: SITE.hours.days,
        opens: SITE.hours.opens,
        closes: SITE.hours.closes,
      },
    },
    ...(SITE.sameAs.length ? { sameAs: SITE.sameAs } : {}),
  };
}

export function websiteSchema() {
  return {
    "@type": "WebSite",
    "@id": abs("/#website"),
    url: SITE.url,
    name: SITE.name,
    description: SITE.description,
    inLanguage: SITE.language,
    publisher: { "@id": abs("/#organization") },
  };
}

/**
 * The practitioner. This node is what earns E-E-A-T credit on every piece of
 * YMYL content that references it, so the credential must be explicit rather
 * than buried in a job title string.
 */
export function personSchema(author: Author) {
  return {
    "@type": "Person",
    "@id": abs(`/authors/${author.slug}#person`),
    name: author.name,
    jobTitle: author.title,
    description: author.bio,
    url: abs(`/authors/${author.slug}`),
    ...(author.photo ? { image: abs(author.photo) } : {}),
    worksFor: { "@id": abs("/#organization") },
    /*
     * Array, not a single object — HOTFIX-6 §4. The HEC attestation reference
     * is the identifier here (falling back to regNo for any future author who
     * has one but no HEC attestation) precisely because it's independently
     * checkable.
     *
     * ── `recognizedBy` names the ATTESTING body, not the awarding one ──────
     * HOTFIX-26 §1. This used to emit the awarding university, and that was
     * wrong on its own terms: the node's `identifier` is an HEC attestation
     * reference, so the object said "recognized by King Faisal University"
     * directly above a number that only HEC can confirm. Two different
     * organisations in one credential, one of which did not issue the thing
     * being identified.
     *
     * It also made this the single largest source of the problem. The
     * site-wide entity graph in app/layout.tsx emits `personSchema` on EVERY
     * route, so the university name was in the JSON-LD of all 16 public
     * pages — including /terms and /privacy, where nothing about a
     * credential is visible on screen. HOTFIX-25 §2.2 removed it from the
     * visible byline and left this, which is why a reader saw it gone and a
     * crawler did not. One object, 16 pages.
     *
     * The awarding university is not lost: it stays on /credentials, inside
     * the `hec-degree` note, which is the one surface with room to explain
     * that HEC attested a degree King Faisal University awarded. That
     * distinction is the whole value of the attestation, and it needs a
     * sentence — it cannot survive being an `Organization` name in a graph.
     */
    hasCredential: [
      {
        "@type": "EducationalOccupationalCredential",
        credentialCategory: "degree",
        name: author.credentials,
        ...(HEC_DEGREE
          ? {
              recognizedBy: {
                "@type": "Organization",
                /*
                 * HOTFIX-36 §3.5 — the bare organisation name, without the
                 * "(HEC)" the display string carries. A parenthetical
                 * abbreviation is a reading aid for a human looking at a
                 * card; inside an `Organization` node it is part of the
                 * name being asserted, and it is not what the commission
                 * calls itself.
                 */
                name: HEC_DEGREE.issuer.replace(" (HEC)", ""),
              },
            }
          : {}),
        ...(author.hecReference
          ? { identifier: author.hecReference }
          : author.regNo
            ? { identifier: author.regNo }
            : {}),
      },
      // Coursework the person actually completed, from CREDENTIALS. Kept a
      // separate node with `credentialCategory: "course"` rather than folded
      // into the degree: a Coursera specialization is real, relevant training
      // and it is not a degree or a licence. Stating which is which is what
      // makes the degree node above believable.
      ...CREDENTIALS.filter(
        (c) => c.kind === "course" && author.credentialIds?.includes(c.id),
      ).map((c) => ({
        "@type": "EducationalOccupationalCredential",
        credentialCategory: "course",
        name: c.name,
        recognizedBy: { "@type": "Organization", name: c.issuer },
        ...(c.verifyUrl ? { url: c.verifyUrl } : {}),
      })),
    ],
    /*
     * HOTFIX-30 §2.2 — experience is an Occupation, NOT a credential.
     *
     * The tempting shortcut is a third `EducationalOccupationalCredential`
     * next to the degree and the course, because the stack renders them one
     * under the other. It would be wrong in a way that costs more than it
     * gains: that type means a qualification some body issued, and five
     * years of practice was issued by nobody. Overloading it invites an
     * engine to discount the whole `hasCredential` array — including the HEC
     * attestation, which is the one genuinely checkable claim on this site.
     *
     * `occupationLocation` is a City rather than a Country for the same
     * reason the prose says Lahore and not Pakistan: a named place is a
     * fact, and a vague one reads as padding.
     */
    ...(author.experience
      ? {
          hasOccupation: {
            "@type": "Occupation",
            name: author.title,
            occupationLocation: { "@type": "City", name: "Lahore" },
            experienceRequirements: author.experience,
          },
        }
      : {}),
    ...(author.knowsAbout?.length ? { knowsAbout: author.knowsAbout } : {}),
    ...(author.memberOf
      ? {
          memberOf: {
            "@type": "Organization",
            name: author.memberOf.name,
            url: author.memberOf.url,
          },
        }
      : {}),
    ...(author.profiles?.length
      ? { sameAs: author.profiles.map((p) => p.url) }
      : {}),
  };
}

/* ── Page-level entities ─────────────────────────────────────────────────── */

export function serviceSchema(opts: {
  name: string;
  description: string;
  price?: number;
  currency?: string;
  path: string;
}) {
  return {
    "@type": "Service",
    "@id": abs(`${opts.path}#service`),
    serviceType: opts.name,
    name: opts.name,
    description: opts.description,
    provider: { "@id": abs("/#organization") },
    areaServed: { "@type": "Country", name: "Pakistan" },
    ...(opts.price != null
      ? {
          offers: {
            "@type": "Offer",
            price: String(opts.price),
            priceCurrency: opts.currency ?? "PKR",
            url: abs(opts.path),
          },
        }
      : {}),
  };
}

/**
 * HANDOVER-13 §2 — one FAQPage node per page, anchored to that page.
 *
 * `path` is required rather than defaulted: four pages now emit this, and a
 * shared "/#faq" @id across all of them would declare them the same entity.
 *
 * ⚠️ Only ever pass the questions actually VISIBLE on that page. Marking up
 * hidden or filtered-out content is a structured data violation, and it is
 * why callers pass the same resolved array they render rather than the full
 * FAQS list.
 */
export function faqSchema(
  items: { question: string; answer: string }[],
  path: string,
) {
  return {
    "@type": "FAQPage",
    "@id": abs(`${path}#faq`),
    mainEntity: items.map((i) => ({
      "@type": "Question",
      name: i.question,
      acceptedAnswer: { "@type": "Answer", text: i.answer },
    })),
  };
}

/**
 * Blog posts.
 *
 * ── Was MedicalWebPage. HOTFIX-39 §9 asks for it gone, and it is ─────────
 * The original reasoning was that the subject is health and that
 * `MedicalWebPage` is the one type carrying `reviewedBy`. The first half
 * stopped being a good reason once the organisation stopped calling itself
 * a `MedicalBusiness`: labelling every post `MedicalWebPage` re-asserts on
 * every content page exactly the medical framing §3 removed sitewide, and
 * it is the type Google's medical-YMYL evaluation keys on.
 *
 * ⚠️ The cost is real and worth knowing. `reviewedBy` is defined on
 * `MedicalWebPage`, not on `Article`, so the "a named practitioner checked
 * this" signal cannot be carried the same way. It is emitted as `editor`
 * instead, which IS valid on CreativeWork and says the same thing in a
 * vocabulary that matches the type. If that trade looks wrong, this is the
 * one line to reconsider — the reviewer data itself has not changed.
 *
 * `datePublished`, `dateModified` and `reviewedBy` are not decoration. Visible,
 * machine-readable dates and a named reviewer are among the strongest signals
 * available to a small site, and AI engines weigh them heavily when deciding
 * what to cite.
 */
export function medicalArticleSchema(opts: {
  title: string;
  description: string;
  path: string;
  author: Author;
  reviewer?: Author;
  datePublished: string;
  dateModified?: string;
  image?: string;
}) {
  return {
    "@type": "Article",
    "@id": abs(`${opts.path}#article`),
    url: abs(opts.path),
    name: opts.title,
    headline: opts.title,
    description: opts.description,
    inLanguage: SITE.language,
    isPartOf: { "@id": abs("/#website") },
    publisher: { "@id": abs("/#organization") },
    author: { "@id": abs(`/authors/${opts.author.slug}#person`) },
    /*
     * `editor`, not `reviewedBy`. Same person, same claim, valid on
     * CreativeWork — see the note above this function.
     */
    ...(opts.reviewer
      ? { editor: { "@id": abs(`/authors/${opts.reviewer.slug}#person`) } }
      : {}),
    datePublished: opts.datePublished,
    dateModified: opts.dateModified ?? opts.datePublished,
    ...(opts.image ? { image: abs(opts.image) } : {}),
    /*
     * Was `{ "@type": "Patient" }`, which is a MedicalAudience subtype and
     * therefore the same mistake as the one §3 removed, hiding in a
     * property rather than in a @type. A plain Audience says "general
     * information, not individualised advice" without putting the reader
     * in a clinical category we have no business assigning them to.
     */
    audience: { "@type": "Audience", audienceType: "General public" },
  };
}

export function breadcrumbSchema(trail: { name: string; path: string }[]) {
  return {
    "@type": "BreadcrumbList",
    itemListElement: trail.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: c.name,
      item: abs(c.path),
    })),
  };
}
