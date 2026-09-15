import type { Metadata } from "next";
import Link from "next/link";

import { onboardingHref } from "@/components/home/Navbar";
import SampleAssessmentDocument from "@/components/sample/SampleAssessmentDocument";
import SampleIcon from "@/components/sample/SampleIcons";
import JsonLd from "@/components/seo/JsonLd";
import { getPlanSettings } from "@/lib/plans/planSettings";
import { getServerPricingRegion } from "@/lib/pricing/geo";
import { formatRegionPrice } from "@/lib/pricing/regions";
import {
  SAMPLE_ANNOTATIONS,
  sampleValueCards,
} from "@/lib/sample/sampleAssessment";
import { AUTHORS, DEFAULT_AUTHOR_SLUG } from "@/lib/seo/authors";
import {
  breadcrumbSchema,
  graph,
  medicalArticleSchema,
  personSchema,
} from "@/lib/seo/schema";

/**
 * /sample-assessment — HANDOVER-22 §3, rebuilt to HANDOVER-23's design.
 *
 * ── The objection this page answers ──────────────────────────────────────
 * "What do I actually get for the money?" is the question that stops the
 * sale, and no amount of feature copy answers it. The document itself does.
 * So the report is the page: it opens with the assessment, and the selling
 * comes after, once the reader already knows what is being sold.
 *
 * ── Why there are two columns ────────────────────────────────────────────
 * The report alone demonstrates quality to a reader who already knows what
 * to look for. The annotation column tells everyone else where to look —
 * that the practitioner named what she saw rather than applying a skin-type
 * label, that the reader's own answers come back to them, that the timeline
 * includes the weeks where nothing has happened yet. The report sticks
 * while that column scrolls, so each note is read against the section it
 * describes.
 *
 * ── The one number that is read, not typed ───────────────────────────────
 * The follow-up window comes from `plan_settings` and the price from
 * `pricing_regions`, for the same reason /compare reads them: a marketing
 * card that outlives the decision to change "30 days" is exactly how these
 * numbers go stale and start contradicting the pricing page.
 *
 * ── Why the schema is MedicalWebPage and not Product or Review ───────────
 * The temptation is `Product` with an `offers` block, or worse a `Review`.
 * Both would be false: this page is not a purchasable item and nothing on
 * it is a customer's testimonial. `medicalArticleSchema` emits
 * MedicalWebPage with `audience: Patient` — accurate, and the node the site
 * already uses for health-information pages. The same restraint
 * lib/seo/schema.ts documents for Physician/MedicalClinic applies here.
 *
 * No `datePublished` fiction either: the sample is undated on purpose, but
 * schema requires a date, so the date used is the date the page shipped —
 * when this document was published, not when a client was assessed.
 */

export const dynamic = "force-dynamic";

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

