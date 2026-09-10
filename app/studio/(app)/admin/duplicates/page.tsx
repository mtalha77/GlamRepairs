import Link from "next/link";
import { notFound } from "next/navigation";

import DuplicateReviewRow from "@/components/studio/DuplicateReviewRow";
import { leadDisplayRef } from "@/lib/leads/displayRef";
import {
  DUPLICATE_REASON_ACTION,
  DUPLICATE_REASON_LABEL,
  isDuplicateReason,
  listDuplicatesForReview,
} from "@/lib/studio/duplicates";
import { requireStudioMember } from "@/lib/studio/member";

/**
 * HANDOVER-20 Part 1 — the review queue.
 *
 * Only `likely_double_submit` and `review_possible_duplicate` appear here.
 * `returning_client` is deliberately absent: putting a returning customer in
 * a queue called "duplicates" trains whoever works it to dismiss the most
 * valuable submissions the business gets.
 */

type DuplicatesPageProps = {
  searchParams: Promise<{
    kept?: string;
    dismissed?: string;
    error?: string;
    message?: string;
  }>;
};

export default async function DuplicatesPage({
  searchParams,
}: DuplicatesPageProps) {
  const { member } = await requireStudioMember();
  if (!member?.isSuperAdmin) {
    notFound();
  }

  const query = await searchParams;
  const rows = await listDuplicatesForReview();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl text-brand-primary">
          Possible duplicates
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-brand-gray">
          Submissions the system could not classify with confidence. Nothing is
          merged automatically — merging is destructive and someone may
          legitimately want a second opinion two weeks later.
        </p>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-brand-gray">
          Returning clients are <strong>not</strong> listed here. They appear
          in{" "}
          <Link
            href="/studio/customers"
            className="text-brand-primary underline-offset-2 hover:underline"
          >
            Customers
          </Link>{" "}
          as normal, badged &ldquo;Returning&rdquo;.
        </p>
      </div>

      {query.kept ? (
        <p className="rounded-2xl border border-brand-primary/30 bg-brand-lavender/20 px-4 py-3 text-sm text-brand-ink">
          Kept both. The submission is back in the customers list.
        </p>
      ) : null}
      {query.dismissed ? (
        <p className="rounded-2xl border border-brand-primary/30 bg-brand-lavender/20 px-4 py-3 text-sm text-brand-ink">
          Dismissed and archived. Restore it from{" "}
          <Link
            href="/studio/admin/archive"
            className="text-brand-primary underline-offset-2 hover:underline"
          >
            the archive
          </Link>{" "}
          if that was wrong.
        </p>
      ) : null}
      {query.error ? (
        <p className="rounded-2xl border border-brand-error/30 bg-brand-error/5 px-4 py-3 text-sm text-brand-ink">
          {query.message ?? "Something went wrong."}
        </p>
      ) : null}

      {rows.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-brand-lavender bg-white px-4 py-8 text-center text-sm text-brand-gray">
          Nothing to review.
        </p>
      ) : (
        <ul className="space-y-3">
          {rows.map((row) => {
            const reason = isDuplicateReason(row.duplicate_reason ?? "")
              ? (row.duplicate_reason as keyof typeof DUPLICATE_REASON_LABEL)
              : null;
            return (
              <DuplicateReviewRow
                key={row.id}
                leadId={row.id}
                displayRef={leadDisplayRef(row.session_id) ?? row.id}
                fullName={row.full_name}
                email={row.email}
                createdAt={row.created_at}
                submissionNo={row.submission_no}
                planName={row.plan_name}
                funnelComplete={Boolean(row.funnel_complete)}
                paymentStatus={row.payment_status ?? "pending"}
                isTest={Boolean(row.is_test)}
                duplicateOf={row.duplicate_of}
                reasonLabel={reason ? DUPLICATE_REASON_LABEL[reason] : "Unclassified"}
                reasonAction={reason ? DUPLICATE_REASON_ACTION[reason] : ""}
              />
            );
          })}
        </ul>
      )}
    </div>
  );
}
