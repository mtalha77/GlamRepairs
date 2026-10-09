import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import ConsultationNoteForm from "@/components/consultation/ConsultationNoteForm";
import { formatSlot } from "@/lib/consultation/format";
import { noteAccess, readNote } from "@/lib/consultation/notes";
import { formatStudioDateTime } from "@/lib/studio/formatDate";
import { requireStudioMember } from "@/lib/studio/member";

/**
 * The consultation note for one appointment — HANDOVER-52 §4.5.
 * Super admin, or the practitioner who took the consultation. Every read
 * of an existing note is logged.
 */

export const dynamic = "force-dynamic";

const OUTCOME_LABEL: Record<string, string> = {
  attended: "Attended",
  client_no_show: "Client did not show",
  cancelled_by_client: "Client cancelled",
  cancelled_by_practitioner: "Practitioner cancelled",
  practitioner_no_show: "Practitioner did not show",
  technical_failure: "Technical failure",
};

function Field({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <div className="py-3">
      <dt className="text-sm text-brand-gray">{label}</dt>
      <dd className="mt-1 whitespace-pre-line text-sm leading-relaxed text-brand-ink">{value}</dd>
    </div>
  );
}

export default async function ConsultationNotePage({ params }: { params: Promise<{ id: string }> }) {
  const { user, member } = await requireStudioMember();
  if (!user || !member) redirect("/studio/login");
  const { id } = await params;
  const access = await noteAccess(member, id);
  if (!access) notFound();

  const note = await readNote(id, user.id);
  const started = access.started;

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <Link href="/studio/consultations" className="text-sm text-brand-primary underline underline-offset-2">
          ← Consultations
        </Link>
        <h1 className="mt-2 font-serif text-2xl text-brand-primary">Consultation note</h1>
        <p className="mt-1 text-sm text-brand-gray">
          {formatSlot(access.appointment.startsAt)} ·{" "}
          {access.canSeeCustomer && access.appointment.leadId ? (
            <Link href={`/studio/customers/${access.appointment.leadId}`} className="text-brand-primary underline underline-offset-2">
              {access.clientLabel}
            </Link>
          ) : (
            access.clientLabel
          )}
          {access.appointment.outcome ? ` · ${OUTCOME_LABEL[access.appointment.outcome] ?? access.appointment.outcome}` : ""}
        </p>
      </div>

      {note ? (
        <section className="rounded-2xl border border-brand-lavender/70 bg-white p-5">
          {note.escalated ? (
            <div className="mb-3 rounded-xl border-2 border-brand-error/50 bg-brand-error/5 p-4 text-sm text-brand-ink">
              <p className="font-medium">Referred to a doctor</p>
              <p className="mt-1 whitespace-pre-line">{note.escalation_reason}</p>
              {note.escalation_advice ? <p className="mt-1 whitespace-pre-line text-brand-gray">Advised: {note.escalation_advice}</p> : null}
            </div>
          ) : null}
          <dl className="divide-y divide-brand-lavender/40">
            <Field label="What they came with" value={note.presenting} />
            <Field label="What you observed" value={note.observed} />
            <Field label="Guidance" value={note.guidance} />
            <Field label="Products discussed" value={note.products_discussed} />
            <Field label="Follow-up" value={note.follow_up} />
          </dl>
          <p className="mt-3 text-xs text-brand-gray">Written {formatStudioDateTime(note.submitted_at)}. Kept as the record of this consultation.</p>
        </section>
      ) : started ? (
        <section className="rounded-2xl border border-brand-lavender/70 bg-white p-5">
          <ConsultationNoteForm appointmentId={id} />
        </section>
      ) : (
        <p className="rounded-xl bg-brand-lavender/25 px-4 py-3 text-sm text-brand-ink">
          The note can be written once the consultation has started.
        </p>
      )}
    </div>
  );
}
