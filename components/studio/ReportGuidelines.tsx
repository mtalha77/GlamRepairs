"use client";

import { useState } from "react";

/**
 * HANDOVER-16 Part 6 — the writing rules, beside the editor.
 *
 * "Every practitioner sees this beside the editor while writing, not buried
 * in a PDF nobody opens." That is the whole design constraint: a document
 * filed in Drive is read once during onboarding and never again, so the
 * rules live next to the textareas they govern.
 *
 * Open by default until five reports have been written, then collapsed —
 * an experienced practitioner should not have to scroll past a thousand
 * words to reach the form, but should still be one click from the list.
 */

type ReportGuidelinesProps = {
  /** How many reports this practitioner has sent. Drives the default state. */
  reportsWritten: number;
};

const REPORTS_BEFORE_COLLAPSE = 5;

const BEFORE_YOU_WRITE = [
  "Open every photograph and look at it properly, at full size",
  "Read the whole questionnaire, including sleep, water, stress and diet",
  "Note what they have already tried, so you never recommend something they told you failed",
  "Check their city. Lahore smog, Karachi humidity and hard water change the advice",
];

const IN_THE_PHOTOGRAPHS = [
  "Where the concern actually sits, by area rather than “the face”",
  "Oil distribution: whole face, or T-zone only",
  "Texture: congestion, closed comedones, roughness, flaking",
  "Redness, visible vessels, or signs of a compromised barrier",
  "Marks versus true scars. Flat and brown will fade; indented will not",
  "Signs of over-exfoliation or steroid or fairness cream use",
  "Photo quality. If it is too dark, blurred or filtered, ask for a retake rather than guessing",
];

/** Bold fragment first, then the rest — the emphasis is in the source doc. */
const MUST_CONTAIN: [string, string][] = [
  ["Their first name", ", at least twice, in a normal sentence"],
  ["At least three specifics from their own answers", ", not generic advice"],
  ["One “start here” instruction", " if they have no existing routine"],
  ["A realistic timeline", " with a week-by-week expectation"],
  ["Ingredient categories with budget ranges", ", never brand names"],
  ["What to stop and message us about", ""],
  ["The medical boundary", " if anything suggests a doctor is needed"],
];

const NEVER = [
  "Diagnose a condition or name a disease",
  "Recommend a brand or anything we earn from",
  "Promise a result or a specific timeframe",
  "Suggest prescription-only treatments",
  "Write “Dr.”, “MD”, or “licensed”",
  "Copy from a previous client's report",
];

function Heading({ children }: { children: React.ReactNode }) {
  return (
    <h4 className="mt-5 mb-2 text-sm font-medium text-brand-ink">{children}</h4>
  );
}

function Bullets({ items }: { items: string[] }) {
  return (
    <ul className="space-y-1.5 text-sm leading-relaxed text-brand-gray">
      {items.map((item) => (
        <li key={item} className="flex gap-2">
          <span aria-hidden className="mt-[0.45rem] h-1 w-1 shrink-0 rounded-full bg-brand-primary/50" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

export default function ReportGuidelines({
  reportsWritten,
}: ReportGuidelinesProps) {
  const [open, setOpen] = useState(
    () => reportsWritten < REPORTS_BEFORE_COLLAPSE,
  );

  return (
    <section className="rounded-2xl border border-brand-lavender/70 bg-brand-lavender/10">
      <h3>
        <button
          type="button"
          onClick={() => setOpen((current) => !current)}
          aria-expanded={open}
          aria-controls="report-guidelines-body"
          className="flex w-full items-center justify-between gap-3 rounded-2xl px-5 py-4 text-left"
        >
          <span className="font-serif text-lg text-brand-primary">
            Writing a Glam Repairs assessment
          </span>
          <span className="flex items-center gap-2 text-xs text-brand-gray">
            {open ? "Hide" : "Show"}
            <svg
              aria-hidden
              viewBox="0 0 20 20"
              className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`}
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
            >
              <path d="M5 8l5 5 5-5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
        </button>
      </h3>

      <div id="report-guidelines-body" hidden={!open} className="px-5 pb-5">
        {/* The single most important rule, so it is not a bullet among bullets. */}
        <p className="rounded-xl border border-brand-error/30 bg-brand-error/5 px-4 py-3 text-sm leading-relaxed text-brand-ink">
          <strong className="font-medium">
            This must be written by you. Do not use AI.
          </strong>{" "}
          Not ChatGPT, not any assistant, not a template you paste and edit.
          Every assessment is written by hand for one person. That is the
          entire product and the only reason clients pay us rather than
          reading a blog. Reports are checked, and using AI ends the working
          relationship.
        </p>

        <Heading>Before you write</Heading>
        <Bullets items={BEFORE_YOU_WRITE} />

        <Heading>What to look for in the photographs</Heading>
        <Bullets items={IN_THE_PHOTOGRAPHS} />

        <Heading>What every report must contain</Heading>
        <ul className="space-y-1.5 text-sm leading-relaxed text-brand-gray">
          {MUST_CONTAIN.map(([bold, rest]) => (
            <li key={bold} className="flex gap-2">
              <span aria-hidden className="mt-[0.45rem] h-1 w-1 shrink-0 rounded-full bg-brand-primary/50" />
              <span>
                <strong className="font-medium text-brand-ink">{bold}</strong>
                {rest}
              </span>
            </li>
          ))}
        </ul>

        <Heading>Never</Heading>
        <Bullets items={NEVER} />

        <p className="mt-5 rounded-xl bg-brand-lavender/25 px-4 py-3 text-sm leading-relaxed text-brand-ink">
          <strong className="font-medium">If the case is not suitable</strong>,
          say so and mark it for refund. Painful cystic acne, spreading rashes,
          suspected steroid damage or anything changing rapidly belongs with a
          doctor. Recognising that is doing the job well, not failing it.
        </p>
      </div>
    </section>
  );
}
