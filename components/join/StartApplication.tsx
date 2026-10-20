"use client";

import { useState } from "react";

import { WhatsAppHelpLine } from "@/components/join/PractitionerWhatsApp";
import { formInputClassName, formLabelClassName } from "@/components/ui/fieldStyles";

/**
 * Asking for an application link — the redesign's "Apply in 5 minutes".
 * The link arrives by email; it proves the address and is how the
 * applicant comes back to a half-finished application.
 */
export default function StartApplication({ intro }: { intro?: string }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);

  async function send() {
    setBusy(true);
    setError(null);
    const res = await fetch("/api/join/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email }),
    }).catch(() => null);
    const data = (await res?.json().catch(() => ({}))) as { ok?: boolean; error?: string } | undefined;
    setBusy(false);
    if (!data?.ok) return setError(data?.error ?? "Something went wrong. Please try again.");
    setSentTo(email.trim());
  }

  if (sentTo) {
    return (
      <div role="status" className="rounded-2xl bg-brand-purple-soft p-6">
        <h2 className="font-serif text-2xl italic text-brand-primary">Check your inbox</h2>
        <p className="mt-2 text-sm leading-relaxed text-brand-ink">
          We have sent a link to <strong className="font-medium">{sentTo}</strong>. Open it to start. It is saved after every step,
          so the same link brings you back to where you left off. Nothing there? Check your spam folder.
        </p>
      </div>
    );
  }

  return (
    <form
      className="space-y-4 rounded-2xl border border-brand-lavender/70 bg-white p-5 sm:p-6"
      onSubmit={(e) => {
        e.preventDefault();
        void send();
      }}
    >
      {intro ? <p className="text-sm leading-relaxed text-brand-gray">{intro}</p> : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className={formLabelClassName}>Your name</span>
          <input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" maxLength={120} className={formInputClassName} />
        </label>
        <label className="block">
          <span className={formLabelClassName}>Email</span>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required className={formInputClassName} />
        </label>
      </div>
      {error ? (
        <p role="alert" className="text-sm text-brand-error-strong">
          {error}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={busy || !email.trim()}
        className="inline-flex min-h-12 items-center justify-center rounded-xl bg-brand-primary px-6 text-sm font-semibold text-white disabled:opacity-50"
      >
        {busy ? "Sending…" : "Email me my application link"}
      </button>
      <WhatsAppHelpLine />
    </form>
  );
}
