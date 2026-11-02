import { formatDay, formatSlot } from "@/lib/consultation/format";
import type { Acceptance, AgreementStatus } from "@/lib/practitioners/agreements";

const EVIDENCE_LABEL: Record<string, string> = {
  clickwrap: "Clickwrap",
  countersigned: "Countersigned",
  "founder-implied": "Founder-implied",
  imported: "Imported",
};

/**
 * What a practitioner has signed (Handover 66 §9.1), on their studio record.
 * Super admin only, like the page it sits on. Times are in studio time with
 * the zone named; IP and browser sit behind a disclosure, because they are
 * evidence, not something to have on screen beside a person's photograph.
 */
export default function AgreementPanel({
  practitionerId,
  status,
  acceptances,
  requiredSince,
}: {
  practitionerId: string;
  status: AgreementStatus | null;
  acceptances: Acceptance[];
  /** effective_from of the version they need, for "outstanding since". */
  requiredSince: string | null;
}) {
  const required = status?.required_version ?? null;
  return (
    <div className="space-y-3 rounded-xl border border-brand-lavender/70 bg-white px-4 py-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-sm font-medium text-brand-ink">Practitioner agreement</h3>
        <p className="text-sm">
          {!required ? (
            <span className="text-brand-gray">No version published yet</span>
          ) : status?.up_to_date ? (
            <span className="font-medium text-brand-success-strong">Up to date: {required}</span>
          ) : (
            <span className="font-medium text-brand-error-strong">
              Outstanding: {required}
              {requiredSince ? `, required since ${formatDay(requiredSince)}` : ""}
            </span>
          )}
        </p>
      </div>

      {acceptances.length ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[30rem] text-left text-sm">
            <thead className="text-xs uppercase tracking-[0.06em] text-brand-gray">
              <tr>
                <th className="py-1.5 pr-3 font-medium">Version</th>
                <th className="py-1.5 pr-3 font-medium">Accepted</th>
                <th className="py-1.5 pr-3 font-medium">Evidence</th>
                <th className="py-1.5 font-medium">Document</th>
              </tr>
            </thead>
            <tbody>
              {acceptances.map((a) => (
                <tr key={a.id} className="border-t border-brand-lavender/50 align-top">
                  <td className="py-2 pr-3 text-brand-ink">
                    {a.agreement_version}
                    {required && a.agreement_version !== required ? <span className="text-brand-gray"> (superseded)</span> : null}
                  </td>
                  <td className="py-2 pr-3 text-brand-ink">{formatSlot(a.accepted_at)}</td>
                  <td className="py-2 pr-3">
                    <span className="text-brand-ink">{EVIDENCE_LABEL[a.evidence] ?? a.evidence}</span>
                    {a.note ? <span className="block text-xs text-brand-gray">{a.note}</span> : null}
                    <details className="mt-1">
                      <summary className="cursor-pointer text-xs text-brand-primary">Device details</summary>
                      <p className="mt-1 text-xs text-brand-gray">IP address: {a.accepted_ip ?? "not recorded"}</p>
                      <p className="break-all text-xs text-brand-gray">Browser: {a.user_agent ?? "not recorded"}</p>
                    </details>
                  </td>
                  <td className="py-2">
                    {a.pdf_path ? (
                      <a
                        href={`/api/studio/agreement-pdf?version=${encodeURIComponent(a.agreement_version)}&copy=signed&practitioner=${practitionerId}`}
                        className="text-brand-primary underline"
                      >
                        Download
                      </a>
                    ) : (
                      <span className="text-brand-gray">No document on file</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-sm font-medium text-brand-error-strong">No agreement signed.</p>
      )}
      {acceptances.length ? (
        <p className="text-xs text-brand-gray">Opening a signed copy is logged.</p>
      ) : null}
    </div>
  );
}
