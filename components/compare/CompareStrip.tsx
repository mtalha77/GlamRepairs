import Link from "next/link";

import { ILLUSTRATIVE_PRODUCT_SPEND } from "@/lib/compare/compareMatrix";
import { getPlanSettings } from "@/lib/plans/planSettings";
import { type PricingRegion } from "@/lib/pricing/regions";
import {
  formatPlanPrice,
  getPaidPlan,
  PAID_PLAN_KEY,
} from "@/lib/plans/plansPublic";

/**
 * The compact comparison, directly under the pricing cards.
 *
 * HANDOVER-22 §5a created this as four bullet columns; HANDOVER-23 rebuilt
 * it to the supplied design — a tick matrix, which is both shorter to read
 * and harder to argue with than a list of adjectives.
 *
 * ── Three rules that keep it credible rather than salesy ─────────────────
 * 1. **Every other column keeps at least one tick.** Trying products
 *    yourself genuinely wins on "works with what you can buy locally" and
 *    "no travel"; a clinic genuinely wins on "someone looks at your actual
 *    skin". A column with nothing good in it is a straw man, and a reader
 *    who spots one stops trusting the whole table.
 * 2. **Nothing of ours is ever struck through.**
 * 3. The last row is not a tick at all. "How soon you have it" is a plain
 *    value in every column, because a row where the answer is a duration
 *    rather than a yes/no is more honest read as one.
 *
 * ── The clinic price, and why it is the number it is ─────────────────────
 * The supplied design showed "Rs. 3,000–5,000" struck through. The figure
 * rendered here is the one /compare cites to oladoc's live Lahore listings
 * — currently Rs. 300–5,000 — because the two pages must not disagree about
 * a number one of them sources. A visitor who checks the cited page and
 * finds a different band on the homepage has caught us being loose with the
 * only figure we offered to prove.
 *
 * Both competitor prices ARE struck, per the design. That is a change from
 * §5a's handling, where the clinic price was left plain on the argument
 * that we are comparable rather than cheaper. The design supersedes it —
 * and the footnote below the table carries the honest qualifier, that a
 * clinic is the right choice for skin that is painful, spreading or
 * changing.
 *
 * ── Why this renders for Pakistan only ───────────────────────────────────
 * Every competing figure is a Pakistani market figure. Putting "£12" beside
 * "Rs. 300–5,000" compares nothing, so outside PK the strip collapses to
 * the links alone. /pricing still shows every visitor their own price.
 */

/** The clinic band /compare cites. Keep these two pages in agreement. */
const CLINIC_PRICE_RANGE = "Rs. 300–5,000";

type Cell =
  | { kind: "yes"; note?: string }
  | { kind: "no" }
  | { kind: "text"; value: string; strong?: boolean };

type Row = {
  label: string;
  products: Cell;
  clinic: Cell;
  us: Cell;
};

function Tick({ solid = false }: { solid?: boolean }) {
  return (
    <span
      aria-hidden
      className={`inline-grid h-6 w-6 place-items-center rounded-full ${
        solid ? "bg-brand-primary text-white" : "bg-[#e8f6ee] text-[#16794a]"
      }`}
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.4" className="h-3 w-3">
        <path d="M20 6L9 17l-5-5" />
      </svg>
    </span>
  );
}

function CellContent({ cell, ours }: { cell: Cell; ours?: boolean }) {
  if (cell.kind === "no") {
    return (
      <>
        <span aria-hidden className="text-[1.1rem] leading-none text-brand-lavender">
          –
        </span>
        <span className="sr-only">No</span>
      </>
    );
  }
  if (cell.kind === "text") {
    return cell.strong ? (
      <strong className="font-semibold text-brand-ink">{cell.value}</strong>
    ) : (
      <span className="text-brand-gray">{cell.value}</span>
    );
  }
  return (
    <>
      <Tick solid={ours} />
      <span className="sr-only">Yes</span>
      {cell.note ? (
        <small
          className={`mt-1 block text-xs ${
            ours ? "font-medium text-brand-primary" : "text-brand-gray"
          }`}
        >
          {cell.note}
        </small>
      ) : null}
    </>
  );
}

