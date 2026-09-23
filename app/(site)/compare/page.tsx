import type { Metadata } from "next";
import Link from "next/link";

import CompareMatrixTable from "@/components/compare/CompareMatrixTable";
import ReceiptsComparison from "@/components/compare/ReceiptsComparison";
import { onboardingHref } from "@/components/home/Navbar";
import JsonLd from "@/components/seo/JsonLd";
import { buildCompareMatrix } from "@/lib/compare/compareMatrix";
import { compareSource } from "@/lib/compare/sources";
import { getPlanSettings } from "@/lib/plans/planSettings";
import { formatRegionPrice } from "@/lib/pricing/regions";
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
 *
 * ── The receipts, added above the matrix ─────────────────────────────────
 * The matrix answers "what does each option include". It does not answer
 * the question a reader is actually holding, which is "what will this have
 * cost me by the time my skin has changed". Skin responds over eight to
 * twelve weeks, so a single consultation fee is the wrong unit of
 * comparison and a table of one-off prices quietly flatters whichever
 * column is cheapest on the day. Three till slips priced over a season fix
 * that, and they do it before the table rather than after, because it is
 * the frame the table should be read inside.
 *
 * The same sourcing rule applies to them: the two non-Glam-Repairs slips
 * are marked illustrative and tied back to figures this page already
 * cites, and every line on ours is read from the database. See
 * components/compare/ReceiptsComparison.tsx.
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
  const [matrix, plans] = await Promise.all([
    buildCompareMatrix(),
    getPlanSettings(),
  ]);

  /*
   * The matrix pins itself to Pakistan, but falls back to the default
   * region if that row is ever deactivated or the database is unreachable.
   * That fallback is right — an outage should not blank the price — but it
   * cannot go unsaid here, because every other figure on this page is in
   * rupees. "$22" beside "Rs. 9,200" on a receipt compares nothing, and the
   * sourcing sentence would otherwise read "prices are shown for
   * International because the fees beside them are Pakistani", which is
   * nonsense the moment it is true.
   */
  const pricedForPakistan = matrix.region.code === "PK";

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

        <header className="mx-auto max-w-3xl text-center">
          <p className="gr-eyebrow gr-eyebrow--center mb-3">
            Three months, three receipts
          </p>
          {/*
            The h1 is the argument, not the page's name. "Compared with the
            alternatives" still does the search-facing work from the title
            tag and the breadcrumb; a heading that only repeats the title
            tells a reader who has already clicked nothing they did not
            know. The sentence under it carries the same words for anyone —
            or anything — reading the page rather than the head.
          */}
          <h1 className="font-serif text-[1.85rem] leading-tight text-brand-ink sm:text-[2.3rem]">
            Everyone pays. The question is{" "}
            <em className="italic text-brand-primary">
              what you get a receipt for.
            </em>
          </h1>
          <p className="mx-auto mt-3.5 max-w-xl text-[0.9375rem] leading-[1.75] text-brand-gray">
            These are the three ways people deal with a skin problem in
            Pakistan &mdash; an online skin assessment, a private clinic
            visit, and working it out yourself &mdash; priced over the time
            it actually takes skin to change.
          </p>
        </header>

        <div className="mt-10">
          <ReceiptsComparison
            region={matrix.region}
            transform={plans.transform}
            clinicFeeSourceIndex={
              matrix.usedSourceIds.indexOf("oladocLahore") + 1
            }
            pricedForPakistan={pricedForPakistan}
          />
        </div>

        {/* ── The verdict ── */}
        <div className="mt-14 rounded-[1.25rem] border border-brand-border-light bg-white p-8 shadow-[0_1px_2px_rgba(102,45,145,.05),0_18px_40px_-20px_rgba(102,45,145,.24)]">
          <h2 className="font-serif text-2xl leading-snug text-brand-ink sm:text-[1.6rem]">
            The difference is not the price. It is{" "}
            <em className="italic text-brand-primary">what the price buys</em>
          </h2>
          <div className="mt-3 max-w-[45rem] space-y-3.5 text-[0.9375rem] leading-[1.8] text-brand-gray">
            <p className="text-[1.0625rem] text-brand-ink">
              Two of these receipts end at the counter. One of them is still
              working in week six.
            </p>
            <p>
              Skin takes eight to twelve weeks to respond to anything, which
              is why a receipt from one appointment is a strange thing to
              compare against three months of a problem. The products on the
              first receipt were not badly chosen; nobody had enough
              information to choose well. The clinic on the second receipt
              did nothing wrong in twelve minutes; twelve minutes is simply
              not enough time to go through everything you use.
            </p>
            <p>
              <strong className="font-medium text-brand-ink">
                We are not the cheapest option on this page.
              </strong>{" "}
              Free advice is cheapest, and most of what is on the first
              receipt was bought because of it. At our price we are
              comparable to a clinic visit rather than cheaper than one. We
              are the option where somebody is still there when your skin
              does something unexpected in week three.
            </p>
          </div>
        </div>

        <div className="mt-14">
          <p className="mb-5 text-sm leading-relaxed text-brand-gray">
            Line by line, then. Every figure below is sourced and linked. Two
            rows read &ldquo;No&rdquo; for us and &ldquo;Yes&rdquo; for a
            doctor, and they are the two rows worth reading first &mdash; a
            comparison that wins everywhere is a sales page, not a
            comparison.{" "}
            {pricedForPakistan ? (
              <>
                Prices are shown for {matrix.region.label} because the clinic
                and consultation fees they sit beside are Pakistani market
                figures; see{" "}
                <Link href="/pricing" className="underline underline-offset-2">
                  pricing
                </Link>{" "}
                for prices in your own currency.
              </>
            ) : (
              <>
                Our Pakistan price could not be read just now, so the Glam
                Repairs figures below are shown for {matrix.region.label}{" "}
                while every fee beside them is a Pakistani market figure.{" "}
                <Link href="/pricing" className="underline underline-offset-2">
                  Pricing
                </Link>{" "}
                has the current price in your own currency.
              </>
            )}
          </p>
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

        {/*
          HANDOVER-22's "When we are the wrong choice" section, rebuilt as
          two cards.

          The list itself is unchanged in substance and slightly longer: the
          supplied design added persistent redness with visible blood
          vessels, and skin problems alongside fatigue or irregular periods.
          Both are worth routing away and neither was here before.

          The second card is the actual change. A page that only lists who
          should leave gives a reader who should stay nothing to recognise
          themselves in, and the two lists are read together — which is what
          makes the first one land as a boundary rather than as
          small print.
        */}
        <section id="wrong-choice" className="mt-12 grid gap-4 sm:mt-14 md:grid-cols-2">
          <div className="flex flex-col rounded-[1.25rem] border border-[#f0e4c8] bg-brand-cream-card px-[26px] py-6">
            <h2 className="font-serif text-[1.1875rem] italic text-[#8a6a1f]">
              When you should not choose us
            </h2>
            <ul className="mb-3.5 mt-3 list-disc space-y-1 pl-[18px] text-sm leading-[1.9] text-brand-gray marker:text-[#c9a94f]">
              {[
                "Anything painful, spreading, bleeding or weeping.",
                "A mole or mark that has changed shape, size or colour.",
                "Widespread or cystic acne, or acne that has not responded to over-the-counter treatment.",
                "Persistent redness with visible blood vessels.",
                "A rash with fever, or one that appeared suddenly across the body.",
                "Skin problems alongside fatigue or irregular periods.",
                "Anything you need a prescription for — isotretinoin, prescription-strength retinoids, oral antibiotics.",
                "A skin condition you have already been diagnosed with and are being treated for.",
              ].map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <p className="mt-auto border-t border-[#f0e4c8] pt-3 text-[0.8125rem] leading-relaxed text-brand-gray">
              <strong className="font-medium text-brand-ink">
                Tell us any of these and we say so, then refund you.
              </strong>{" "}
              We would rather lose the fee than write a skincare routine for
              something that needs a doctor.
            </p>
          </div>

          <div className="flex flex-col rounded-[1.25rem] border border-brand-border-light bg-white px-[26px] py-6">
            <h2 className="font-serif text-[1.1875rem] italic text-brand-primary">
              This is what we are for
            </h2>
            <ul className="mb-3.5 mt-3 list-disc space-y-1 pl-[18px] text-sm leading-[1.9] text-brand-gray marker:text-brand-accent">
              {[
                "You have tried things and nothing worked.",
                "Your skin started reacting to products it used to tolerate.",
                "You have dark marks and do not know which kind.",
                "Your routine has grown to seven products.",
                "You want to know why, not just what to buy.",
                "You want someone to check when it is not working.",
              ].map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <p className="mt-auto border-t border-brand-border-light pt-3 text-[0.8125rem] leading-relaxed text-brand-gray">
              If two or more of these sound like you, an assessment is the
              right next step.
            </p>
          </div>
        </section>

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

        {/*
          One primary action, not two side by side.

          The design this was built from ends on a single button to the
          sample. That is the right order for this page: a reader who has
          just been shown three receipts is deciding whether the third one
          is worth it, and the honest answer to that is "read one". Starting
          stays one click away in the line underneath rather than competing
          with it, which is where the sticky Get Started tab already points
          anyway.
        */}
        <section className="mt-[34px] rounded-[1.25rem] border border-[#f0e4c8] bg-brand-cream-card px-7 py-[34px] text-center">
          <h2 className="font-serif text-2xl leading-snug text-brand-ink sm:text-[1.5rem]">
            Read a full assessment{" "}
            <em className="italic text-brand-primary">before you pay</em>
          </h2>
          <p className="mx-auto mt-2 max-w-[32.5rem] text-[0.9063rem] leading-relaxed text-brand-gray">
            The whole document, start to finish &mdash; structure, length and
            wording. Decide whether it is worth{" "}
            {formatRegionPrice(matrix.region, "transform")} after you have
            seen one, not before.
          </p>
          <Link
            href="/sample-assessment"
            className="mt-5 inline-block rounded-full bg-brand-primary px-[34px] py-[15px] text-[0.9375rem] font-medium text-white shadow-[0_10px_24px_-10px_rgba(102,45,145,.6)] transition-transform hover:-translate-y-0.5"
          >
            See a real assessment &rarr;
          </Link>
          <span className="mt-3 block text-[0.8125rem] text-[#8a8590]">
            Then, if it looks right,{" "}
            <Link
              href={onboardingHref}
              className="text-brand-primary underline underline-offset-2"
            >
              starting takes about eight minutes
            </Link>
            .
          </span>
        </section>
        </div>
      </main>
    </>
  );
}