export default async function SampleAssessmentPage() {
  const author = AUTHORS[DEFAULT_AUTHOR_SLUG];
  const [plans, region] = await Promise.all([
    getPlanSettings(),
    getServerPricingRegion(),
  ]);
  const cards = sampleValueCards({ supportDays: plans.clarity.supportDays });
  const clarityPrice = formatRegionPrice(region, "clarity");

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

      <main>
        {/*
          HOTFIX-25 §1.1 — a <section>, not a <header>.

          This is the page's hero, not site navigation. As a <header> it was
          the only <header> on the page, contained zero links and zero
          images, and an SEO crawl read that as "the site header is empty"
          rather than "this page has no site header". The real site header
          now comes from app/(site)/layout.tsx and sits above this.
        */}
        <section className="gr-section-glow px-6 pb-[34px] pt-14 text-center">
          <div className="mx-auto max-w-[1180px]">
            <p className="gr-eyebrow gr-eyebrow--center">{TITLE}</p>
            <h1 className="mx-auto mt-3.5 font-serif text-[2rem] font-semibold leading-[1.14] tracking-[-0.02em] text-brand-ink sm:text-[2.5rem]">
              This is exactly what{" "}
              <em className="italic text-brand-primary">you receive</em>
            </h1>
            <p className="mx-auto mt-3 max-w-[560px] text-[0.9688rem] leading-[1.7] text-brand-gray">
              A complete assessment, written by hand for one person. Read it in
              full before you pay anything.
            </p>
            {/*
              ⚠️ The supplied design read "shared with permission, identifying
              details removed". That is not used and must not be reintroduced:
              it asserts a real client's real report is on this page and that
              they agreed to it, and neither is true. A composite makes the
              same argument without making a false claim about a real person's
              medical information. See lib/sample/sampleAssessment.ts.
            */}
            <p className="mt-[18px] inline-block rounded-full border border-[#f0e2c0] bg-brand-cream px-[15px] py-[7px] text-xs font-medium text-[#7a6320]">
              A demonstration. The client is a composite — no real
              client&apos;s report is published.
            </p>
          </div>
        </section>

        <div className="mx-auto max-w-[1180px] px-6">
          <div className="grid items-start gap-9 pb-[70px] pt-3.5 lg:grid-cols-[1.15fr_0.85fr]">
            <SampleAssessmentDocument />

            <div className="flex flex-col gap-3.5">
              {SAMPLE_ANNOTATIONS.map((note) => (
                <div
                  key={note.title}
                  className="rounded-2xl border border-brand-lavender/45 bg-white px-5 py-[19px] shadow-sm"
                >
                  <span className="mb-[9px] inline-flex items-center rounded-full bg-brand-purple-soft px-[9px] py-1 text-[0.625rem] font-semibold uppercase tracking-[0.11em] text-brand-primary">
                    {note.section}
                  </span>
                  <h3 className="mb-1.5 font-serif text-[1.0625rem] font-semibold leading-[1.3] text-brand-ink">
                    {note.title}
                  </h3>
                  <p className="text-[0.8125rem] leading-[1.7] text-brand-gray">
                    {note.body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <section className="border-t border-brand-lavender/40 bg-white px-6 pb-[74px] pt-16">
          <div className="mx-auto max-w-[1080px]">
            <p className="gr-eyebrow gr-eyebrow--center">
              What you are paying for
            </p>
            <h2 className="mt-3.5 text-center font-serif text-[1.85rem] font-semibold leading-[1.18] tracking-[-0.018em] text-brand-ink sm:text-[2.15rem]">
              Six things a free quiz{" "}
              <em className="italic text-brand-primary">cannot give you</em>
            </h2>
            <p className="mx-auto mb-10 mt-2.5 max-w-[520px] text-center text-[0.9375rem] leading-[1.7] text-brand-gray">
              The report above is the deliverable. These are the reasons it is
              worth more than the page it sits on.
            </p>

            <ul className="grid gap-[18px] sm:grid-cols-2 lg:grid-cols-3">
              {cards.map((card, index) => (
                <li
                  key={card.title}
                  /* Alternating grounds rather than one flat fill, so a
                     three-column grid reads as a set instead of a table. */
                  className={`gr-card-lift rounded-[1.25rem] border border-transparent px-[22px] py-[26px] ${
                    index % 2 === 1
                      ? "bg-brand-purple-soft"
                      : "bg-brand-cream-card"
                  }`}
                >
                  <span className="mb-[15px] grid h-12 w-12 place-items-center rounded-[14px] bg-white text-brand-primary shadow-sm">
                    <SampleIcon name={card.icon} />
                  </span>
                  <h3 className="mb-[7px] font-serif text-[1.1875rem] font-medium italic leading-[1.3] text-brand-primary">
                    {card.title}
                  </h3>
                  <p className="text-[0.8438rem] leading-[1.7] text-brand-gray">
                    {card.body}
                  </p>
                </li>
              ))}
            </ul>

            <div className="mt-[42px] text-center">
              <Link
                href={onboardingHref}
                className="gr-btn inline-block rounded-full bg-brand-primary px-[34px] py-[15px] text-[0.9375rem] font-medium text-white shadow-[0_10px_24px_-10px_rgba(102,45,145,0.55)] hover:bg-brand-primary-dark"
              >
                Get my assessment &rarr;
              </Link>
              <span className="mt-3.5 block text-[0.8125rem] text-brand-gray">
                {clarityPrice}. One payment. Delivered within 24 hours.
              </span>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
