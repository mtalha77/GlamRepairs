"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { formInputClassName, formLabelClassName } from "@/components/ui/fieldStyles";
import { submitConsultationNote, type NoteActionResult } from "@/lib/consultation/noteActions";

/**
 * The consultation note — HANDOVER-52 §4.5.
 *
 * Plain-language labels on purpose: "presenting complaint" and "objective
 * findings" are the clinical register the business has decided not to
 * adopt. The doctor-referral box is last and always visible, never behind
 * a toggle.
 */

const MIN = { presenting: 20, observed: 20, guidance: 40 } as const;

export default function ConsultationNoteForm({ appointmentId }: { appointmentId: string }) {
  const router = useRouter();
  const [f, setF] = useState({
    presenting: "",
    observed: "",
    guidance: "",
    productsDiscussed: "",
    followUp: "",
    escalationReason: "",
    escalationAdvice: "",
  });
  const [escalated, setEscalated] = useState(false);
  const [result, setResult] = useState<NoteActionResult | null>(null);
  const [pending, start] = useTransition();

  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLTextAreaElement>) => setF((v) => ({ ...v, [k]: e.target.value }));

  const area = (k: keyof typeof f, label: string, hint: string, rows: number, min?: number) => {
    const len = f[k].trim().length;
    return (
      <label className="block">
        <span className={formLabelClassName}>{label}</span>
        <span className="-mt-1 mb-2 block text-xs text-brand-gray">{hint}</span>
        <textarea value={f[k]} onChange={set(k)} rows={rows} maxLength={4000} className={formInputClassName} />
        {min ? (
          <span className={`mt-1 block text-xs ${len >= min ? "text-brand-success-strong" : "text-brand-gray"}`}>
            {len >= min ? "Enough detail" : `At least ${min} characters (${len} so far)`}
          </span>
        ) : null}
      </label>
    );
  };

  const submit = () =>
    start(async () => {
      const res = await submitConsultationNote({ appointmentId, escalated, ...f });
      setResult(res);
      if (res.ok) router.refresh();
    });

  return (
    <div className="space-y-5">
      {area("presenting", "What they came with", "What the client described, in their words.", 3, MIN.presenting)}
      {area("observed", "What you observed", "What you could see in the photographs and on the call.", 3, MIN.observed)}
      {area("guidance", "Your guidance", "What you advised them to do, and why.", 4, MIN.guidance)}
      {area("productsDiscussed", "Products discussed (optional)", "Any products or ingredients you talked about.", 2)}
      {area("followUp", "Follow-up (optional)", "Anything to check at a later consultation.", 2)}

      <div className={`rounded-2xl border-2 p-4 ${escalated ? "border-brand-error/50 bg-brand-error/5" : "border-brand-lavender/60"}`}>
        <label className="flex min-h-12 items-start gap-3 text-sm text-brand-ink">
          <input type="checkbox" checked={escalated} onChange={(e) => setEscalated(e.target.checked)} className="mt-1 h-5 w-5 shrink-0" />
          <span>
            <span className="font-medium">I saw something that should be looked at by a doctor.</span>
            <span className="mt-0.5 block text-brand-gray">
              For example a changing mole, an uneven or bleeding mark, or sudden widespread change. Saying so is part of
              the job: we do not diagnose, so this is how a concern reaches someone who can.
            </span>
          </span>
        </label>
        {escalated ? (
          <div className="mt-4 space-y-4">
            {area("escalationReason", "What you saw", "Describe what concerned you.", 3, 11)}
            {area("escalationAdvice", "What you advised them to do", "For example: see a dermatologist within two weeks.", 2)}
          </div>
        ) : null}
      </div>

      {result ? (
        <p
          role={result.ok ? "status" : "alert"}
          className={`rounded-xl px-4 py-2.5 text-sm ${result.ok ? "bg-brand-success/15 text-brand-success-strong" : "bg-brand-error/10 text-brand-error-strong"}`}
        >
          {result.ok ? result.message : result.error}
        </p>
      ) : null}

      <p className="text-xs text-brand-gray">A note cannot be changed once it is saved. It is kept as the record of this consultation.</p>
      <button type="button" onClick={submit} disabled={pending} className="min-h-12 w-full rounded-full bg-brand-primary px-6 text-sm text-white disabled:opacity-60 sm:w-auto">
        {pending ? "Saving…" : "Save note"}
      </button>
    </div>
  );
}
