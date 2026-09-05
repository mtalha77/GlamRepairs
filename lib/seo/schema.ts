/**
 * JSON-LD builders.
 *
 * ── A deliberate restraint ───────────────────────────────────────────────────
 * It is tempting to reach for `Physician` and `MedicalClinic` because they
 * carry more weight. Do not. A certified aesthetician is not a physician, and
 * GlamRepairs is not a clinic. Claiming either in structured data is a false
 * credential claim — the fastest way to lose trust in a YMYL niche, and a
 * genuine liability if a client ever relies on it.
 *
 * So: `MedicalBusiness` (accurate — a business providing health-related
 * services) and `Person` carrying an explicit `hasCredential`, which states
 * exactly what the qualification is and lets Google weigh it correctly.
 *
 * Everything here is typed loosely as `object` on purpose. schema.org is not a
 * closed vocabulary and over-typing it produces friction with no payoff.
 */
import { SITE, abs } from "./site";
import type { Author } from "./authors";

/** Wraps several nodes into one @graph. One script tag beats five. */
export function graph(...nodes: object[]) {
  return { "@context": "https://schema.org", "@graph": nodes };
}

/* ── Site-wide entities ──────────────────────────────────────────────────── */

export function organizationSchema() {
  return {
    "@type": "MedicalBusiness",
    "@id": abs("/#organization"),
    name: SITE.name,
    legalName: SITE.legalName,
    url: SITE.url,
    description: SITE.description,
    areaServed: { "@type": "Country", name: "Pakistan" },
    // Online-only. Declaring a storefront we do not have would be misleading
    // and is also why a Google Business Profile is not available to us.
    availableService: {
      "@type": "MedicalTherapy",
      name: "Online skin assessment",
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
    hasCredential: {
      "@type": "EducationalOccupationalCredential",
      credentialCategory: "degree",
      name: author.credentials,
      ...(author.regNo ? { identifier: author.regNo } : {}),
    },
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

export function faqSchema(items: { question: string; answer: string }[]) {
  return {
    "@type": "FAQPage",
    "@id": abs("/#faq"),
    mainEntity: items.map((i) => ({
      "@type": "Question",
      name: i.question,
      acceptedAnswer: { "@type": "Answer", text: i.answer },
    })),
  };
}

/**
 * Blog posts. `MedicalWebPage` rather than `Article` because the subject is
 * health — it is the type Google expects for this material, and it is the one
 * that carries `reviewedBy`.
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
    "@type": "MedicalWebPage",
    "@id": abs(`${opts.path}#article`),
    url: abs(opts.path),
    name: opts.title,
    headline: opts.title,
    description: opts.description,
    inLanguage: SITE.language,
    isPartOf: { "@id": abs("/#website") },
    publisher: { "@id": abs("/#organization") },
    author: { "@id": abs(`/authors/${opts.author.slug}#person`) },
    ...(opts.reviewer
      ? { reviewedBy: { "@id": abs(`/authors/${opts.reviewer.slug}#person`) } }
      : {}),
    datePublished: opts.datePublished,
    dateModified: opts.dateModified ?? opts.datePublished,
    ...(opts.image ? { image: abs(opts.image) } : {}),
    // Tells Google this is general information, not individualised advice.
    audience: { "@type": "Patient" },
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
