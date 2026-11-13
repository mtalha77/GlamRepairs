"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { formInputClassName } from "@/components/ui/fieldStyles";
import { holdFeeAsCredit, payWithCredit, type CreditResult } from "@/lib/credits/actions";

type Row = { id: string; label: string; amount: string; when: string; note: string | null };

/**
 * A client's credit on their record (13 November 2026). No refunds: where a
 * fee would have been refunded it is held here, and it pays a later
 * assessment in the same currency.
 */
export default function CreditPanel({
  leadId,
  email,
  currency,
  finalPrice,
  balances,
  rows,
  reasons,
  canHold,
  canPay,
  awaitingPayment,
}: {
  leadId: string;
  email: string | null;
  currency: string | null;
  finalPrice: number | null;
  balances: { label: string; currency: string; balance: number }[];
  rows: Row[];
  reasons: Record<string, string>;
  canHold: boolean;
  canPay: boolean;
  awaitingPayment: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [result, setResult] = useState<CreditResult | null>(null);
  const [reason, setReason] = useState("");
  const [amount, setAmount] = useState(finalPrice ? String(finalPrice) : "");
  const [note, setNote] = useState("");
  const run = (fn: () => Promise<CreditResult>) =>
    start(async () => {
      const r = await fn();
      setResult(r);
      if (r.ok) router.refresh();
    });

  const sameCurrency = balances.find((b) => b.currency === currency)?.balance ?? 0;
  const canCover = awaitingPayment && currency && finalPrice != null && finalPrice > 0 && sameCurrency >= finalPrice;

  return (
    <div className="space-y-4 text-sm">
      {!email ? (
        <p className="text-brand-gray">No email address on this record, so no credit can be held.</p>
      ) : balances.length ? (
        <p className="text-brand-ink">
          Balance: <strong className="font-medium">{balances.map((b) => b.label).join(", ")}</strong>
        </p>
      ) : (
        <p className="text-brand-gray">No credit held for {email}.</p>
      )}

      {canPay && canCover ? (
        <button
          type="button"
          disabled={pending}
          onClick={() => run(() => payWithCredit(leadId))}
          className="min-h-11 w-full rounded-xl bg-brand-primary px-4 py-2.5 text-white disabled:opacity-50"
        >
          Pay this assessment from credit ({currency} {finalPrice})
        </button>
      ) : null}

      {canHold && email ? (
        <div className="space-y-2 border-t border-brand-lavender/60 pt-4">
          <p className="font-medium text-brand-ink">Hold a fee as credit</p>
          <select value={reason} onChange={(e) => setReason(e.target.value)} className={formInputClassName}>
            <option value="" disabled>
              Why
            </option>
            {Object.entries(reasons).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
          <label className="flex flex-col gap-1">
            <span className="text-brand-gray">Amount ({currency ?? "currency not set"})</span>
            <input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} className={formInputClassName} />
          </label>
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note (optional)" className={formInputClassName} />
          <button
            type="button"
            disabled={pending || !reason || !currency}
            onClick={() => run(() => holdFeeAsCredit({ leadId, reason, amount: Number(amount), note }))}
            className="min-h-10 rounded-lg border border-brand-border-light px-3 py-1.5 text-brand-ink hover:border-brand-primary disabled:opacity-50"
          >
            Hold as credit
          </button>
        </div>
      ) : null}

      {result ? (
        <p
          role={result.ok ? "status" : "alert"}
          className={`rounded-xl px-3 py-2 ${result.ok ? "bg-brand-success/15 text-brand-success-strong" : "bg-brand-error/10 text-brand-error-strong"}`}
        >
          {result.ok ? result.message : result.error}
        </p>
      ) : null}

      {rows.length ? (
        <ul className="space-y-1.5 border-t border-brand-lavender/60 pt-3 text-xs">
          {rows.map((r) => (
            <li key={r.id} className="flex justify-between gap-3">
              <span className="text-brand-gray">
                {r.when}, {r.label}
                {r.note ? `: ${r.note}` : ""}
              </span>
              <span className="shrink-0 font-medium text-brand-ink">{r.amount}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
