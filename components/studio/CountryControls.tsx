"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { setCountryPrice, setCountryResearch, setCountrySwitch } from "@/lib/studio/countryActions";
import { RESEARCH_STATUSES, RESEARCH_STATUS_LABEL, type ResearchStatus } from "@/lib/studio/countryStatus";

const ghost =
  "inline-flex min-h-10 items-center rounded-lg border border-brand-border-light px-3 text-sm text-brand-ink hover:border-brand-primary disabled:opacity-50";
const input = "min-h-10 rounded-lg border border-brand-border-light px-3 text-sm text-brand-ink";

type Props = {
  code: string;
  clientsEnabled: boolean;
  practitionersEnabled: boolean;
  researchStatus: ResearchStatus;
  legalNote: string | null;
  price: { display: string; symbol: string; minorUnits: number; placeholder: boolean } | null;
  currency: string;
};

/** Switches, research status with the lawyer's note, and the price, for one country. */
export default function CountryControls(p: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<ResearchStatus>(p.researchStatus);
  const [note, setNote] = useState(p.legalNote ?? "");
  const [amount, setAmount] = useState(p.price && !p.price.placeholder ? p.price.display : "");

  const run = (fn: () => Promise<{ ok: true } | { ok: false; error: string }>) =>
    start(async () => {
      setError(null);
      const res = await fn();
      if (res.ok) router.refresh();
      else setError(res.error);
    });

  const statusChanged = status !== p.researchStatus || note.trim() !== (p.legalNote ?? "").trim();
  const needsNote = status === "legal_advice" || status === "cleared";

  return (
    <div className="mt-3 space-y-3">
      <div className="flex flex-wrap gap-2">
        {(["practitioners", "clients"] as const).map((which) => {
          const on = which === "clients" ? p.clientsEnabled : p.practitionersEnabled;
          return (
            <button
              key={which}
              type="button"
              disabled={pending}
              className={`${ghost} ${on ? "border-brand-success bg-brand-success/10 text-brand-success-strong" : ""}`}
              onClick={() => run(() => setCountrySwitch({ code: p.code, which, on: !on }))}
            >
              {which === "clients" ? "Clients" : "Practitioners"}: {on ? "on" : "off"}
            </button>
          );
        })}
      </div>

      <div className="space-y-2">
        <label className="block text-xs text-brand-gray">
          Research status
          <select
            className={`${input} mt-1 block w-full sm:w-64`}
            value={status}
            onChange={(e) => setStatus(e.target.value as ResearchStatus)}
          >
            {RESEARCH_STATUSES.map((s) => (
              <option key={s} value={s}>
                {RESEARCH_STATUS_LABEL[s]}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-xs text-brand-gray">
          What the lawyer said{needsNote ? " (required)" : ""}
          <textarea
            className={`${input} mt-1 block min-h-20 w-full py-2`}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Who advised, when, and what they said we may and may not do."
          />
        </label>
        {statusChanged ? (
          <button
            type="button"
            disabled={pending}
            className={`${ghost} border-brand-primary text-brand-primary`}
            onClick={() => run(() => setCountryResearch({ code: p.code, status, legalNote: note }))}
          >
            Save status
          </button>
        ) : null}
      </div>

      <div className="flex flex-wrap items-end gap-2">
        <label className="block text-xs text-brand-gray">
          Transform price ({p.currency}
          {p.price ? `, ${p.price.minorUnits} decimal places` : ""})
          <input
            className={`${input} mt-1 block w-36`}
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder={p.price?.placeholder ? `${p.price.display} (placeholder)` : ""}
          />
        </label>
        <button
          type="button"
          disabled={pending || !amount.trim()}
          className={ghost}
          onClick={() => run(() => setCountryPrice({ code: p.code, amount }))}
        >
          Set price
        </button>
      </div>

      {error ? <p className="text-sm text-brand-error-strong">{error}</p> : null}
    </div>
  );
}
