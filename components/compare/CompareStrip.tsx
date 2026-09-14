import Link from "next/link";

import { ILLUSTRATIVE_PRODUCT_SPEND } from "@/lib/compare/compareMatrix";
import { getPlanSettings } from "@/lib/plans/planSettings";
import { formatRegionPrice, type PricingRegion } from "@/lib/pricing/regions";

/**
 * HANDOVER-22 §5a — the compact comparison, directly under the pricing cards.
 *
 * Four columns, no prose, and three rules that make it credible rather than
 * salesy:
 *
 * 1. **We are not the cheapest.** "Free" sits on the right with crosses
 *    against it. Claiming the lowest price would be both false and weaker.
 * 2. **Every other column keeps at least one tick.** A column with nothing
 *    good in it is a straw man, and a reader who spots one stops trusting
 *    the whole strip.
 * 3. **Nothing of ours is ever struck through.**
 *
 * ── One instruction deliberately not followed ────────────────────────────
 * §5a's table shows the clinic price struck through. Its own warning
 * immediately below says: "Do not anchor on price against a dermatologist.
 * Lahore dermatologists charge Rs. 1,000–5,000 … at Rs. 2,000–3,500 you are
 * comparable rather than cheaper." Both cannot be true — a struck-through
 * clinic fee beside our price is exactly that anchor, and it would claim a
 * saving that does not exist. The warning is the more specific instruction
 * and the honest one, so the clinic fee renders plainly and that column
 * argues what is actually different: brief, nothing written down, and the
 * clinic is selling the treatment. Only the trial-and-error figure — where
 * we genuinely do cost less — is struck.
 *
 * ── Why this renders for Pakistan only ───────────────────────────────────
 * Every competing figure is a Pakistani market figure. Putting "£12" beside
 * "Rs. 300–5,000" compares nothing, so outside PK the strip collapses to
 * the link alone. /pricing still shows every visitor their own price.
 */

type Column = {
  label: string;
  price: string;
  /** Struck through: a cost the reader avoids by choosing us. */
  struck?: boolean;
  priceNote?: string;
  ours?: boolean;
  points: { text: string; good: boolean }[];
};

function Mark({ good }: { good: boolean }) {
  return good ? (
    <svg viewBox="0 0 12 12" className="mt-1 h-3.5 w-3.5 shrink-0 text-brand-primary" fill="none" aria-hidden>
      <path d="M2 6.5L4.8 9L10 3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ) : (
    <svg viewBox="0 0 12 12" className="mt-1 h-3.5 w-3.5 shrink-0 text-brand-gray" fill="none" aria-hidden>
      <path d="M3 3L9 9M9 3L3 9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export default async function CompareStrip({
  region,
}: {
  region: PricingRegion;
}) {
  const isPakistan = region.code === "PK";

  if (!isPakistan) {
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

  // The follow-up window is read rather than typed, for the same reason the
  // prices are: a marketing strip that disagrees with plan_settings is how
  // "30 days" outlives the decision to change it.
  const plans = await getPlanSettings();
  const supportDays = plans.clarity.supportDays;

  const columns: Column[] = [
    {
      label: "Private clinic visit",
      price: "Rs. 300–5,000",
      priceNote: "Lahore dermatologist listings",
      points: [
        { text: "A qualified doctor examines you", good: true },
        { text: "Can prescribe and diagnose", good: true },
        { text: "Usually nothing written to take away", good: false },
        { text: "Follow-up is a second fee", good: false },
        { text: "A private clinic sells the treatment", good: false },
      ],
    },
    {
      label: "Trial and error",
      price: ILLUSTRATIVE_PRODUCT_SPEND,
      struck: true,
      priceNote: "Illustrative, not a survey figure",
      points: [
        { text: "You can start today", good: true },
        { text: "Nobody looks at your skin", good: false },
        { text: "No plan, no order to follow", good: false },
        { text: "The same mistake repeats", good: false },
      ],
    },
    {
      label: "Glam Repairs",
      price: formatRegionPrice(region, "clarity"),
      ours: true,
      priceNote: `From ${formatRegionPrice(region, "clarity")}`,
      points: [
        { text: "A named practitioner reads your photographs", good: true },
        { text: "A full written assessment you keep", good: true },
        { text: "Within 24 hours, no travel", good: true },
        {
          text: supportDays
            ? `${supportDays} days of follow-up included`
            : "Follow-up included",
          good: true,
        },
        { text: "Cannot prescribe or diagnose disease", good: false },
      ],
    },
    {
      label: "Free advice online",
      price: "Free",
      priceNote: "Instagram, brand quizzes",
      points: [
        { text: "Costs nothing, available now", good: true },
        { text: "Written for nobody in particular", good: false },
        { text: "Paid partnerships and own-brand ranges", good: false },
        { text: "Nobody is accountable for it", good: false },
      ],
    },
  ];

  return (
    <div className="mt-12 sm:mt-14">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {columns.map((column) => (
          <div
            key={column.label}
            className={`rounded-2xl border p-5 ${
              column.ours
                ? "border-brand-primary/40 bg-brand-lavender/20"
                : "border-brand-border-light/70 bg-white"
            }`}
          >
            <h3
              className={`text-sm font-semibold ${
                column.ours ? "text-brand-primary" : "text-brand-ink"
              }`}
            >
              {column.label}
            </h3>
            <p
              className={`mt-2 text-xl font-medium ${
                column.ours ? "text-brand-primary" : "text-brand-ink"
              } ${column.struck ? "line-through decoration-brand-gray/60" : ""}`}
            >
              {column.price}
            </p>
            {column.priceNote ? (
              <p className="mt-0.5 text-[11px] leading-snug text-brand-gray">
                {column.priceNote}
              </p>
            ) : null}

            <ul className="mt-4 space-y-2">
              {column.points.map((point) => (
                <li
                  key={point.text}
                  className="flex items-start gap-2 text-[13px] leading-relaxed text-brand-ink"
                >
                  <Mark good={point.good} />
                  <span>{point.text}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <p className="mt-6 text-center text-sm">
        <Link
          href="/compare"
          className="font-medium text-brand-primary underline underline-offset-4 hover:opacity-80"
        >
          See the full comparison →
        </Link>
      </p>
    </div>
  );
}
