"use client";

import Link from "next/link";
import { useState, useTransition } from "react";

import { useFunnelStore } from "@/lib/funnel/useFunnelStore";
import { markTestLeadPaid } from "@/lib/testPortal/actions";

/**
 * Step 5 of the test portal (Handover 63): under the real bank block, a
 * button that marks the demo paid without money moving. Rendered only when
 * the server has verified a test session; the action checks again.
 */
export default function TestMarkPaid() {
  const sessionId = useFunnelStore((s) => s.sessionId);
  const [pending, start] = useTransition();
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  return (
    <div className="mt-4 rounded-2xl border-2 border-dashed border-brand-accent bg-brand-cream-light p-4 text-left">
      <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-brand-ink">Test mode</p>
      <p className="mt-1 text-sm text-brand-gray">A real client pays by bank transfer and sends the screenshot. Here, one tap stands in for that.</p>
      {result?.ok ? (
        <div className="mt-3 text-sm">
          <p className="font-semibold text-brand-success-strong">{result.message}</p>
          <Link href="/test/report" className="mt-2 inline-block font-semibold text-brand-primary underline">
            Step 6: see the report →
          </Link>
        </div>
      ) : (
        <>
          <button
            type="button"
            disabled={pending || !sessionId}
            onClick={() => start(async () => setResult(await markTestLeadPaid(sessionId)))}
            className="mt-3 w-full rounded-full bg-brand-primary px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
          >
            {pending ? "Marking…" : "Mark as paid (no money moves)"}
          </button>
          {result && !result.ok ? <p className="mt-2 text-sm text-brand-error-strong">{result.message}</p> : null}
        </>
      )}
    </div>
  );
}
