"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { closeFollowup, markFollowupWhatsApp } from "@/lib/studio/followupActions";

const ghost =
  "inline-flex min-h-10 items-center rounded-lg border border-brand-border-light px-3 text-sm text-brand-ink hover:border-brand-primary disabled:opacity-50";

/** Open WhatsApp with the message written, then record it; or close the check-in. */
export default function FollowupControls({
  id,
  whatsappHref,
  whatsappSent,
}: {
  id: string;
  whatsappHref: string | null;
  whatsappSent: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const run = (fn: () => Promise<{ ok: true } | { ok: false; error: string }>) =>
    start(async () => {
      const res = await fn();
      if (res.ok) router.refresh();
      else setError(res.error);
    });

  return (
    <div className="flex flex-wrap items-center gap-2">
      {whatsappHref ? (
        <a
          href={whatsappHref}
          target="_blank"
          rel="noopener noreferrer"
          className={`${ghost} ${whatsappSent ? "" : "border-brand-primary text-brand-primary"}`}
          onClick={() => {
            if (!whatsappSent) run(() => markFollowupWhatsApp(id));
          }}
        >
          {whatsappSent ? "WhatsApp again" : "Send on WhatsApp"}
        </a>
      ) : (
        <span className="text-xs text-brand-gray">No usable phone number</span>
      )}
      <button type="button" className={ghost} disabled={pending} onClick={() => run(() => closeFollowup({ id, status: "done", notes: "" }))}>
        Done
      </button>
      <button type="button" className={ghost} disabled={pending} onClick={() => run(() => closeFollowup({ id, status: "skipped", notes: "" }))}>
        Skip
      </button>
      {error ? <span className="text-xs text-brand-error-strong">{error}</span> : null}
    </div>
  );
}
