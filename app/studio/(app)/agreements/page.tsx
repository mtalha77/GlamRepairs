import { redirect } from "next/navigation";

import { AgreementDraftEditor, NewDraftToggle, PublishAgreementBox, SendReminderButton } from "@/components/studio/agreements/AgreementAdmin";
import { formatDay } from "@/lib/consultation/format";
import { listAcceptances, listAgreements, listAgreementStatus, unfinishedMarkers } from "@/lib/practitioners/agreements";
import { readinessFor } from "@/lib/practitioners/readiness";
import { requireStudioMember } from "@/lib/studio/member";

export const dynamic = "force-dynamic";

/**
 * Studio → Agreements (Handover 66). Super admin only. Drafts are edited
 * here; publishing freezes one for good (the database enforces it, for
 * everyone, super admins included). Above: who has accepted what, with
 * their signed copies behind a short-lived signed URL.
 */
export default async function AgreementsPage() {
  const { member } = await requireStudioMember();
  if (!member) redirect("/studio/login");
  if (!member.isSuperAdmin) redirect("/studio");

  const [agreements, statusRows, acceptances] = await Promise.all([listAgreements(), listAgreementStatus(), listAcceptances()]);
  const readiness = await readinessFor(statusRows.map((s) => s.practitioner_id));
  const hasCopy = (practitionerId: string, version: string) =>
    acceptances.some((a) => a.practitioner_id === practitionerId && a.agreement_version === version && a.pdf_path);
  // §9.2: read the view as it is; only the order is decided here, outstanding first.
  const outstanding = (s: (typeof statusRows)[number]) => Boolean(s.required_version) && !s.up_to_date;
  const status = [...statusRows].sort((a, b) => Number(outstanding(b)) - Number(outstanding(a)) || a.full_name.localeCompare(b.full_name));
  const liveNotUpToDate = status.filter((s) => readiness.get(s.practitioner_id)?.live && outstanding(s));
  const acceptedCount = (version: string) => acceptances.filter((a) => a.agreement_version === version).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl text-brand-primary">Agreements</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-brand-gray">
          One row per version. A published version can never be edited or withdrawn; a change is the next version, and
          everyone on that track accepts it on their next sign-in. New practitioners accept the version in force the first
          time they sign in. Name versions by track and number, for example aesthetics-v1.
        </p>
      </div>

      <section className="space-y-3 rounded-2xl border border-brand-lavender/70 bg-white p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-serif text-lg text-brand-primary">Who has accepted</h2>
          {/* §9.2: should be zero once the website gate reads acceptances; anything else has got past it. */}
          <p className={`text-sm font-medium ${liveNotUpToDate.length ? "text-brand-error-strong" : "text-brand-success-strong"}`}>
            Live but not up to date: {liveNotUpToDate.length}
            {liveNotUpToDate.length ? ` (${liveNotUpToDate.map((s) => s.full_name).join(", ")})` : ""}
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[42rem] text-left text-sm">
            <thead className="text-xs uppercase tracking-[0.06em] text-brand-gray">
              <tr>
                <th className="py-2 pr-3 font-medium">Practitioner</th>
                <th className="py-2 pr-3 font-medium">Needs</th>
                <th className="py-2 pr-3 font-medium">Accepted</th>
                <th className="py-2 pr-3 font-medium" title="The old application checkbox. Not an acceptance of any agreement. This column will be removed.">
                  Legacy tickbox (to be retired)
                </th>
                <th className="py-2 font-medium">Copy or reminder</th>
              </tr>
            </thead>
            <tbody>
              {status.map((s) => (
                <tr key={s.practitioner_id} className="border-t border-brand-lavender/50">
                  <td className="py-2 pr-3 text-brand-ink">{s.full_name}</td>
                  <td className="py-2 pr-3">{s.required_version ?? <span className="text-brand-gray">nothing published</span>}</td>
                  <td className="py-2 pr-3">
                    {s.up_to_date ? (
                      <span className="text-brand-success-strong">
                        {s.accepted_version}, {s.evidence}
                        {s.accepted_at ? `, ${formatDay(s.accepted_at)}` : ""}
                      </span>
                    ) : s.required_version ? (
                      <span className="text-brand-error-strong">Waiting on them</span>
                    ) : (
                      <span className="text-brand-gray">n/a</span>
                    )}
                  </td>
                  <td className="py-2 pr-3 text-brand-gray">
                    {s.legacy_accepted_terms_at ? formatDay(s.legacy_accepted_terms_at) : "none"}
                  </td>
                  <td className="py-2">
                    {s.up_to_date && s.accepted_version && hasCopy(s.practitioner_id, s.accepted_version) ? (
                      <a
                        href={`/api/studio/agreement-pdf?version=${encodeURIComponent(s.accepted_version)}&copy=signed&practitioner=${s.practitioner_id}`}
                        className="text-brand-primary underline"
                      >
                        Signed PDF
                      </a>
                    ) : outstanding(s) ? (
                      <SendReminderButton practitionerId={s.practitioner_id} />
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {agreements.map((a) => {
        const blockers = a.published ? [] : unfinishedMarkers(a.body);
        const textBox = (
          <div className="mt-3 max-h-[50vh] overflow-y-auto whitespace-pre-wrap rounded-xl border border-brand-lavender/60 bg-brand-surface-alt px-4 py-3 text-sm leading-relaxed text-brand-ink">
            {a.body}
          </div>
        );
        return (
          <section key={a.version} className="space-y-4 rounded-2xl border border-brand-lavender/70 bg-white p-5">
            <header className="flex flex-wrap items-baseline justify-between gap-2">
              <div>
                <h2 className="font-serif text-lg text-brand-primary">
                  {a.version} <span className="text-sm text-brand-gray">· {a.title}</span>
                </h2>
                <p className="text-xs text-brand-gray">
                  {a.published ? `Published ${a.published_at ? formatDay(a.published_at) : ""}` : "Draft, not visible to practitioners"}
                  {" · "}in force from {formatDay(a.effective_from)} · {acceptedCount(a.version)}{" "}
                  {acceptedCount(a.version) === 1 ? "acceptance" : "acceptances"}
                </p>
                <p className="mt-1 break-all font-mono text-[11px] text-brand-gray">SHA-256 {a.body_sha256}</p>
              </div>
              <a href={`/api/studio/agreement-pdf?version=${encodeURIComponent(a.version)}`} className="text-sm text-brand-primary underline">
                PDF of this text
              </a>
            </header>
            {a.published ? (
              <details>
                <summary className="cursor-pointer text-sm text-brand-primary">Read the text</summary>
                {textBox}
              </details>
            ) : (
              <>
                <details>
                  <summary className="cursor-pointer text-sm text-brand-primary">Preview as practitioners will see it</summary>
                  {textBox}
                </details>
                <AgreementDraftEditor
                  initial={{ version: a.version, title: a.title, body: a.body, effectiveFrom: a.effective_from.slice(0, 10) }}
                />
                <PublishAgreementBox version={a.version} blockers={blockers} />
              </>
            )}
          </section>
        );
      })}

      <section className="rounded-2xl border border-dashed border-brand-lavender p-5">
        <NewDraftToggle />
      </section>
    </div>
  );
}
