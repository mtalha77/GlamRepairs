import Link from "next/link";

import { leadDisplayRef } from "@/lib/leads/displayRef";
import {
  DUPLICATE_REASON_ACTION,
  DUPLICATE_REASON_LABEL,
  isDuplicateReason,
  type PersonHistory,
  type SiblingSubmission,
} from "@/lib/studio/duplicates";

/**
 * HANDOVER-20 Part 1 — "3rd submission from this person."
 *
 * ── Why the tone changes with the reason ─────────────────────────────────
 * The handover's table has two entries that call for opposite responses:
 * `likely_double_submit` wants one row dismissed, `returning_client` wants
 * the person treated as the best customer the business has. A single
 * neutral "duplicate detected" banner would flatten that distinction and
 * train whoever reads it to dismiss both.
 *
 * So a returning client gets a positive framing and a prompt to open the
 * previous report; an accidental resubmit gets a warning framing. Same
 * component, different colour and different instruction.
 */

type RepeatSubmissionBannerProps = {
  submissionNo: number | null;
  duplicateReason: string | null;
  duplicateOf: string | null;
  history: PersonHistory | null;
  siblings: SiblingSubmission[];
};

function ordinal(n: number) {
  const rem100 = n % 100;
  if (rem100 >= 11 && rem100 <= 13) return `${n}th`;
  switch (n % 10) {
    case 1:
      return `${n}st`;
    case 2:
      return `${n}nd`;
    case 3:
      return `${n}rd`;
    default:
      return `${n}th`;
  }
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default function RepeatSubmissionBanner({
  submissionNo,
  duplicateReason,
  duplicateOf,
  history,
  siblings,
}: RepeatSubmissionBannerProps) {
  const isRepeat = (submissionNo ?? 1) > 1;
  // A reason can be present without a submission number and vice versa;
  // either alone is worth surfacing.
  if (!isRepeat && !duplicateReason) return null;

  const reason = isDuplicateReason(duplicateReason ?? "")
    ? (duplicateReason as keyof typeof DUPLICATE_REASON_LABEL)
    : null;

  const returning = reason === "returning_client";
  const needsAttention =
    reason === "likely_double_submit" || reason === "superseded_by_restart";

  const tone = returning
    ? "border-brand-primary/30 bg-brand-lavender/20"
    : needsAttention
      ? "border-brand-error/30 bg-brand-error/5"
      : "border-brand-accent/40 bg-brand-accent/5";

  return (
    <section className={`rounded-2xl border px-5 py-4 ${tone}`}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 className="text-sm font-medium text-brand-ink">
          {returning
            ? "Returning client"
            : isRepeat
              ? `${ordinal(submissionNo ?? 2)} submission from this person`
              : "Linked to another submission"}
        </h2>
        {history ? (
          <p className="text-xs text-brand-gray">
            First seen {formatDate(history.firstSeen)} · {history.submissions}{" "}
            submission{history.submissions === 1 ? "" : "s"} ·{" "}
            {history.completed} completed · {history.paid} paid
          </p>
        ) : null}
      </div>

      {reason ? (
        <p className="mt-2 text-sm leading-relaxed text-brand-ink">
          <span className="font-medium">{DUPLICATE_REASON_LABEL[reason]}.</span>{" "}
          {DUPLICATE_REASON_ACTION[reason]}
        </p>
      ) : null}

      {duplicateOf ? (
        <p className="mt-2 text-sm text-brand-gray">
          Linked as a duplicate of{" "}
          <Link
            href={`/studio/customers/${duplicateOf}`}
            className="text-brand-primary underline-offset-2 hover:underline"
          >
            the earlier submission
          </Link>
          .
        </p>
      ) : null}

      {siblings.length > 0 ? (
        <details className="mt-3">
          <summary className="cursor-pointer text-sm text-brand-primary">
            View history ({siblings.length} other submission
            {siblings.length === 1 ? "" : "s"})
          </summary>
          <ul className="mt-2 space-y-1.5">
            {siblings.map((sibling) => (
              <li key={sibling.id} className="text-sm text-brand-gray">
                <Link
                  href={`/studio/customers/${sibling.id}`}
                  className="font-mono text-xs text-brand-primary underline-offset-2 hover:underline"
                >
                  {leadDisplayRef(sibling.sessionId) ?? sibling.id}
                </Link>{" "}
                · {formatDate(sibling.createdAt)} ·{" "}
                {sibling.planName || "no plan"} ·{" "}
                {sibling.funnelComplete ? "completed" : "unfinished"}
                {sibling.paymentStatus === "verified" ? " · paid" : ""}
              </li>
            ))}
          </ul>
        </details>
      ) : null}

      {returning ? (
        <p className="mt-3 rounded-xl bg-white/70 px-3 py-2 text-sm leading-relaxed text-brand-ink">
          Open their previous report before writing this one. Continuity is
          the value of a repeat assessment — &ldquo;last time we started you on
          niacinamide, how did that go?&rdquo; is worth more than any new
          questionnaire.
        </p>
      ) : null}
    </section>
  );
}
