"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { payPendingWithCredit, type ClientCreditResult } from "@/lib/credits/clientActions";

export default function PayWithCredit({ label }: { label: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [result, setResult] = useState<ClientCreditResult | null>(null);
  return (
    <div className="mt-4 space-y-3">
      {!result?.ok ? (
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            start(async () => {
              const r = await payPendingWithCredit();
              setResult(r);
              if (r.ok) router.refresh();
            })
          }
          className="inline-flex min-h-11 items-center rounded-full bg-brand-primary px-5 text-sm font-medium text-white disabled:opacity-50"
        >
          {pending ? "Paying…" : label}
        </button>
      ) : null}
      {result ? (
        <p
          role={result.ok ? "status" : "alert"}
          className={`rounded-xl px-4 py-2.5 text-sm ${result.ok ? "bg-brand-success/15 text-brand-success-strong" : "bg-brand-error/10 text-brand-error-strong"}`}
        >
          {result.ok ? result.message : result.error}
        </p>
      ) : null}
    </div>
  );
}
