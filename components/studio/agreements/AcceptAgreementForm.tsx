"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { acceptPractitionerAgreement, type AgreementActionResult } from "@/lib/practitioners/agreementActions";

/**
 * The tick box (Handover 66 §5.1): unticked by default, names the version,
 * and the button stays disabled until it is ticked. Only the version name
 * goes to the server; the text and its hash are read there.
 */
export default function AcceptAgreementForm({ version }: { version: string }) {
  const router = useRouter();
  const [agreed, setAgreed] = useState(false);
  const [result, setResult] = useState<AgreementActionResult | null>(null);
  const [pending, start] = useTransition();
  return (
    <div className="space-y-3 border-t border-brand-lavender/60 pt-4">
      <label className="flex items-start gap-3 text-sm leading-relaxed text-brand-ink">
        <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="mt-1 h-5 w-5 shrink-0" />
        <span>I have read and agree to the Practitioner Agreement, version {version}.</span>
      </label>
      <button
        type="button"
        disabled={!agreed || pending}
        onClick={() =>
          start(async () => {
            const res = await acceptPractitionerAgreement({ version, agreed });
            setResult(res);
            if (res.ok) router.push("/studio/practice");
          })
        }
        className="min-h-11 rounded-xl bg-brand-primary px-5 py-2.5 text-sm font-medium text-white disabled:opacity-50"
      >
        {pending ? "Recording..." : "Accept and continue"}
      </button>
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
