import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { SequenceToggle, StepEditor } from "@/components/studio/outreach/OutreachAdmin";
import { blanksIn, loadOutreachSequence } from "@/lib/outreach/studio";
import { requireStudioMember } from "@/lib/studio/member";

export const dynamic = "force-dynamic";

export default async function OutreachSequencePage({ params }: { params: Promise<{ code: string }> }) {
  const { member } = await requireStudioMember();
  if (!member) redirect("/studio/login");
  if (!member.isSuperAdmin) redirect("/studio");
  const { code } = await params;
  const data = await loadOutreachSequence(code);
  if (!data) notFound();
  const { sequence, steps } = data;
  const blanks = [...new Set(steps.flatMap((s) => blanksIn(`${s.subject}\n${s.body_md}`)))];

  return (
    <div className="space-y-6">
      <div>
        <Link href="/studio/outreach" className="text-sm text-brand-gray hover:text-brand-primary">
          Outreach
        </Link>
        <h1 className="font-serif text-2xl text-brand-primary">{sequence.name}</h1>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-brand-gray">
          Sent as {sequence.audience === "brand" ? "Talha, Glam Repairs" : "Ayma Arif, Glam Repairs"}. Day is counted from enrolment, and
          steps are never less than 20 hours apart. Every email gets the business address, why they are receiving it and an
          unsubscribe link added below the body. Anything in [square brackets] that is not a link is a blank, and the sequence
          cannot be switched on while one remains.
        </p>
      </div>
      <section className="space-y-3 rounded-2xl border border-brand-lavender/70 bg-white p-5">
        <p className={`text-sm font-medium ${sequence.active ? "text-brand-success-strong" : "text-brand-gray"}`}>{sequence.active ? "Switched on" : "Switched off"}</p>
        <SequenceToggle code={sequence.code} active={sequence.active} blanks={blanks} />
      </section>
      {steps.map((st) => (
        <section key={st.id} className="space-y-3 rounded-2xl border border-brand-lavender/70 bg-white p-5">
          <h2 className="font-serif text-lg text-brand-primary">Step {st.step_no}</h2>
          <StepEditor step={st} />
        </section>
      ))}
    </div>
  );
}
