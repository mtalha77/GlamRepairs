import type { Metadata } from "next";
import Link from "next/link";
import JsonLd from "@/components/seo/JsonLd";
import { listReviewers, PRACTITIONER } from "@/lib/seo/authors";
import { breadcrumbSchema, graph } from "@/lib/seo/schema";
import { SITE, canonicalOg } from "@/lib/seo/site";

/**
 * Editorial policy.
 *
 * Google's quality raters are explicitly told to look for evidence of
 * editorial process on YMYL sites. This page is that evidence. It is also one
 * of the pages AI engines reach for when deciding whether a health site is
 * trustworthy enough to quote.
 *
 * Every claim on this page must stay true. An aspirational editorial policy is
 * worse than none — it is a promise a reader can check.
 */
export const metadata: Metadata = {
  title: "Editorial policy",
  description: `How ${SITE.name} researches, writes, reviews and updates its skincare content, and who is accountable for it.`,
  // HOTFIX-31 §4.2 — canonical and og:url from one path.
  ...canonicalOg("/editorial-policy"),
};

const SECTIONS = [
  {
    h: "Who writes this content",
    p: [
      `Everything published on ${SITE.name} is written or reviewed by a certified practitioner. Every article carries a byline linking to a bio page with that person's qualifications, so you can check them before you decide whether to trust what you are reading.`,
      "We do not publish anonymous health content.",
    ],
  },
  {
    h: "How it is reviewed",
    p: [
      "Before an article goes live, a qualified reviewer checks it for accuracy against their practice. Every article names its reviewer and shows the date they checked it.",
      "If we cannot get a claim reviewed, we do not publish it.",
    ],
  },
  {
    h: "How we handle uncertainty",
    p: [
      "Skincare has a lot of confident advice and much less good evidence. Where something is genuinely uncertain or contested, we say so rather than picking a side for the sake of a cleaner sentence.",
      "We do not promise outcomes or timelines we cannot support.",
    ],
  },
  {
    h: "Products and independence",
    p: [
      "Some articles discuss specific brands, describing what their products contain and who they suit. No brand pays to appear, we run no affiliate links, and we take no commission from any brand. If that ever changes, for example through a disclosed partnership, it will be labelled clearly on the page it affects.",
    ],
  },
  {
    h: "How often it is updated",
    p: [
      "Skincare guidance moves. We review published articles at least every twelve months, and sooner when something material changes. The last reviewed date is shown on every article.",
    ],
  },
  {
    h: "What this content is not",
    p: [
      /*
        HOTFIX-25 §2.2 — read from PRACTITIONER.title, not retyped.

        This line said "a certified aesthetician". lib/seo/authors.ts is
        explicit that the one title for this person is "Certified Aesthetics
        Practitioner" and that no second variant may creep back in anywhere
        she is named — because inconsistent titles for one named person
        undercut the Person schema and `sameAs` wiring, whose entire purpose
        is telling Google these mentions are the same entity. "Aesthetician"
        also implies a licensed title she does not hold.

        Interpolating the registry means it cannot drift again, rather than
        being correct until the next person retypes it.
      */
      `Our articles are general information. They are not a diagnosis, and they are not a substitute for seeing a doctor. A personalised assessment from us is exactly that: personalised guidance from a ${PRACTITIONER.title.toLowerCase()} — and it is also not a medical diagnosis.`,
      "If a skin concern is painful, spreading, changing shape, or not responding to care, see a doctor. We will tell you when we think that is the right call rather than sell you a routine.",
    ],
  },
  {
    h: "How an assessment is produced",
    p: [
      "Assessments are a separate thing from articles: each is read and written by hand for one person. The questionnaire, the photographs, who reads them and what the report contains are set out step by step on the page linked below.",
    ],
  },
  {
    h: "Corrections",
    p: [
      "If you find something inaccurate, tell us and we will correct it. Substantive corrections are noted on the article itself rather than made silently.",
    ],
  },
];

export default function EditorialPolicyPage() {
  const reviewers = listReviewers();

  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <JsonLd
        data={graph(
          breadcrumbSchema([
            { name: "Home", path: "/" },
            { name: "Editorial policy", path: "/editorial-policy" },
          ]),
        )}
      />

      <h1 className="font-[family-name:var(--font-playfair)] text-4xl">
        Editorial policy
      </h1>
      <p className="mt-4 text-lg text-black/65">
        How we research, write, review and update what you read here, and who
        is accountable for it.
      </p>

      <div className="mt-12 space-y-10">
        {SECTIONS.map((s) => (
          <section key={s.h}>
            <h2 className="text-xl font-semibold">{s.h}</h2>
            {s.p.map((para) => (
              <p key={para} className="mt-3 leading-relaxed text-black/75">
                {para}
              </p>
            ))}
          </section>
        ))}
      </div>

      <p className="mt-8">
        <Link href="/how-assessments-work" className="font-medium text-brand-primary underline underline-offset-2">
          How an assessment works
        </Link>
      </p>

      {reviewers.length ? (
        <section className="mt-12 border-t border-black/10 pt-8">
          <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-black/45">
            Who reviews our content
          </h2>
          <ul className="mt-4 space-y-2">
            {reviewers.map((r) => (
              <li key={r.slug}>
                <Link
                  href={`/authors/${r.slug}`}
                  className="font-semibold underline underline-offset-2"
                >
                  {r.name}
                </Link>
                {/*
                  HOTFIX-30 Part 1.1 — comma, not an em dash.

                  This is the same "Name, Title, Credentials" stack the
                  CredentialsBlock renders, composed by hand here because
                  this page lists every reviewer rather than one author. The
                  separator has to match, or the site punctuates the same
                  fact two ways depending on which page you land on.
                */}
                <span className="text-black/60">
                  {", "}
                  {r.title}, {r.credentials}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </main>
  );
}
