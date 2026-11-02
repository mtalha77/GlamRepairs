import Link from "next/link";
import { redirect } from "next/navigation";

import AcceptAgreementForm from "@/components/studio/agreements/AcceptAgreementForm";
import { formatDay } from "@/lib/consultation/format";
import { agreementStatusFor, getAgreement, listAcceptances } from "@/lib/practitioners/agreements";
import { ownPractitionerProfile } from "@/lib/practitioners/roster";
import { requireStudioMember } from "@/lib/studio/member";

export const dynamic = "force-dynamic";

/**
 * Studio → Agreement (Handover 66 §5.1). The full text, on the page, the
 * exact text that is stored and hashed. Not a link, not a summary. The tick
 * box names the version, and the button stays off until it is ticked.
 */
export default async function AgreementPage() {
  const { user, member } = await requireStudioMember();
  if (!user || !member) redirect("/studio/login");
  const profile = await ownPractitionerProfile(user.id);
  if (!profile) redirect("/studio");

  const status = await agreementStatusFor(profile.id);
  const version = status?.required_version ?? null;
  const agreement = version ? await getAgreement(version) : null;
  const history = await listAcceptances(profile.id);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="font-serif text-2xl text-brand-primary">Practitioner agreement</h1>
        {!agreement ? (
          <p className="mt-2 text-sm leading-relaxed text-brand-gray">There is no agreement for you to accept at the moment.</p>
        ) : status?.up_to_date ? (
          <p className="mt-2 text-sm leading-relaxed text-brand-gray">
            You accepted version <strong className="text-brand-ink">{agreement.version}</strong>
            {status.accepted_at ? ` on ${formatDay(status.accepted_at)}` : ""}. The text is below for reference.
          </p>
        ) : (
          <p className="mt-2 text-sm leading-relaxed text-brand-gray">
            Please read the agreement below and accept it to continue to the studio. Anything already booked carries on as
            normal.
          </p>
        )}
      </div>

      {agreement ? (
        <section className="space-y-4 rounded-2xl border border-brand-lavender/70 bg-white p-5">
          <header className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="font-serif text-lg text-brand-primary">{agreement.title}</h2>
            <p className="text-xs text-brand-gray">
              Version {agreement.version} · in force from {formatDay(agreement.effective_from)}
            </p>
          </header>
          <div
            tabIndex={0}
            aria-label={`${agreement.title}, full text`}
            className="max-h-[60vh] overflow-y-auto whitespace-pre-wrap rounded-xl border border-brand-lavender/60 bg-brand-surface-alt px-4 py-3 text-sm leading-relaxed text-brand-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent/40"
          >
            {agreement.body}
          </div>
          <p className="text-xs text-brand-gray">
            <a href={`/api/studio/agreement-pdf?version=${encodeURIComponent(agreement.version)}`} className="text-brand-primary underline">
              Download this text as a PDF
            </a>
            . It is the same text, word for word.
          </p>
          {status?.up_to_date ? null : <AcceptAgreementForm version={agreement.version} />}
        </section>
      ) : null}

      {history.length ? (
        <section className="rounded-2xl border border-brand-lavender/70 bg-white p-5">
          <h2 className="font-serif text-lg text-brand-primary">What you have accepted</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {history.map((a) => (
              <li key={a.id} className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="text-brand-ink">
                  {a.agreement_version} <span className="text-brand-gray">· {formatDay(a.accepted_at)}</span>
                </span>
                {a.pdf_path ? (
                  <a
                    href={`/api/studio/agreement-pdf?version=${encodeURIComponent(a.agreement_version)}&copy=signed`}
                    className="text-brand-primary underline"
                  >
                    Your signed copy
                  </a>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {status?.up_to_date || !agreement ? (
        <p className="text-sm">
          <Link href="/studio/practice" className="text-brand-primary underline">
            Back to My practice
          </Link>
        </p>
      ) : null}
    </div>
  );
}
