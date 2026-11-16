import type { Metadata } from "next";
import Link from "next/link";

import Breadcrumbs, { type Crumb } from "@/components/seo/Breadcrumbs";
import JsonLd from "@/components/seo/JsonLd";
import { describePhotoCount, getPlanSettings } from "@/lib/plans/planSettings";
import { listOfferedPlans } from "@/lib/plans/plansPublic";
import { breadcrumbSchema, graph } from "@/lib/seo/schema";
import { canonicalOg, SITE } from "@/lib/seo/site";

/**
 * How an assessment is produced (Handover 73 Part 3.2). Linked from the
 * standards box on every article and from /editorial-policy.
 *
 * Every line here must be true of the shipped system. What each plan
 * includes, photo counts and follow-up are read from the database
 * (plans_public, plan_settings), never typed, so they cannot drift.
 */

const TITLE = "How an assessment works";
const DESCRIPTION =
  "What happens between your questionnaire and your report: the photographs, who reads them, what the report contains, and what happens when something needs a doctor.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  ...canonicalOg("/how-assessments-work", { title: `${TITLE} | ${SITE.name}`, description: DESCRIPTION }),
};

export const revalidate = 3600;

/** The sections of a delivered report, in the order the client reads them. */
const REPORT_SECTIONS = [
  "Start here: the one thing to do first",
  "What we noticed in your photographs and answers",
  "Your morning routine and your night routine, in order",
  "What to avoid, and why",
  "What to expect, week by week",
  "Good signs that it is working",
  "When to stop and see a doctor",
];

const P = "leading-relaxed text-brand-gray";
const H2 = "font-[family-name:var(--font-playfair)] text-2xl text-brand-ink";

export default async function HowAssessmentsWorkPage() {
  const [plans, settings] = await Promise.all([listOfferedPlans("PK"), getPlanSettings()]);
  const trail: Crumb[] = [
    { name: "Home", path: "/" },
    { name: TITLE, path: "/how-assessments-work" },
  ];

  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <JsonLd data={graph(breadcrumbSchema(trail))} />
      <Breadcrumbs trail={trail} className="mb-8" />
      <h1 className="font-[family-name:var(--font-playfair)] text-4xl text-brand-ink">{TITLE}</h1>
      <p className="mt-4 text-lg leading-relaxed text-brand-gray">
        Every assessment is read and written by a person. This is exactly what happens between the questionnaire and the
        report you keep.
      </p>

      <div className="mt-12 space-y-10">
        <section>
          <h2 className={H2}>1. The questionnaire</h2>
          <p className={`mt-3 ${P}`}>
            You answer questions about your skin type, the concern that brought you, how long it has been going on, your
            current routine and products, and the things that affect skin day to day: sleep, water, stress and sun.
          </p>
        </section>

        <section>
          <h2 className={H2}>2. Your photographs</h2>
          <ul className={`mt-3 list-disc space-y-1 pl-5 ${P}`}>
            {plans.map((p) => {
              const s = settings[p.planKey as keyof typeof settings];
              return (
                <li key={p.planKey}>
                  {p.label}: {s ? describePhotoCount(s).toLowerCase() : "see the plan"}.
                </li>
              );
            })}
          </ul>
          <p className={`mt-3 ${P}`}>
            We guide you through taking usable photographs. If one is too dark, blurred or filtered, we ask you to retake
            it rather than guess.
          </p>
        </section>

        <section>
          <h2 className={H2}>3. Who reads them</h2>
          <p className={`mt-3 ${P}`}>
            A Certified Aesthetics Practitioner reads your answers and photographs together, by hand. No algorithm reads
            your skin or writes your routine. Each practitioner publishes their qualification, with its reference number, on
            their profile, and their name and qualification are on your report.
          </p>
          <p className={`mt-3 ${P}`}>
            <Link href="/practitioners" className="font-medium text-brand-primary underline underline-offset-2">
              Meet the practitioners
            </Link>
          </p>
        </section>

        <section>
          <h2 className={H2}>4. What your report contains</h2>
          <ul className={`mt-3 list-disc space-y-1 pl-5 ${P}`}>
            {REPORT_SECTIONS.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
          <p className={`mt-3 ${P}`}>
            It names ingredients and strengths rather than brands, so you can buy whatever is available and affordable near
            you.{" "}
            <Link href="/sample-assessment" className="font-medium text-brand-primary underline underline-offset-2">
              See a sample assessment
            </Link>
          </p>
        </section>

        <section>
          <h2 className={H2}>5. When something needs a doctor</h2>
          <p className={`mt-3 ${P}`}>
            This is cosmetic guidance, not medical care. If your answers or photographs suggest a concern that needs a
            doctor, your practitioner tells you so plainly and does not write a routine for it. Your fee is held as a
            credit towards a future assessment.
          </p>
          <p className={`mt-3 ${P}`}>
            If your skin is painful, spreading quickly, bleeding or blistering, or you feel unwell with it, do not wait for
            us: contact a doctor or your local emergency service.
          </p>
        </section>

        <section>
          <h2 className={H2}>6. What each plan includes</h2>
          <div className="mt-3 space-y-6">
            {plans.map((p) => (
              <div key={p.planKey}>
                <h3 className="font-semibold text-brand-ink">{p.label}</h3>
                <ul className={`mt-2 list-disc space-y-1 pl-5 ${P}`}>
                  {p.features.map((f) => (
                    <li key={f}>{f}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      </div>

      <p className="mt-12 text-sm text-brand-gray">
        How we write and review our articles is set out in our{" "}
        <Link href="/editorial-policy" className="underline underline-offset-2">
          editorial policy
        </Link>
        .
      </p>
    </main>
  );
}
