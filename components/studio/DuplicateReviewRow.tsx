"use client";

import Link from "next/link";
import { useFormStatus } from "react-dom";

import {
  dismissDuplicateAction,
  keepBothSubmissionsAction,
} from "@/lib/studio/actions";

/**
 * HANDOVER-20 Part 1 — one row in the review queue, with the only two
 * decisions available: keep both, or dismiss this one.
 *
 * "Dismiss" archives rather than deletes, so a wrong call costs nothing —
 * which is what lets this queue be worked quickly instead of agonised over.
 */

type DuplicateReviewRowProps = {
  leadId: string;
  displayRef: string;
  fullName: string | null;
  email: string | null;
  createdAt: string;
  submissionNo: number | null;
  planName: string | null;
  funnelComplete: boolean;
  paymentStatus: string;
  isTest: boolean;
  duplicateOf: string | null;
  reasonLabel: string;
  reasonAction: string;
};

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function Button({
  idle,
  busy,
  destructive,
}: {
  idle: string;
  busy: string;
  destructive?: boolean;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={
        destructive
          ? "rounded-xl border border-brand-error/40 bg-white px-4 py-2 text-sm text-brand-error transition-opacity disabled:opacity-50"
          : "rounded-xl border border-brand-lavender/70 bg-white px-4 py-2 text-sm text-brand-ink transition-opacity disabled:opacity-50"
      }
    >
      {pending ? busy : idle}
    </button>
  );
}

export default function DuplicateReviewRow({
  leadId,
  displayRef,
  fullName,
  email,
  createdAt,
  submissionNo,
  planName,
  funnelComplete,
  paymentStatus,
  isTest,
  duplicateOf,
  reasonLabel,
  reasonAction,
}: DuplicateReviewRowProps) {
  return (
    <li className="rounded-2xl border border-brand-lavender/70 bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-medium text-brand-ink">
            <Link
              href={`/studio/customers/${leadId}`}
              className="text-brand-primary underline-offset-2 hover:underline"
            >
              {fullName || "Unnamed"}
            </Link>
            <span className="ml-2 font-mono text-xs text-brand-gray">
              {displayRef}
            </span>
            {submissionNo ? (
              <span className="ml-2 rounded-full bg-brand-accent/15 px-2 py-0.5 text-[0.6875rem] text-brand-accent">
                #{submissionNo}
              </span>
            ) : null}
            {isTest ? (
              <span className="ml-2 rounded-full bg-brand-lavender/40 px-2 py-0.5 text-[0.6875rem] text-brand-gray">
                test
              </span>
            ) : null}
          </p>
          <p className="mt-1 text-xs text-brand-gray">
            {email || "No email"} · {formatDate(createdAt)} ·{" "}
            {planName || "no plan"} ·{" "}
            {funnelComplete ? "completed" : "unfinished"}
            {paymentStatus === "verified" ? " · paid" : ""}
          </p>
          <p className="mt-2 text-sm text-brand-ink">
            <span className="font-medium">{reasonLabel}.</span> {reasonAction}
          </p>
          {duplicateOf ? (
            <p className="mt-1 text-xs">
              <Link
                href={`/studio/customers/${duplicateOf}`}
                className="text-brand-primary underline-offset-2 hover:underline"
              >
                Compare with the earlier submission
              </Link>
            </p>
          ) : null}
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <form action={keepBothSubmissionsAction}>
            <input type="hidden" name="leadId" value={leadId} />
            <Button idle="Keep both" busy="Saving…" />
          </form>
          <form action={dismissDuplicateAction}>
            <input type="hidden" name="leadId" value={leadId} />
            <Button destructive idle="Dismiss this one" busy="Dismissing…" />
          </form>
        </div>
      </div>
    </li>
  );
}
