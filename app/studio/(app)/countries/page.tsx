import { notFound } from "next/navigation";

import CountryControls from "@/components/studio/CountryControls";
import { listCountries, type CountryRow } from "@/lib/studio/countries";
import { RESEARCH_STATUS_LABEL } from "@/lib/studio/countryStatus";
import { formatStudioDateTime } from "@/lib/studio/formatDate";
import { requireStudioMember } from "@/lib/studio/member";

/**
 * Studio → Countries. HANDOVER-58 Part 12.4: one screen per the
 * admin_country_panel view. Switch clients and practitioners on separately,
 * record the lawyer's advice, set the price, and see in plain English why a
 * switch is refused. Super admins only.
 */

export const dynamic = "force-dynamic";

const card = "rounded-2xl border border-brand-lavender/70 bg-white p-5";

function Country({ c }: { c: CountryRow }) {
  return (
    <li className={card}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-serif text-lg text-brand-primary">
          {c.name} <span className="text-sm text-brand-gray">{c.code}</span>
        </h2>
        <p className="text-xs text-brand-gray">
          {RESEARCH_STATUS_LABEL[c.researchStatus]}
          {c.gdpr ? " · GDPR" : ""} · {c.indexStandard.replace("_", " ")}
        </p>
      </div>
      <p className="mt-1 text-sm text-brand-gray">
        Price:{" "}
        {c.price ? (
          <>
            {c.price.symbol}
            {c.price.display}
            {c.price.placeholder ? <span className="text-brand-error-strong"> (placeholder, not a real price)</span> : null}
          </>
        ) : (
          "none"
        )}{" "}
        · {c.livePractitioners} live practitioners · {c.clients} clients · {c.cityPages} city pages
      </p>
      {c.regulatorNote || c.dataLaw ? (
        <details className="mt-2 text-sm text-brand-gray">
          <summary className="cursor-pointer text-brand-ink">Desk research (not legal advice)</summary>
          {c.dataLaw ? <p className="mt-1">Data law: {c.dataLaw}</p> : null}
          {c.regulatorNote ? <p className="mt-1">Regulation: {c.regulatorNote}</p> : null}
        </details>
      ) : null}
      {c.statusChangedAt ? (
        <p className="mt-1 text-xs text-brand-gray">Status last changed {formatStudioDateTime(c.statusChangedAt)}</p>
      ) : null}
      <CountryControls
        code={c.code}
        clientsEnabled={c.clientsEnabled}
        practitionersEnabled={c.practitionersEnabled}
        researchStatus={c.researchStatus}
        legalNote={c.legalNote}
        price={c.price}
        currency={c.currency}
      />
    </li>
  );
}

export default async function CountriesPage() {
  const { member } = await requireStudioMember();
  if (!member?.isSuperAdmin) notFound();
  const countries = await listCountries();
  const live = countries.filter((c) => c.clientsEnabled || c.practitionersEnabled);
  const rest = countries.filter((c) => !c.clientsEnabled && !c.practitionersEnabled);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl text-brand-primary">Countries</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-brand-gray">
          A country can be switched on only after a lawyer has looked at it: set the status to &ldquo;Legal advice taken&rdquo; or
          &ldquo;Cleared&rdquo; and write down what they said. It can open to clients only once its price is real. Switch practitioners on
          before clients: the client&apos;s country is the one whose rules apply.
        </p>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-brand-gray">
          Checkout still charges from the existing price list. Prices set here control these switches
          and will reach checkout once country pricing is connected.
        </p>
      </div>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-brand-gray">Live</h2>
        <ul className="space-y-4">
          {live.map((c) => (
            <Country key={c.code} c={c} />
          ))}
        </ul>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-brand-gray">Not live, by diaspora priority</h2>
        <ul className="space-y-4">
          {rest.map((c) => (
            <Country key={c.code} c={c} />
          ))}
        </ul>
      </section>
    </div>
  );
}
