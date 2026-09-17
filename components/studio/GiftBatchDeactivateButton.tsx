"use client";

import { useFormStatus } from "react-dom";

import { deactivateGiftBatchAction } from "@/lib/studio/actions";

/**
 * Kill a whole batch — HOTFIX-29 §3.3.
 *
 * Already-redeemed codes are left alone by the database function, so this
 * cannot retroactively take an assessment away from someone who has already
 * claimed it. That is the reason it is safe to offer as a one-click action
 * rather than behind a confirmation dialog: the worst case is that unused
 * codes from a finished campaign stop working, which is the intent.
 */
function Button() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg border border-brand-error/40 px-2.5 py-1 text-xs text-brand-error-strong transition-opacity hover:bg-brand-error/5 disabled:opacity-50"
    >
      {pending ? "…" : "Deactivate batch"}
    </button>
  );
}

export default function GiftBatchDeactivateButton({
  batchLabel,
}: {
  batchLabel: string;
}) {
  return (
    <form action={deactivateGiftBatchAction} className="inline">
      <input type="hidden" name="batchLabel" value={batchLabel} />
      <Button />
    </form>
  );
}
