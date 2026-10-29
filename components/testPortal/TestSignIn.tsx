"use client";

import { useActionState } from "react";

import { SAMPLE_CONTACT } from "@/components/testPortal/sampleData";
import { enterTestPortal } from "@/lib/testPortal/actions";

/** Step 1: the one seeded demo account. No sign-up, no email, no reset. */
export default function TestSignIn() {
  const [state, action, pending] = useActionState(enterTestPortal, { error: null as string | null });
  return (
    <form action={action} className="mt-6 space-y-3 rounded-2xl border border-brand-lavender/70 bg-white p-5">
      <div>
        <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-brand-gray/80">Demo account</p>
        <p className="mt-1 text-sm text-brand-ink">{SAMPLE_CONTACT.email}</p>
      </div>
      <label className="block">
        <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-brand-gray/80">Passphrase</span>
        <input
          name="passphrase"
          type="password"
          autoComplete="off"
          required
          className="mt-1 w-full rounded-xl border border-brand-lavender px-3 py-2.5 text-sm outline-none focus:border-brand-accent"
        />
      </label>
      {state.error ? <p className="text-sm text-brand-error-strong">{state.error}</p> : null}
      <button disabled={pending} className="w-full rounded-full bg-brand-primary px-5 py-3 text-sm font-semibold text-white disabled:opacity-60">
        {pending ? "Checking…" : "Enter test mode"}
      </button>
    </form>
  );
}
