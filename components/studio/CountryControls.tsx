"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { setCountryPaymentMethod, setCountryPrice, setCountryResearch, setCountrySwitch } from "@/lib/studio/countryActions";
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
  paymentMethod: string | null;
};

const PAYMENT_LABEL: Record<string, string> = {
  bank_transfer_pk: "Bank transfer to the Pakistan account",
  merchant_of_record: "Merchant of record (Paddle, Lemon Squeezy)",
  wise: "Wise collection account",
  payoneer: "Payoneer collection account",
};

/** What the typed price will look like to a client, so a miscounted zero shows before it ships. */
function preview(amount: string, currency: string, minorUnits: number): string | null {
  const n = Number(amount.trim().replace(/,/g, ""));
  if (!amount.trim() || !Number.isFinite(n) || n <= 0) return null;
  try {
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency,
      minimumFractionDigits: Number.isInteger(n) ? 0 : minorUnits,
      maximumFractionDigits: minorUnits,
    }).format(n);
  } catch {
    return null;
  }
}

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
        {preview(amount, p.currency, p.price?.minorUnits ?? 2) ? (
          <span className="pb-2.5 text-sm text-brand-gray">
            Clients will see <span className="font-medium text-brand-ink">{preview(amount, p.currency, p.price?.minorUnits ?? 2)}</span>
          </span>
        ) : null}
      </div>

      <label className="block text-xs text-brand-gray">
        How clients here pay (required before clients can be switched on)
        <select
          className={`${input} mt-1 block w-full sm:w-80`}
          value={p.paymentMethod ?? ""}
          disabled={pending}
          onChange={(e) => run(() => setCountryPaymentMethod({ code: p.code, method: e.target.value }))}
        >
          <option value="">Not set</option>
          {Object.entries(PAYMENT_LABEL).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>

      {error ? <p className="text-sm text-brand-error-strong">{error}</p> : null}
    </div>
  );
}
