"use client";

import { useState, useTransition } from "react";

import { disableTestPortalAction, rotateTestPassphraseAction } from "@/lib/testPortal/actions";

/**
 * Studio → Settings → Test portal (Handover 63). The passphrase is shown
 * once, right after it is made, and only its hash is kept. Changing it
 * signs out every open test session.
 */
export default function TestPortalPassphrase({ configured, rotatedAt }: { configured: boolean; rotatedAt: string | null }) {
  const [pending, start] = useTransition();
  const [shown, setShown] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [on, setOn] = useState(configured);

  return (
    <div className="max-w-lg rounded-2xl border border-brand-lavender/70 bg-white p-5 text-sm">
      <p className="text-brand-gray">
        {on
          ? `On. The passphrase was last changed ${rotatedAt ? new Date(rotatedAt).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" }) : "recently"}.`
          : "Off. Nobody can enter /test until a passphrase is set."}
      </p>
      {shown ? (
        <div className="mt-3 rounded-xl bg-brand-purple-soft p-3">
          <p className="text-xs uppercase tracking-[0.08em] text-brand-gray">New passphrase, shown once</p>
          <p className="mt-1 font-mono text-base text-brand-primary">{shown}</p>
        </div>
      ) : null}
      {error ? <p className="mt-2 text-brand-error-strong">{error}</p> : null}
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            start(async () => {
              const result = await rotateTestPassphraseAction();
              if (result.ok) {
                setShown(result.passphrase);
                setOn(true);
                setError(null);
              } else setError(result.error);
            })
          }
          className="rounded-full bg-brand-primary px-4 py-2 font-semibold text-white disabled:opacity-60"
        >
          {on ? "Change passphrase" : "Turn on with a new passphrase"}
        </button>
        {on ? (
          <button
            type="button"
            disabled={pending}
            onClick={() =>
              start(async () => {
                const result = await disableTestPortalAction();
                if (result.ok) {
                  setOn(false);
                  setShown(null);
                } else setError(result.error ?? "Could not turn it off.");
              })
            }
            className="rounded-full border border-brand-lavender px-4 py-2 font-semibold text-brand-primary disabled:opacity-60"
          >
            Turn off
          </button>
        ) : null}
      </div>
    </div>
  );
}
