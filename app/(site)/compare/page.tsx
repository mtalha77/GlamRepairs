import type { Metadata } from "next";
import Link from "next/link";

import CompareMatrixTable from "@/components/compare/CompareMatrixTable";
import { onboardingHref } from "@/components/home/Navbar";
import JsonLd from "@/components/seo/JsonLd";
import { buildCompareMatrix } from "@/lib/compare/compareMatrix";
import { compareSource } from "@/lib/compare/sources";
import { breadcrumbSchema, faqSchema, graph } from "@/lib/seo/schema";
import { SOCIAL_CARD } from "@/lib/seo/site";

/**
 * HANDOVER-22 §5b — /compare.
 *
 * ── What makes this page worth having ────────────────────────────────────
 * Not that it argues for us. That it concedes. Two matrix rows read "No" for
 * Glam Repairs and "Yes" for doctors, there is a section headed "When we are
 * the wrong choice", and every alternative is credited with what it actually
 * does better. The handover's own line: "That single section will do more
 * for trust than the rest of the page combined."
 *
 * ── Rules this page is written under ─────────────────────────────────────
 * • Cite every number, with a link. Figures live in lib/compare/sources.ts
 *   and an uncited number does not ship.
 * • Name no competitor unfavourably. Categories only — "a private clinic
 *   visit", never a named clinic. Naming a business and criticising it
 *   invites a response we do not need. The one brand mentioned anywhere
 *   near this page is our own.
 * • Do not invent a statistic. The trial-and-error range is labelled
 *   illustrative because no credible published figure for Pakistani
 *   skincare spend could be found.
 *
 * Dynamic, not static: the matrix reads live prices and plan settings, so a
 * price change in the database reaches this page the same way it reaches
 * /pricing. Caching it would reintroduce exactly the contradiction the
 * handover warns about.
 */

export const dynamic = "force-dynamic";

const TITLE = "Glam Repairs compared with the alternatives";
const DESCRIPTION =
  "An honest comparison of an online skin assessment against a clinic visit, " +
  "an online doctor, buying products, and free advice — with sources, and " +
  "including the two things a doctor does that we cannot.";

export const metadata: Metadata = {
  title: "Compared with the alternatives",
  description: DESCRIPTION,
  alternates: { canonical: "/compare" },
  /*
   * HOTFIX-25 §2.4 — same defect as /sample-assessment, same fix.
   *
   * §2.4 named only that page; this one had it too, and it was found by
   * checking every public route rather than the one the brief mentioned.
   * Declaring `openGraph` without `images` replaced the inherited object
   * and dropped the `og:image` that app/opengraph-image.tsx supplies
   * everywhere else, so the "why us and not a clinic" page shared with no
   * thumbnail on WhatsApp, X and Facebook. See SOCIAL_CARD in
   * lib/seo/site.ts.
   *
   * ⚠️ Keep `images` if you edit `openGraph`. It does not fall back.
   */
  openGraph: {
    title: `${TITLE} | GlamRepairs`,
    description: DESCRIPTION,
    url: "/compare",
    type: "article",
    images: [SOCIAL_CARD],
  },
  twitter: {
    card: "summary_large_image",
    title: `${TITLE} | GlamRepairs`,
    description: DESCRIPTION,
    images: [SOCIAL_CARD.url],
  },
};

/** Ends the page, and feeds FAQPage schema from the same array. */
const FAQS = [
  {
    question: "Is a Glam Repairs assessment cheaper than seeing a dermatologist?",
    answer:
      "Not necessarily. Dermatologist consultation fees in Lahore are listed from around Rs. 300 to Rs. 5,000, so at our prices we are comparable rather than cheaper. What differs is what you leave with: a full written assessment you keep, delivered within 24 hours, with 30 days of follow-up included — and no travel.",
  },
  {
    question: "Can Glam Repairs prescribe medication or diagnose a skin condition?",
    answer:
      "No. Neither. We are a certified aesthetics practice, not a medical one. If your photographs or answers suggest a medical skin condition, we tell you, refer you to a doctor, and refund you rather than writing you a routine.",
  },
  {
    question: "When should I see a doctor instead?",
    answer:
      "If anything on your skin is painful, spreading, bleeding, or changing shape or colour; if a mole has changed; if you have widespread or cystic acne that has not responded to over-the-counter treatment; or if you need prescription-strength treatment. In all of those a dermatologist is the right choice and we are not.",
  },
  {
    question: "Does Glam Repairs earn commission on the products it recommends?",
    answer:
      "No. Assessments name ingredients and percentages rather than product brands, and we take no commission from any brand. That is why an assessment can tell you the moisturiser you already own is fine.",
  },
  {
    question: "How is this different from a brand's online skin quiz?",
    answer:
      "A brand's quiz recommends that brand's products — it is a sales funnel shaped like a consultation. Nobody looks at your skin and no one is accountable for the answer. Our assessments are written by a named practitioner who has looked at your photographs, and they name no brands at all.",
  },
];

