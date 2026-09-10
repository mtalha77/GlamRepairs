/**
 * HANDOVER-18 §2 — the client speaking in their own words.
 *
 * Rendered near the top of the case, above the photographs and the
 * questionnaire, because it is the most likely place a safety flag appears:
 * "it burns when I use anything", "I was using a fairness cream until last
 * month", "it's spreading". None of those appear in a structured answer and
 * none are visible in a photo. Below the answer list it would be read last,
 * which for that content is the same as not being read.
 *
 * ⚠️ The text passed here must already be redacted for anyone who is not a
 * super admin. `leads.client_notes` is raw; `leads_for_practitioner` serves
 * the redacted version. This component does not redact — it renders what it
 * is given.
 */
export default function ClientNotesCard({
  notes,
  redacted,
}: {
  notes: string | null;
  /** True when contact details in this text have been removed. */
  redacted: boolean;
}) {
  if (!notes?.trim()) return null;

  return (
    <section className="rounded-2xl border border-brand-accent/40 bg-brand-accent/5 p-5">
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-serif text-xl text-brand-primary">
          What the client told us
        </h2>
        <span className="text-xs text-brand-gray">
          {redacted
            ? "Contact details removed automatically"
            : "Raw text, including any contact details"}
        </span>
      </div>
      {/* whitespace-pre-line: they typed line breaks and those carry meaning. */}
      <p className="whitespace-pre-line text-sm leading-relaxed text-brand-ink">
        {notes}
      </p>
    </section>
  );
}
