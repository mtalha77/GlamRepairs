"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { formInputClassName } from "@/components/ui/fieldStyles";
import { approvePayoutRun, cancelPayout, markPayoutPaid, type PayoutActionResult } from "@/lib/practitioners/payoutActions";

const primary = "min-h-11 rounded-xl bg-brand-primary px-4 py-2.5 text-sm text-white disabled:opacity-50";
const ghost = "min-h-10 rounded-lg border border-brand-border-light px-3 py-1.5 text-sm text-brand-ink hover:border-brand-primary disabled:opacity-50";

function useAction() {
  const router = useRouter();
  const [result, setResult] = useState<PayoutActionResult | null>(null);
  const [pending, start] = useTransition();
  const run = (fn: () => Promise<PayoutActionResult>) =>
    start(async () => {
      const res = await fn();
      setResult(res);
      if (res.ok) router.refresh();
    });
  return { result, pending, run };
}

function Feedback({ result }: { result: PayoutActionResult | null }) {
  if (!result) return null;
  return (
    <p role={result.ok ? "status" : "alert"} className={`text-sm ${result.ok ? "text-brand-success-strong" : "text-brand-error-strong"}`}>
      {result.ok ? result.message : result.error}
    </p>
  );
}

export function ApproveRunButton({ month, label, total }: { month: string; label: string; total: string }) {
  const { result, pending, run } = useAction();
  return (
    <div className="space-y-2">
      <button
        type="button"
        className={primary}
        disabled={pending}
        onClick={() => {
          if (!window.confirm(`Approve ${total} in payouts for ${label}?`)) return;
          run(() => approvePayoutRun(month));
        }}
      >
        {pending ? "Approving…" : "Approve run"}
      </button>
      <Feedback result={result} />
    </div>
  );
}

export function MarkPaidForm({ id }: { id: string }) {
  const [reference, setReference] = useState("");
  const { result, pending, run } = useAction();
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <input
          value={reference}
          onChange={(e) => setReference(e.target.value)}
          placeholder="Transfer reference"
          maxLength={120}
          className={`${formInputClassName} min-h-10 w-full sm:w-56`}
          aria-label="Transfer reference"
        />
        <button type="button" className={ghost} disabled={pending || reference.trim().length < 3} onClick={() => run(() => markPayoutPaid({ id, reference }))}>
          Mark paid
        </button>
        <button
          type="button"
          className="min-h-10 px-2 text-sm text-brand-gray underline"
          disabled={pending}
          onClick={() => {
            if (!window.confirm("Cancel this payout? Its consultations go back to To approve.")) return;
            run(() => cancelPayout(id));
          }}
        >
          Cancel
        </button>
      </div>
      <Feedback result={result} />
    </div>
  );
}