function Section({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="mt-12 sm:mt-14">
      <h2 className="font-serif text-2xl leading-snug text-brand-primary sm:text-[1.75rem]">
        {title}
      </h2>
      <div className="mt-4 space-y-4 text-[0.9375rem] leading-relaxed text-brand-ink">
        {children}
      </div>
    </section>
  );
}

function Cite({ id }: { id: string }) {
  const source = compareSource(id);
  return (
    <a
      href={source.url}
      target="_blank"
      rel="noopener nofollow"
      className="text-brand-primary underline underline-offset-2"
    >
      {source.label}
    </a>
  );
}

export default async function ComparePage() {
  const matrix = await buildCompareMatrix();

  return (
    <>
      <JsonLd
        data={graph(
          breadcrumbSchema([
            { name: "Home", path: "/" },
            { name: "Compared with the alternatives", path: "/compare" },
          ]),
          faqSchema(FAQS, "/compare"),
        )}
      />

      {/* HANDOVER-23 §1.4 — the third and last section to get the radial.
          A comparison is the densest reading on the site, and lifting the
          page off a flat white ground is what stops the matrix looking
          like a spreadsheet. */}
      <main className="gr-section-glow--white px-5 py-14 sm:px-6 sm:py-16">
        <div className="mx-auto max-w-5xl">
        <nav className="mb-8 text-sm text-brand-gray">
          <Link href="/" className="underline underline-offset-2">
            Home
          </Link>
          <span aria-hidden> / </span>
          <span>Compared with the alternatives</span>
        </nav>

        <header className="max-w-3xl">
          <p className="gr-eyebrow mb-3">Honestly compared</p>
          <h1 className="font-serif text-3xl leading-tight text-brand-primary sm:text-4xl">
            {TITLE}
          </h1>
          <p className="mt-4 text-base leading-relaxed text-brand-ink sm:text-lg">
            Every figure below is sourced and linked. Two rows in the table
            read &ldquo;No&rdquo; for us and &ldquo;Yes&rdquo; for a doctor,
            and they are the two rows worth reading first — a comparison that
            wins everywhere is a sales page, not a comparison.
          </p>
          <p className="mt-3 text-sm leading-relaxed text-brand-gray">
            Prices are shown for {matrix.region.label} because the clinic and
            consultation fees they sit beside are Pakistani market figures.
            See <Link href="/pricing" className="underline underline-offset-2">pricing</Link>{" "}
            for prices in your own currency.
          </p>
        </header>

        <div className="mt-10">
          <CompareMatrixTable matrix={matrix} />
        </div>

        <Section id="dermatologist" title="Seeing a dermatologist">
          <p>
            This is the strongest alternative on the page, and the one we have
            the least interest in misrepresenting. A dermatologist can
            prescribe, can diagnose disease, can perform procedures, and can
            examine your skin under a light rather than in a photograph. None
            of that is available here, and no amount of writing makes it so.
          </p>
          <p>
            <strong className="font-medium">
              For a suspected skin disease, a dermatologist is the right choice
              and we are not.
            </strong>{" "}
            If your answers or photographs suggest one, we say so, point you
            towards a doctor, and refund you. That is not a disclaimer at the
            bottom of a page — it is the outcome we would rather have than a
            fee.
          </p>
          <p>
            What differs is the shape of the encounter rather than the
            competence behind it. Consultations are typically short. In most
            cases nothing is written down for you to take away, so the routine
            lives in your memory of a ten-minute conversation. Follow-up is
            usually a second appointment and a second fee. And in a private
            clinic the treatment being recommended is also the thing being
            sold, which is a structural point about the model, not a criticism
            of any practitioner.
          </p>
          <p className="text-sm text-brand-gray">
            Fee figures from <Cite id="oladocLahore" /> and{" "}
            <Cite id="oladocVideo" />; general consultation-fee context from{" "}
            <Cite id="marhamFees" />.
          </p>
        </Section>

        <Section id="products" title="Buying products and hoping">
          <p>
            This is what most people are actually doing, and it is the only
            option on this page with no one behind it at all. It is also the
            one where we could not find a credible published figure for what
            it costs in Pakistan — so rather than invent one, the table labels
            its range as illustrative.
          </p>
          <p>
            Do your own arithmetic instead. Three products that did not suit
            you, bought over a year, at the price of the serums that get
            recommended on Instagram. The number people arrive at is almost
            always larger than they expected, and it buys no diagnosis, no
            order to follow, and nothing written down — which is why the same
            mistake tends to repeat with a different bottle.
          </p>
          <p>
            The genuine strength of this route: if something already works for
            you, repurchasing it is the correct decision and nobody needs to be
            paid to confirm it.
          </p>
        </Section>

        <Section id="influencers" title="Influencer and Instagram advice">
          <p>
            Free, immediate, and structurally conflicted. The conflict is not
            dishonesty on anyone&rsquo;s part: it is that paid partnerships,
            gifted PR packages and affiliate links are how the content is
            funded, and funding shapes what gets recommended. Where influencer
            marketing is regulated, a paid relationship, a free product or a
            discount all count as a material connection that must be disclosed
            with the post itself — see <Cite id="ftcInfluencers" />.
          </p>
          <p>
            The deeper problem is not disclosure. It is that advice tuned to
            one person&rsquo;s skin is not advice for yours. A routine that
            transformed someone with oily, resilient skin is the routine that
            will strip a dry, reactive barrier — and neither of you will know
            which of you is which from a video.
          </p>
          <p>
            Used as general reading, it is genuinely useful and costs nothing.
            Used as a decision about your own skin, nobody involved is
            accountable for the outcome.
          </p>
        </Section>

        <Section id="quizzes" title="Brand quizzes">
          <p>
            A brand&rsquo;s skin quiz recommends that brand&rsquo;s products.
            That is not a flaw in the quiz; it is the quiz&rsquo;s purpose. It
            is a sales funnel shaped like a consultation, and the resemblance
            is the point — the questions feel diagnostic because feeling
            diagnostic is what makes the recommendation persuasive.
          </p>
          <p>
            Anyone can test this in two minutes: answer one honestly, then
            answer it as though you had the opposite skin type, and see whether
            the recommendation leaves the brand&rsquo;s own range. It never
            does, because it cannot.
          </p>
          <p>
            It costs nothing and it will reliably find you a cleanser. It will
            never tell you that the problem is that you are using three
            actives, or that you should stop buying things for a fortnight.
          </p>
        </Section>

        <Section id="fairness-creams" title="Unregulated skin-lightening creams">
          <p>
            This one is not a comparison so much as a warning, and it is the
            reason several people arrive here in the first place — usually
            with marks that a cream has made worse.
          </p>
          <p>
            In a 2026 analysis of ten skin-lightening brands sampled from the
            Lahore market, hydroquinone was found at up to 5.56% and mercury at
            up to 4.9 ppm, above USFDA and Pakistani limits. The same samples
            contained undeclared corticosteroids: hydrocortisone in half of
            them, betamethasone and prednisolone in three in ten, dexamethasone
            in two in ten. None of that appears on a label (
            <Cite id="creamsLahore2026" />
            ).
          </p>
          <p>
            An earlier study of twenty creams from the Pakistani market found
            mercury in 95% of samples and above Pakistan&rsquo;s own 1 ppm
            limit in 75%, ranging up to 7.7 ppm (
            <Cite id="creamsSustainability" />
            ).
          </p>
          <p>
            The practical consequence is the part worth knowing: an
            undisclosed steroid makes skin look better for a few weeks and then
            thins it, and stopping causes a rebound that is usually worse than
            the original complaint. Pigmentation that took three months to
            treat becomes pigmentation that takes a year. If you are using
            something that worked unusually fast, that is the most likely
            reason.
          </p>
        </Section>

        <Section id="wrong-choice" title="When we are the wrong choice">
          <p>
            An honest comparison has to include the cases where the answer is
            not us. These are those cases, and in every one of them the right
            move is a doctor:
          </p>
          <ul className="space-y-2.5">
            {[
              "Anything painful, spreading, bleeding, or weeping.",
              "A mole or mark that has changed shape, size or colour.",
              "Widespread or cystic acne, or acne that has not responded to over-the-counter treatment.",
              "A rash with fever, or one that appeared suddenly across the body.",
              "Anything you need a prescription for — isotretinoin, prescription-strength retinoids, oral antibiotics.",
              "A skin condition you have already been diagnosed with and are being treated for.",
            ].map((item) => (
              <li key={item} className="flex items-start gap-2.5">
                <span
                  aria-hidden
                  className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-primary"
                />
                <span>{item}</span>
              </li>
            ))}
          </ul>
          <p>
            If you submit an assessment and it turns out to be one of these, we
            tell you and refund you. We would rather lose the fee than write a
            skincare routine for something that needs a doctor.
          </p>
        </Section>

        <Section id="questions" title="Questions people ask">
          <dl className="space-y-6">
            {FAQS.map((faq) => (
              <div key={faq.question}>
                <dt className="font-medium text-brand-ink">{faq.question}</dt>
                <dd className="mt-1.5 leading-relaxed text-brand-gray">
                  {faq.answer}
                </dd>
              </div>
            ))}
          </dl>
        </Section>

        <section className="mt-14 rounded-[2rem] bg-brand-cream/70 px-5 py-8 text-center sm:px-8 sm:py-10">
          <h2 className="font-serif text-2xl leading-snug text-brand-primary sm:text-[1.75rem]">
            Read one before you decide
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-brand-gray sm:text-[0.9375rem]">
            The whole document is published — structure, length and wording —
            so you can judge it rather than take our word for it.
          </p>
          <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Link
              href="/sample-assessment"
              className="inline-flex items-center justify-center rounded-full bg-brand-primary px-10 py-3.5 text-xs font-semibold uppercase tracking-[0.14em] text-white transition-opacity hover:opacity-90 sm:text-sm"
            >
              See a real assessment
            </Link>
            <Link
              href={onboardingHref}
              className="inline-flex items-center justify-center rounded-full border border-brand-primary/40 px-10 py-3.5 text-xs font-semibold uppercase tracking-[0.14em] text-brand-primary transition-colors hover:bg-brand-primary/5 sm:text-sm"
            >
              Start my assessment
            </Link>
          </div>
        </section>
        </div>
      </main>
    </>
  );
}
