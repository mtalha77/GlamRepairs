import type { Metadata } from "next";
import Link from "next/link";

import Breadcrumbs, { type Crumb } from "@/components/seo/Breadcrumbs";
import CredentialsBlock from "@/components/seo/CredentialsBlock";
import JsonLd from "@/components/seo/JsonLd";
import { getWhatsAppChatLink } from "@/lib/funnel/whatsapp";
import { publicRosterFacts } from "@/lib/practitioners/directory";
import { formatPlanPrice, listOfferedPlans, PAID_PLAN_KEY } from "@/lib/plans/plansPublic";
import { getServerPricingRegion } from "@/lib/pricing/geo";
import { PRACTITIONER } from "@/lib/seo/authors";
import { breadcrumbSchema, graph, serviceSchema } from "@/lib/seo/schema";
import { canonicalOg, PAYMENT, SITE } from "@/lib/seo/site";

/**
 * The Pakistan service page (Handover 73 Part 5).
 *
 * One page, every line true of the shipped system: who reads the
 * photographs comes from PRACTITIONER and the roster, the price from
 * plans_public for the visitor's country, what is included (turnaround
 * among it) from plan_features, and payment is bank transfer because that
 * is the only method live. Schema is Service; the Organization node is in
 * the site-wide graph. Never MedicalBusiness: no premises, no medical status.
 *
 * Built as a conversion page first. It is not the start of a set of city
 * variants (Handover 73 Part 5 caveat).
 */

const PATH = "/online-skin-consultation-pakistan";
const TITLE = "Online skin consultation in Pakistan";
const DESCRIPTION =
  "Send your answers and photographs from anywhere in Pakistan. A Certified Aesthetics Practitioner reads them by hand and writes your skin assessment and routine.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  ...canonicalOg(PATH, { title: `${TITLE} | ${SITE.name}`, description: DESCRIPTION }),
};

const P = "leading-relaxed text-brand-gray";
const H2 = "font-[family-name:var(--font-playfair)] text-2xl text-brand-ink";

export default async function PakistanServicePage() {
  const region = await getServerPricingRegion();
  const [plans, roster] = await Promise.all([listOfferedPlans(region.code), publicRosterFacts()]);
  const paid = plans.find((p) => p.planKey === PAID_PLAN_KEY) ?? null;
  const free = plans.find((p) => p.price === 0) ?? null;
  const whatsapp = getWhatsAppChatLink("Hi, I would like to know more about an online skin consultation.");
  const trail: Crumb[] = [
    { name: "Home", path: "/" },
    { name: TITLE, path: PATH },
  ];
  const countries = roster.countries;

  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <JsonLd
        data={graph(
          serviceSchema({
            name: TITLE,
            description: DESCRIPTION,
            path: PATH,
            ...(paid ? { price: paid.price, currency: paid.currency } : {}),
          }),
          breadcrumbSchema(trail),
        )}
      />
      <Breadcrumbs trail={trail} className="mb-8" />

      <h1 className="font-[family-name:var(--font-playfair)] text-4xl leading-tight text-brand-ink sm:text-5xl">{TITLE}</h1>
      <p className="mt-5 text-lg leading-relaxed text-brand-gray">
        Answer a questionnaire about your skin, send photographs from your phone, and a Certified Aesthetics Practitioner
        reads them by hand and writes your assessment and routine. No clinic visit and no waiting room, from anywhere in
        Pakistan.
      </p>
      <div className="mt-7 flex flex-wrap gap-3">
        <Link
          href="/onboarding/step/1"
          className="inline-flex min-h-12 items-center rounded-full bg-brand-primary px-7 text-sm font-medium text-white hover:bg-brand-primary-dark"
        >
          Start your assessment
        </Link>
        <Link
          href="/sample-assessment"
          className="inline-flex min-h-12 items-center rounded-full border border-brand-primary/40 px-7 text-sm font-medium text-brand-primary hover:border-brand-primary"
        >
          See a sample assessment
        </Link>
      </div>

      <div className="mt-14 space-y-12">
        <section>
          <h2 className={H2}>What it is</h2>
          <p className={`mt-3 ${P}`}>
            Cosmetic skin guidance from a qualified practitioner, delivered online. It is not medical care: we do not
            diagnose or prescribe, and if what we see needs a doctor, we say so plainly and do not write a routine for it.
          </p>
          <p className={`mt-3 ${P}`}>
            <Link href="/how-assessments-work" className="font-medium text-brand-primary underline underline-offset-2">
              How an assessment works, step by step
            </Link>
          </p>
        </section>

        <section>
          <h2 className={H2}>Who reads your photographs</h2>
          <p className={`mt-3 ${P}`}>
            A named Certified Aesthetics Practitioner, never an algorithm.
            {countries.length ? ` Our practitioners work from ${countries.length > 1 ? `${countries.slice(0, -1).join(", ")} and ${countries.at(-1)}` : countries[0]}.` : ""}{" "}
            {paid ? `On ${paid.label} you choose who reads your skin.` : ""}
          </p>
          <div className="mt-5 rounded-2xl border border-brand-lavender/70 bg-white px-5 py-4">
            <p className="font-medium text-brand-ink">
              {PRACTITIONER.name}, {PRACTITIONER.title}
            </p>
            <CredentialsBlock slug={PRACTITIONER.slug} compact className="mt-2" />
          </div>
          <p className={`mt-3 ${P}`}>
            <Link href="/practitioners" className="font-medium text-brand-primary underline underline-offset-2">
              Meet the practitioners
            </Link>
          </p>
        </section>

        {paid ? (
          <section>
            <h2 className={H2}>
              {paid.label}, {formatPlanPrice(paid)}
            </h2>
            <ul className={`mt-3 list-disc space-y-1 pl-5 ${P}`}>
              {paid.features.map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
            {free ? (
              <p className={`mt-4 ${P}`}>
                There is also {free.label}, free: {free.features.slice(0, 2).join("; ").toLowerCase()}.
              </p>
            ) : null}
          </section>
        ) : null}

        <section>
          <h2 className={H2}>How you pay</h2>
          <p className={`mt-3 ${P}`}>
            By bank transfer, after you submit your assessment. You are shown the account details and your reference, then
            send us the transfer screenshot on WhatsApp so we can confirm it.
          </p>
          <p className={`mt-3 ${P}`}>{PAYMENT.ownerDisclosure}</p>
        </section>

        <section>
          <h2 className={H2}>Talk to us first</h2>
          <p className={`mt-3 ${P}`}>
            {SITE.hours.displayDays}, {SITE.hours.displayTime}. {SITE.hours.note}
          </p>
          <ul className="mt-4 space-y-2 text-brand-ink">
            <li>
              Call:{" "}
              <a href={`tel:${SITE.phone.e164}`} className="font-medium text-brand-primary underline underline-offset-2">
                {SITE.phone.display}
              </a>
            </li>
            <li>
              WhatsApp:{" "}
              <a href={whatsapp} target="_blank" rel="noopener noreferrer" className="font-medium text-brand-primary underline underline-offset-2">
                {SITE.phone.displayInternational}
              </a>
            </li>
          </ul>
        </section>
      </div>
    </main>
  );
}
