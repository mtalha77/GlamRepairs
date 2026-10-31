"use client";

import { useState } from "react";

/**
 * "Pay by card": asks the server for a Safepay checkout and goes there.
 * Sends who is paying (the funnel session, or a signed pay link), never an
 * amount; the server reads that from the assessment.
 */
export default function PayByCardButton(
  props: ({ sessionId: string } | { leadId: string; s: string }) & { label?: string; className?: string },
) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const body = "sessionId" in props ? { sessionId: props.sessionId } : { leadId: props.leadId, s: props.s };

  async function start() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/payments/card/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; url?: string; message?: string };
      if (data.ok && data.url) {
        window.location.assign(data.url);
        return;
      }
      setError(data.message ?? "The card payment could not be started. Please try again.");
    } catch {
      setError("The card payment could not be started. Check your connection and try again.");
    }
    setBusy(false);
  }

  return (
    <div>
      <button
        type="button"
        onClick={start}
        disabled={busy}
        className={
          props.className ??
          "inline-flex min-h-12 w-full items-center justify-center rounded-full bg-brand-primary px-6 text-sm font-semibold text-white transition hover:bg-brand-primary-dark disabled:opacity-60"
        }
      >
        {busy ? "Opening secure payment…" : (props.label ?? "Pay by card")}
      </button>
      {error ? (
        <p role="alert" className="mt-2 text-sm text-brand-error-strong">
          {error}
        </p>
      ) : null}
    </div>
  );
}
