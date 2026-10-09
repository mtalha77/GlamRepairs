import Link from "next/link";
import { notFound } from "next/navigation";

import { InvitePractitionerForm, RevokeInviteButton } from "@/components/studio/applications/ApplicationControls";
import { listApplicationQueue, listInvites, STATUS_LABEL } from "@/lib/practitioners/applications";
import { requireStudioMember } from "@/lib/studio/member";

/**
 * Studio → Applications — HANDOVER-51 §4.2.
 *
 * Super admin only: applicants' contact details and identity documents
 * are behind this page. The check is repeated in every server action.
 */

export const dynamic = "force-dynamic";

const card = "rounded-2xl border border-brand-lavender/70 bg-white p-5";

function inviteState(i: { accepted_at: string | null; revoked_at: string | null; expires_at: string; application_id: string | null }) {
  if (i.revoked_at) return "Revoked";
  if (i.accepted_at) return "Approved";
  if (i.application_id) return "Applied";
  if (new Date(i.expires_at).getTime() < Date.now()) return "Expired";
  return "Waiting";
}

export default async function ApplicationsPage() {
  const { member } = await requireStudioMember();
  if (!member?.isSuperAdmin) notFound();

  const [queue, invites] = await Promise.all([listApplicationQueue(), listInvites()]);
  const open = queue.filter((a) => !["approved", "rejected", "withdrawn"].includes(a.status));
  const closed = queue.filter((a) => ["approved", "rejected", "withdrawn"].includes(a.status));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl text-brand-primary">Applications</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-brand-gray">
          Practitioners who want to join. Applying is by invitation for now: send an invite, they fill in the form
          and upload their documents, and you decide here. Approving creates a profile that stays hidden until they
          add a photograph and a bio.
        </p>
      </div>

      <section className={card} aria-labelledby="invite-heading">
        <h2 id="invite-heading" className="font-serif text-xl text-brand-primary">
          Invite a practitioner
        </h2>
        <p className="mt-1 text-sm text-brand-gray">They get a link to the application form that works for 14 days.</p>
        <div className="mt-4">
          <InvitePractitionerForm />
        </div>
      </section>

      <section className={card} aria-labelledby="queue-heading">
        <h2 id="queue-heading" className="font-serif text-xl text-brand-primary">
          Open applications
        </h2>
        {open.length === 0 ? (
          <p className="mt-2 text-sm text-brand-gray">None waiting.</p>
        ) : (
          <ul className="mt-4 divide-y divide-brand-lavender/50">
            {open.map((a) => (
              <li key={a.id} className="py-3">
                <Link href={`/studio/applications/${a.id}`} className="flex flex-wrap items-baseline justify-between gap-2">
                  <span>
                    <span className="font-medium text-brand-primary underline underline-offset-2">{a.full_name}</span>
                    <span className="text-sm text-brand-gray">
                      {" "}
                      · {a.qualification}
                      {a.years_experience != null ? ` · ${a.years_experience} years` : ""}
                      {a.city ? ` · ${a.city}` : ""}
                    </span>
                  </span>
                  <span className="text-sm text-brand-gray">
                    {STATUS_LABEL[a.status]} · documents {a.verified_count}/{a.document_count} verified · waiting{" "}
                    {a.hours_waiting < 48 ? `${a.hours_waiting} h` : `${Math.round(a.hours_waiting / 24)} days`}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {invites.length ? (
        <section className={card} aria-labelledby="invites-heading">
          <h2 id="invites-heading" className="font-serif text-xl text-brand-primary">
            Invites
          </h2>
          <ul className="mt-3 divide-y divide-brand-lavender/50 text-sm">
            {invites.map((i) => {
              const state = inviteState(i);
              return (
                <li key={i.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                  <span>
                    {i.email} <span className="text-brand-gray">· {state}</span>
                  </span>
                  {state === "Waiting" ? <RevokeInviteButton id={i.id} /> : null}
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      {closed.length ? (
        <section className={card} aria-labelledby="closed-heading">
          <h2 id="closed-heading" className="font-serif text-xl text-brand-primary">
            Decided
          </h2>
          <ul className="mt-3 divide-y divide-brand-lavender/50 text-sm">
            {closed.map((a) => (
              <li key={a.id} className="py-2">
                <Link href={`/studio/applications/${a.id}`} className="text-brand-primary underline underline-offset-2">
                  {a.full_name}
                </Link>{" "}
                <span className="text-brand-gray">· {STATUS_LABEL[a.status]}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