export default async function CompareStrip({
  region,
}: {
  region: PricingRegion;
}) {
  // HANDOVER-27 §1.4 — the paid plan, not the retired one. A `?plan=clarity`
  // link still resolves (the funnel redirects it), but the site should not
  // be minting new ones.
  const paidHref = `/onboarding/step/1?plan=${PAID_PLAN_KEY}`;

  if (region.code !== "PK") {
    return (
      <p className="mt-10 text-center text-sm text-brand-gray sm:mt-12">
        <Link
          href="/compare"
          className="font-medium text-brand-primary underline underline-offset-4 hover:opacity-80"
        >
          See the full comparison →
        </Link>
      </p>
    );
  }

  // Read rather than typed, for the same reason the prices are: a marketing
  // table that disagrees with plan_settings is how "30 days" outlives the
  // decision to change it.
  const plans = await getPlanSettings();
  const paidPlan = await getPaidPlan(region.code);
  const supportDays = paidPlan?.supportDays ?? plans.transform.supportDays;
  const paidPrice = paidPlan ? formatPlanPrice(paidPlan) : "";
  const videoMinutes = paidPlan?.videoMinutes ?? 15;
  const followUpNote = supportDays
    ? `${supportDays} days on WhatsApp`
    : "Included";

  const rows: Row[] = [
    {
      label: "Someone looks at your actual skin",
      products: { kind: "no" },
      clinic: { kind: "yes" },
      us: { kind: "yes", note: "Your photos, in detail" },
    },
    {
      label: "A written plan you keep",
      products: { kind: "no" },
      clinic: { kind: "no" },
      us: { kind: "yes", note: "Yours forever" },
    },
    {
      label: "Built around your routine and history",
      products: { kind: "no" },
      clinic: { kind: "no" },
      us: { kind: "yes" },
    },
    {
      label: "A reason given for every step",
      products: { kind: "no" },
      clinic: { kind: "no" },
      us: { kind: "yes", note: "So you can repeat it" },
    },
    /*
     * HANDOVER-27 §1.4 — the video consultation gets its own row.
     *
     * It is the reason to choose this over a clinic at the same price, and
     * the clinic column is an honest "yes": a clinic visit obviously
     * includes seeing someone. What differs is the travel, which is why the
     * note says so rather than claiming an advantage that is not there.
     */
    {
      label: `Talk to your practitioner face to face`,
      products: { kind: "no" },
      clinic: { kind: "yes", note: "In person, if you travel" },
      us: { kind: "yes", note: `${videoMinutes} minutes on video, included` },
    },
    {
      label: "Follow-up when you have questions",
      products: { kind: "no" },
      clinic: { kind: "no" },
      us: { kind: "yes", note: followUpNote },
    },
    {
      label: "Works with what you can buy locally",
      products: { kind: "yes" },
      clinic: { kind: "no" },
      us: { kind: "yes", note: "At your budget" },
    },
    {
      label: "Nobody earning commission on it",
      products: { kind: "no" },
      clinic: { kind: "no" },
      us: { kind: "yes" },
    },
    {
      label: "No travel, no waiting room",
      products: { kind: "yes" },
      clinic: { kind: "no" },
      us: { kind: "yes" },
    },
    {
      label: "How soon you have it",
      products: { kind: "text", value: "Right away" },
      clinic: { kind: "text", value: "Same day to a week" },
      us: { kind: "text", value: "Within 24 hours", strong: true },
    },
  ];

  return (
    <div className="mt-14 sm:mt-16">
      {/* HANDOVER-23 §1.5 — the matrix gets its own three-beat opening
          rather than sitting under the pricing heading as an appendix. It
          is a separate argument from the price above it. */}
      <p className="gr-eyebrow gr-eyebrow--center">What you get</p>
      <h3 className="mx-auto mt-3.5 text-center font-serif text-[1.85rem] font-semibold leading-[1.16] tracking-[-0.018em] text-brand-ink sm:text-[2.3rem]">
        Everything you need to actually{" "}
        <em className="italic text-brand-primary">fix your skin</em>
      </h3>
      <p className="mx-auto mb-11 mt-3 max-w-[530px] text-center text-[0.9375rem] leading-[1.7] text-brand-gray">
        A plan built around your skin, your routine and what you can buy near
        you. Here is how that compares.
      </p>

      <div className="overflow-hidden rounded-[1.4rem] border border-brand-lavender/45 bg-white shadow-brand">
        {/* Wide by nature, so it scrolls inside its own container rather
            than making the page scroll sideways. */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[660px] border-separate border-spacing-0 text-left text-sm">
            <caption className="sr-only">
              How a Glam Repairs assessment compares with buying products
              yourself and with a clinic visit.
            </caption>
            <thead>
              <tr>
                <th className="border-b border-brand-lavender/45 bg-brand-cream-light px-[18px] py-[15px]">
                  <span className="sr-only">What you get</span>
                </th>
                <th
                  scope="col"
                  className="border-b border-brand-lavender/45 bg-brand-cream-light px-[18px] py-[15px] text-xs font-medium uppercase leading-[1.5] tracking-[0.06em] text-brand-gray"
                >
                  Trying products
                  <br />
                  yourself
                  <span className="mt-1.5 block font-serif text-2xl font-semibold normal-case tracking-[-0.01em] text-brand-ink line-through decoration-brand-accent/80 decoration-[1.5px]">
                    {ILLUSTRATIVE_PRODUCT_SPEND}
                  </span>
                  <span className="mt-[3px] block text-[0.6875rem] font-normal normal-case tracking-normal text-brand-gray">
                    illustrative, on things that didn&apos;t suit you
                  </span>
                </th>
                <th
                  scope="col"
                  className="border-b border-brand-lavender/45 bg-brand-cream-light px-[18px] py-[15px] text-xs font-medium uppercase leading-[1.5] tracking-[0.06em] text-brand-gray"
                >
                  A clinic visit
                  <span className="mt-1.5 block font-serif text-2xl font-semibold normal-case tracking-[-0.01em] text-brand-ink line-through decoration-brand-accent/80 decoration-[1.5px]">
                    {CLINIC_PRICE_RANGE}
                  </span>
                  <span className="mt-[3px] block text-[0.6875rem] font-normal normal-case tracking-normal text-brand-gray">
                    per appointment
                  </span>
                </th>
                <th
                  scope="col"
                  className="border-b border-brand-lavender/45 bg-brand-primary px-[18px] py-[15px] text-xs font-medium uppercase leading-[1.5] tracking-[0.06em] text-white"
                >
                  Glam Repairs
                  <span className="mt-1.5 block font-serif text-[1.75rem] font-semibold normal-case tracking-[-0.01em] text-white">
                    {paidPrice}
                  </span>
                  <span className="mt-[3px] block text-[0.6875rem] font-normal normal-case tracking-normal text-[#e3d4f2]">
                    one payment
                  </span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => {
                const last = index === rows.length - 1;
                const edge = last ? "" : "border-b border-[#f5f2f8]";
                return (
                  <tr key={row.label}>
                    <th
                      scope="row"
                      className={`min-w-[230px] bg-white px-[18px] py-[15px] font-normal text-brand-ink ${edge}`}
                    >
                      {row.label}
                    </th>
                    <td className={`px-[18px] py-[15px] text-center align-middle ${edge}`}>
                      <CellContent cell={row.products} />
                    </td>
                    <td className={`px-[18px] py-[15px] text-center align-middle ${edge}`}>
                      <CellContent cell={row.clinic} />
                    </td>
                    <td
                      className={`bg-brand-purple-soft px-[18px] py-[15px] text-center align-middle ${edge}`}
                    >
                      <CellContent cell={row.us} ours />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="border-t border-brand-lavender/45 bg-brand-cream-light px-6 py-6 text-center">
          <Link
            href={paidHref}
            className="gr-btn inline-block rounded-full bg-brand-primary px-8 py-3.5 text-[0.9375rem] font-medium text-white shadow-[0_10px_24px_-10px_rgba(102,45,145,0.55)] hover:bg-brand-primary-dark"
          >
            Get my assessment &rarr;
          </Link>
          <span className="mt-3 block text-[0.8125rem] text-brand-gray">
            {paidPrice}, one payment. Your plan arrives within 24 hours.
          </span>
        </div>
      </div>

      <div className="mt-[26px] text-center">
        <Link
          href="/sample-assessment"
          className="border-b border-brand-lavender pb-0.5 text-[0.9063rem] font-medium text-brand-primary transition-colors hover:border-brand-primary"
        >
          See a real assessment first
        </Link>
        {/*
          The qualifier that makes the table above trustworthy rather than
          triumphant. It is the same position every other page takes: a
          clinic is genuinely the right choice for some people, and we would
          rather refund them than sell them a routine.
        */}
        <p className="mx-auto mt-3.5 max-w-[480px] text-xs leading-[1.7] text-[#8a8590]">
          A clinic is the right choice if your skin is painful, spreading or
          changing quickly. If that sounds like you, tell us and we will say
          so, and refund you.
        </p>
        <p className="mt-3 text-xs text-brand-gray">
          <Link
            href="/compare"
            className="underline underline-offset-4 hover:text-brand-primary"
          >
            See the full comparison, with sources →
          </Link>
        </p>
      </div>
    </div>
  );
}
