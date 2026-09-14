import {
  SAMPLE_PATIENT,
  SAMPLE_SECTIONS,
  type SampleBlock,
} from "@/lib/sample/sampleAssessment";
import { AUTHORS, DEFAULT_AUTHOR_SLUG } from "@/lib/seo/authors";
import { CREDENTIALS } from "@/lib/seo/site";

/**
 * The sample report, in the delivered report's own layout.
 *
 * Server component, deliberately: the whole value of this page is that a
 * crawler and a reader both see the full text of an assessment in the
 * initial HTML. Rendering it client-side would hide the one thing worth
 * indexing.
 *
 * Section headings come from SAMPLE_SECTIONS, which mirrors
 * lib/studio/reportPdf.ts. Do not type headings into this file.
 */

function Prose({ paragraphs }: { paragraphs: string[] }) {
  return (
    <>
      {paragraphs.map((p, i) => (
        <p
          key={i}
          className="mt-[11px] text-sm leading-[1.75] text-brand-ink/90 first:mt-0"
        >
          {p}
        </p>
      ))}
    </>
  );
}

function Block({ block }: { block: SampleBlock }) {
  if (block.kind === "prose") return <Prose paragraphs={block.paragraphs} />;

  if (block.kind === "steps") {
    return (
      <ol className="mt-1 flex flex-col gap-[9px]">
        {block.steps.map((step, i) => (
          <li key={i} className="flex gap-[11px] text-sm leading-[1.6]">
            <span
              aria-hidden
              className="mt-px grid h-[21px] w-[21px] flex-none place-items-center rounded-[7px] bg-brand-cream text-[0.6875rem] font-semibold text-[#7a6320]"
            >
              {i + 1}
            </span>
            <span className="text-brand-ink/90">
              <strong className="font-medium text-brand-ink">{step.lead}</strong>{" "}
              {step.rest}
            </span>
          </li>
        ))}
      </ol>
    );
  }

  if (block.kind === "chips") {
    return (
      <ul className="mt-1 flex flex-wrap gap-[7px]">
        {block.chips.map((chip) => (
          <li
            key={chip}
            className="rounded-full bg-[#fbeceb] px-[11px] py-[5px] text-xs font-medium text-[#a33c2e]"
          >
            {chip}
          </li>
        ))}
      </ul>
    );
  }

  if (block.kind === "timeline") {
    return (
      /* The rail is a pseudo-less absolute bar rather than a border, so the
         dots can sit on top of it without a background patch. */
      <ol className="relative mt-1 flex flex-col gap-3 pl-5">
        <span
          aria-hidden
          className="absolute bottom-1.5 left-[5px] top-1.5 w-[1.5px] bg-brand-lavender"
        />
        {block.entries.map((entry) => (
          <li
            key={entry.when}
            className="relative text-[0.8438rem] leading-[1.6] text-brand-ink/90"
          >
            <span
              aria-hidden
              className="absolute -left-[19px] top-1.5 h-[9px] w-[9px] rounded-full border-2 border-brand-accent bg-white"
            />
            <strong className="font-medium text-brand-primary">
              {entry.when}
            </strong>{" "}
            {entry.what}
          </li>
        ))}
      </ol>
    );
  }

  return (
    <div className="mt-1 rounded-xl border border-brand-cream bg-brand-cream-light px-[17px] py-[15px]">
      <p className="text-[0.8125rem] leading-[1.65] text-brand-ink/90">
        {block.body}
      </p>
    </div>
  );
}

function MetaField({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-[0.625rem] font-medium uppercase tracking-[0.12em] text-brand-accent">
        {label}
      </dt>
      <dd className="mt-[3px] text-[0.8125rem] font-medium text-brand-ink">
        {value}
      </dd>
    </div>
  );
}

