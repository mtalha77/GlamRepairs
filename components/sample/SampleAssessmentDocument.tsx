import Image from "next/image";

import {
  SAMPLE_CLOSING,
  SAMPLE_PATIENT,
  SAMPLE_SECTIONS,
  type SampleSection,
} from "@/lib/sample/sampleAssessment";

/**
 * HANDOVER-22 §3 — the sample rendered in the delivered report's own layout.
 *
 * Server component, deliberately: the whole value of this page is that a
 * crawler and a reader both see the full text of a real assessment in the
 * initial HTML. Rendering it client-side would hide the one thing worth
 * indexing.
 *
 * The section headings and their order come from `SAMPLE_SECTIONS`, which
 * mirrors lib/studio/reportPdf.ts. Do not type headings into this file.
 */

const reportLogo = "/svgs/GLAM REPAIR LOGO-08 2 (1).svg";

function Paragraphs({ text }: { text: string }) {
  return (
    <>
      {text.split("\n\n").map((paragraph, index) => (
        <p
          key={index}
          className="mt-3 text-sm leading-relaxed text-brand-ink first:mt-0 sm:text-[0.9375rem]"
        >
          {paragraph}
        </p>
      ))}
    </>
  );
}

function InfoField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] text-brand-gray sm:text-xs">{label}</p>
      <p className="mt-0.5 text-sm leading-snug text-brand-ink sm:text-[0.9375rem]">
        {value}
      </p>
    </div>
  );
}

function Section({ section }: { section: SampleSection }) {
  return (
    <section className="mt-8 sm:mt-9">
      <h2 className="font-serif text-xl leading-snug text-brand-primary sm:text-[1.375rem]">
        {section.title}
      </h2>

      <div
        className={
          section.callout
            ? "mt-3 rounded-2xl border border-brand-primary/30 bg-brand-lavender/25 px-4 py-4 sm:mt-4 sm:px-5 sm:py-5"
            : "mt-3 rounded-2xl bg-brand-purple-soft/70 px-4 py-4 sm:mt-4 sm:px-5 sm:py-5"
        }
      >
        {section.body ? <Paragraphs text={section.body} /> : null}

        {section.bullets ? (
          <ul className="space-y-2.5 sm:space-y-3">
            {section.bullets.map((item) => (
              <li
                key={item}
                className="flex items-start gap-2.5 text-sm leading-relaxed text-brand-ink sm:text-[0.9375rem]"
              >
                <span
                  aria-hidden
                  className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center text-brand-error"
                >
                  <svg viewBox="0 0 12 12" className="h-3.5 w-3.5" fill="none">
                    <path
                      d="M3 3L9 9M9 3L3 9"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    />
                  </svg>
                </span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        ) : null}

        {section.parts ? (
          <div className="space-y-4">
            {section.parts.map((part) => (
              <div key={part.label}>
                <h3 className="text-sm font-semibold text-brand-primary sm:text-[0.9375rem]">
                  {part.label}
                </h3>
                <p className="mt-1.5 text-sm leading-relaxed text-brand-ink sm:text-[0.9375rem]">
                  {part.body}
                </p>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}

export default function SampleAssessmentDocument() {
  return (
    <article className="mx-auto w-full max-w-[44rem] rounded-[2rem] border border-brand-lavender/60 bg-white px-5 py-7 shadow-sm sm:px-8 sm:py-9">
      <header className="text-center">
        <Image
          src={reportLogo}
          alt="Glam Repairs"
          width={121}
          height={45}
          unoptimized
          className="mx-auto h-10 w-auto sm:h-11"
        />
        <h1 className="mt-4 font-serif text-[1.625rem] leading-tight text-brand-ink sm:text-[1.875rem]">
          Skin Assessment
        </h1>
        <p className="mt-2 text-xs uppercase tracking-[0.2em] text-brand-gray">
          Sample document
        </p>
      </header>

      {/*
        Stated on the document itself, not only in the page around it. A
        screenshot of this article can travel without the surrounding page,
        and it must not be mistakable for a real client's report.
      */}
      <p className="mt-6 rounded-2xl border border-brand-primary/30 bg-brand-cream/70 px-4 py-3.5 text-sm leading-relaxed text-brand-ink">
        <strong className="font-medium">This is a demonstration.</strong> The
        client is a composite written to show the format and the depth of a
        real assessment. No client&apos;s report, photographs or details appear
        here, and nothing below is advice for your skin — yours would be
        written from your own photographs and answers.
      </p>

      <section className="mt-8 sm:mt-9">
        <h2 className="text-sm font-semibold text-brand-ink sm:text-[0.9375rem]">
          Client information
        </h2>
        <div className="mt-3 grid grid-cols-2 gap-x-5 gap-y-3 sm:gap-x-8 sm:gap-y-4">
          <InfoField label="Client name" value={SAMPLE_PATIENT.clientName} />
          <InfoField label="Gender" value={SAMPLE_PATIENT.gender} />
          <InfoField label="Concern" value={SAMPLE_PATIENT.concern} />
          <InfoField label="Age" value={SAMPLE_PATIENT.age} />
          <InfoField label="Plan" value={SAMPLE_PATIENT.plan} />
          <InfoField label="Location" value={SAMPLE_PATIENT.location} />
          <InfoField label="Reference" value={SAMPLE_PATIENT.reference} />
          <InfoField label="Report date" value={SAMPLE_PATIENT.reportDate} />
        </div>
        {/*
          The real document shows the client's own photographs here. A sample
          cannot: publishing a client's face is not something the photo-step
          consent covers, and a stock face would be a fabricated record. So
          the slot is described rather than filled.
        */}
        <p className="mt-5 rounded-2xl border border-dashed border-brand-lavender bg-brand-surface/60 px-4 py-4 text-xs leading-relaxed text-brand-gray sm:text-[0.8125rem]">
          Your own photographs appear here in the report you receive. They are
          left out of this sample — a delivered assessment contains an
          identifiable person, and no client&apos;s photographs are published
          as marketing.
        </p>
      </section>

      {SAMPLE_SECTIONS.map((section) => (
        <Section key={section.title} section={section} />
      ))}

      <section className="mt-8 rounded-2xl border border-brand-border-light/60 bg-brand-surface/50 px-4 py-4 sm:mt-9 sm:px-5 sm:py-5">
        <h2 className="text-sm font-semibold text-brand-ink sm:text-[0.9375rem]">
          What this assessment is not
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-brand-gray sm:text-[0.9375rem]">
          {SAMPLE_CLOSING}
        </p>
      </section>
    </article>
  );
}
