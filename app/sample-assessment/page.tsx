import type { Metadata } from "next";
import Link from "next/link";

import Footer from "@/components/home/Footer";
import { onboardingHref } from "@/components/home/Navbar";
import SampleAssessmentDocument from "@/components/sample/SampleAssessmentDocument";
import CredentialsBlock from "@/components/seo/CredentialsBlock";
import JsonLd from "@/components/seo/JsonLd";
import { SAMPLE_VALUE_POINTS } from "@/lib/sample/sampleAssessment";
import { AUTHORS, DEFAULT_AUTHOR_SLUG } from "@/lib/seo/authors";
import {
  breadcrumbSchema,
  graph,
  medicalArticleSchema,
  personSchema,
} from "@/lib/seo/schema";

/**
 * HANDOVER-22 §3 — /sample-assessment.
 *
 * ── The objection this page answers ──────────────────────────────────────
 * "What do I actually get for Rs. 2,000?" is the question that stops the
 * sale, and no amount of feature copy answers it. The document itself does.
 * So the sample report is the page: it opens with the assessment, and the
 * selling comes after, once the reader already knows what is being sold.
 *
 * ── Why the schema is MedicalWebPage and not Product or Review ───────────
 * The temptation is `Product` with an `offers` block, or worse a `Review`.
 * Both would be false: this page is not a purchasable item and nothing on
 * it is a customer's testimonial. `medicalArticleSchema` emits
 * MedicalWebPage with `audience: Patient` — accurate, and the node the
 * site already uses for health-information pages, so this page is indexed
 * as what it is. The same restraint lib/seo/schema.ts documents for
 * Physician/MedicalClinic applies here.
 *
 * No `datePublished` fiction either: the sample is undated on purpose (see
 * SAMPLE_PATIENT.reportDate), but schema requires a date, so the date used
 * is the date the page shipped, which is the truthful thing to state — it
 * is when this document was published, not when a client was assessed.
 */

const PUBLISHED = "2026-09-14";

const TITLE = "See a real assessment";
const DESCRIPTION =
  "Read a full sample skin assessment before you pay — the same structure, " +
  "length and wording a certified practitioner writes for every client. " +
  "Ingredients and percentages, never product brands.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/sample-assessment" },
  openGraph: {
    title: `${TITLE} | GlamRepairs`,
    description: DESCRIPTION,
    url: "/sample-assessment",
    type: "article",
  },
};

export default function SampleAssessmentPage() {
  const author = AUTHORS[DEFAULT_AUTHOR_SLUG];

  return (
    <>
      <JsonLd
        data={graph(
          breadcrumbSchema([
            { name: "Home", path: "/" },
            { name: "See a real assessment", path: "/sample-assessment" },
          ]),
          medicalArticleSchema({
            title: "Sample skin assessment",
            description: DESCRIPTION,
            path: "/sample-assessment",
            author,
            datePublished: PUBLISHED,
          }),
          // The author node the article references has to exist in the graph,
          // or `author: {"@id": ...}` points at nothing.
          personSchema(author),
        )}
      />

      <main className="bg-gradient-to-b from-brand-purple-soft via-white to-brand-lavender/20 px-4 py-12 sm:px-6 sm:py-16">
        <div className="mx-auto w-full max-w-[44rem]">
          <nav className="mb-8 text-sm text-brand-gray">
            <Link href="/" className="underline underline-offset-2">
              Home
            </Link>
            <span aria-hidden> / </span>
            <span>See a real assessment</span>
          </nav>

          <header>
            {/* HANDOVER-23 §1.5 — eyebrow, heading with the emphasis, one
                line of body. The same three beats every section now opens
                with, so the page reads as composed rather than stacked. */}
            <p className="gr-eyebrow mb-3">A real assessment</p>
            <h1 className="font-serif text-3xl leading-tight text-brand-primary sm:text-4xl">
              This is what you get
            </h1>
            <p className="mt-4 text-base leading-relaxed text-brand-ink sm:text-lg">
              Most services describe the report. Below is the whole thing —
              the same structure, length and wording every client receives,
              written for a composite client so no one&apos;s real assessment
              is published. Read it, then decide.
            </p>
          </header>
        </div>

        <div className="mt-10 sm:mt-12">
          <SampleAssessmentDocument />
        </div>

        <div className="mx-auto mt-12 w-full max-w-[44rem] sm:mt-16">
          <section>
            <p className="gr-eyebrow mb-3">What it costs you</p>
            <h2 className="font-serif text-2xl leading-snug text-brand-primary sm:text-[1.75rem]">
              What you are paying for
            </h2>
            <ul className="mt-5 space-y-3 sm:space-y-4">
              {SAMPLE_VALUE_POINTS.map((point) => (
                <li
                  key={point.title}
                  className="rounded-2xl border border-brand-lavender/60 bg-white px-4 py-4 shadow-sm sm:px-5 sm:py-5"
                >
                  <h3 className="text-sm font-semibold text-brand-primary sm:text-[0.9375rem]">
                    {point.title}
                  </h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-brand-gray sm:text-[0.9375rem]">
                    {point.body}
                  </p>
                </li>
              ))}
            </ul>
          </section>

          {/* Who wrote it, stated where the reader is deciding whether to trust it. */}
          <div className="mt-8 rounded-2xl border border-brand-border-light/60 bg-white px-4 py-4 sm:mt-10 sm:px-5 sm:py-5">
            <CredentialsBlock />
          </div>

          <section className="mt-10 rounded-[2rem] bg-brand-cream/70 px-5 py-8 text-center sm:mt-12 sm:px-8 sm:py-10">
            <h2 className="font-serif text-2xl leading-snug text-brand-primary sm:text-[1.75rem]">
              Get one written for your skin
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-brand-gray sm:text-[0.9375rem]">
              A few questions, a few photographs, and your assessment arrives
              within 24 hours. You choose your plan on the second screen, so
              you know the price before you answer anything.
            </p>
            <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <Link
                href={onboardingHref}
                className="inline-flex items-center justify-center rounded-full bg-brand-primary px-10 py-3.5 text-xs font-semibold uppercase tracking-[0.14em] text-white transition-opacity hover:opacity-90 sm:text-sm"
              >
                Start my assessment
              </Link>
              <Link
                href="/pricing"
                className="inline-flex items-center justify-center rounded-full border border-brand-primary/40 px-10 py-3.5 text-xs font-semibold uppercase tracking-[0.14em] text-brand-primary transition-colors hover:bg-brand-primary/5 sm:text-sm"
              >
                See pricing
              </Link>
            </div>
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}