export default function SampleAssessmentDocument() {
  const author = AUTHORS[DEFAULT_AUTHOR_SLUG];
  const initials = author.name
    .split(" ")
    .map((part) => part[0])
    .join("");
  const degree = CREDENTIALS.find((c) => c.kind === "degree");
  const membership = CREDENTIALS.find((c) => c.kind === "membership");

  return (
    <article className="overflow-hidden rounded-[1.25rem] border border-brand-lavender/45 bg-white shadow-brand lg:sticky lg:top-6">
      <header className="border-b border-brand-lavender bg-gradient-to-br from-brand-purple-soft via-white to-white px-[30px] pb-[22px] pt-[26px]">
        <div className="mb-[18px] flex items-center justify-between gap-4">
          <span className="font-serif text-[1.0625rem] font-semibold tracking-[0.02em] text-brand-primary">
            GLAM REPAIRS
          </span>
          {/*
            Deliberately not a realistic-looking reference. A plausible one
            implies a record someone could ask us to produce.
          */}
          <span className="rounded-md border border-brand-lavender bg-white px-[9px] py-1 font-mono text-[0.6875rem] text-brand-gray">
            {SAMPLE_PATIENT.reference}
          </span>
        </div>

        <h2 className="font-serif text-2xl font-semibold leading-[1.25] tracking-[-0.01em] text-brand-ink">
          Skin Guidance Report
        </h2>

        <dl className="mt-[18px] grid grid-cols-2 gap-[14px] sm:grid-cols-4">
          <MetaField label="Client" value={SAMPLE_PATIENT.clientName} />
          <MetaField label="Age" value={SAMPLE_PATIENT.age} />
          <MetaField label="Concern" value={SAMPLE_PATIENT.concern} />
          <MetaField label="Location" value={SAMPLE_PATIENT.location} />
        </dl>
      </header>

      <div className="px-[30px] pb-[26px] pt-1.5">
        {SAMPLE_SECTIONS.map((section, index) => (
          <section
            key={section.title}
            className="border-b border-[#f4f1f7] py-[22px] last:border-b-0"
          >
            <h3 className="mb-[11px] flex items-center gap-[9px] font-serif text-lg font-medium italic text-brand-primary">
              <span
                aria-hidden
                className="grid h-[22px] w-[22px] flex-none place-items-center rounded-full bg-brand-purple-soft font-sans text-[0.6875rem] font-semibold not-italic text-brand-primary"
              >
                {index + 1}
              </span>
              {section.title}
            </h3>
            <Block block={section.block} />
          </section>
        ))}
      </div>

      {/* The signature block. Credentials come from lib/seo/site.ts, so this
          cannot claim a qualification the /credentials page does not list. */}
      <footer className="border-t border-brand-cream bg-brand-cream-light px-[30px] pb-[26px] pt-[22px]">
        <div className="flex items-center gap-[14px]">
          <span
            aria-hidden
            className="grid h-[46px] w-[46px] flex-none place-items-center rounded-full bg-gradient-to-br from-brand-primary to-brand-accent font-serif text-base text-white"
          >
            {initials}
          </span>
          <div>
            <strong className="block font-serif text-base font-semibold text-brand-ink">
              {author.name}
            </strong>
            <span className="mt-px block text-xs font-medium text-brand-primary">
              {author.title}
            </span>
          </div>
        </div>

        <p className="mt-3 text-[0.6875rem] leading-[1.75] text-brand-gray">
          {author.credentials}
          {degree?.reference ? (
            <>
              <br />
              Degree attested by the {degree.issuer}, Ref. {degree.reference}
            </>
          ) : null}
          {membership?.reference ? (
            <>
              <br />
              Member, {membership.issuer} (Membership No. {membership.reference})
            </>
          ) : null}
        </p>

        <p className="mt-3 border-t border-brand-cream pt-3 text-[0.6875rem] italic leading-[1.7] text-[#8a8590]">
          {author.name.split(" ")[0]} is not a physician or dermatologist. Glam
          Repairs provides cosmetic skincare guidance and does not diagnose,
          prescribe for, or treat medical conditions.
        </p>
      </footer>
    </article>
  );
}
