"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";

import FormField from "@/components/ui/FormField";
import { formInputClassName } from "@/components/ui/fieldStyles";
import { sendCustomerReportAction } from "@/lib/studio/actions";
import {
  evaluateReport,
  failedChecks,
  type ReportCheck,
} from "@/lib/studio/reportQuality";
import {
  DEFAULT_GOOD_SIGNS,
  DEFAULT_START_HERE,
  DEFAULT_TIMELINE,
  DEFAULT_WARNING_SIGNS,
} from "@/lib/studio/reportGuidance";

/**
 * HANDOVER-16 Part 6 — the qualifying checklist, in the editor.
 *
 * The fields became controlled for one reason: the checklist has to update as
 * the practitioner types. An uncontrolled form cannot tell them the "What we
 * noticed" section is 40 characters short until after they press send, which
 * is the moment it is least useful.
 *
 * The button being disabled is the courtesy, not the enforcement.
 * `sendCustomerReportAction` runs the same `evaluateReport` server-side and
 * refuses independently — see the note in lib/studio/reportQuality.ts.
 */

type ReportDefaults = {
  noticed: string;
  morningRoutine: string;
  nightRoutine: string;
  avoidItems: string;
  extraNotes: string;
};

/** The Part 2 sections, kept separate: they are pre-filled, not review-derived. */
type GuidanceFields = {
  startHere: string;
  timeline: string;
  goodSigns: string;
  warningSigns: string;
};

type CreateReportFormProps = {
  leadId: string;
  toEmail: string;
  /** For the first-name check. The lead's name exactly as recorded. */
  clientFullName: string | null;
  /** Photos on this lead. Zero means the photo check has nothing to assert. */
  photoCount: number;
  defaults?: ReportDefaults;
};

function CheckIcon({ passed }: { passed: boolean }) {
  return passed ? (
    <svg
      aria-hidden
      viewBox="0 0 20 20"
      className="mt-0.5 h-4 w-4 shrink-0 text-brand-primary"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M5 10.5l3.5 3.5L15 7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ) : (
    <span
      aria-hidden
      className="mt-1 h-3.5 w-3.5 shrink-0 rounded-[0.25rem] border border-brand-gray/45"
    />
  );
}

function Checklist({ checks }: { checks: ReportCheck[] }) {
  const failed = failedChecks(checks);

  return (
    <section
      aria-label="Qualifying criteria"
      className="rounded-2xl border border-brand-lavender/70 bg-brand-lavender/10 p-4"
    >
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h4 className="text-sm font-medium text-brand-ink">
          Before this can be sent
        </h4>
        <span className="text-xs text-brand-gray">
          {checks.length - failed.length} of {checks.length}
        </span>
      </div>
      <ul className="space-y-2">
        {checks.map((check) => (
          <li key={check.id} className="flex gap-2.5 text-sm leading-snug">
            <CheckIcon passed={check.passed} />
            <span
              className={
                check.passed ? "text-brand-gray" : "text-brand-ink"
              }
            >
              {check.label}
              {check.detail ? (
                <span
                  className={`ml-1.5 text-xs ${
                    check.passed ? "text-brand-gray/70" : "text-brand-error"
                  }`}
                >
                  {check.detail}
                </span>
              ) : null}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function SubmitButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={disabled || pending}
      className="rounded-xl bg-brand-primary px-5 py-2.5 text-sm text-white disabled:opacity-60"
    >
      {pending ? "Sending PDF…" : "Send PDF report"}
    </button>
  );
}

export default function CreateReportForm({
  leadId,
  toEmail,
  clientFullName,
  photoCount,
  defaults,
}: CreateReportFormProps) {
  const canSend = Boolean(toEmail);

  const [content, setContent] = useState<ReportDefaults>({
    noticed: defaults?.noticed ?? "",
    morningRoutine: defaults?.morningRoutine ?? "",
    nightRoutine: defaults?.nightRoutine ?? "",
    avoidItems: defaults?.avoidItems ?? "",
    extraNotes: defaults?.extraNotes ?? "",
  });
  const [photosOpened, setPhotosOpened] = useState(false);
  /**
   * Pre-filled rather than blank. A blank "Timeline" box gets skipped on a
   * busy day and the section quietly stops shipping — the exact failure
   * Part 2 exists to fix. Starting from real words makes tailoring a
   * thirty-second edit instead of a writing task.
   */
  const [guidance, setGuidance] = useState<GuidanceFields>({
    startHere: DEFAULT_START_HERE,
    timeline: DEFAULT_TIMELINE,
    goodSigns: DEFAULT_GOOD_SIGNS,
    warningSigns: DEFAULT_WARNING_SIGNS,
  });

  const update = (field: keyof ReportDefaults) => (value: string) =>
    setContent((current) => ({ ...current, [field]: value }));

  const updateGuidance = (field: keyof GuidanceFields) => (value: string) =>
    setGuidance((current) => ({ ...current, [field]: value }));

  const checks = evaluateReport(content, {
    clientFullName,
    photoCount,
    photosOpened,
  });
  const blocked = failedChecks(checks).length > 0;

  return (
    <form action={sendCustomerReportAction} className="space-y-4">
      <input type="hidden" name="leadId" value={leadId} />
      {/* Read server-side as the attestation; the checkbox below sets it. */}
      <input
        type="hidden"
        name="photosOpened"
        value={photosOpened ? "1" : ""}
      />
      {!canSend ? (
        <p className="text-sm text-brand-gray">
          Add an email address before sending a PDF report.
        </p>
      ) : (
        <p className="text-sm text-brand-gray">
          The PDF will be emailed to{" "}
          <span className="font-medium text-brand-ink">{toEmail}</span>
          {defaults?.noticed
            ? ". Fields below are filled from the latest team review — edit before sending."
            : "."}
        </p>
      )}

      {photoCount > 0 ? (
        <label className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-brand-lavender/70 bg-white px-4 py-3 text-sm text-brand-ink">
          <input
            type="checkbox"
            checked={photosOpened}
            disabled={!canSend}
            onChange={(event) => setPhotosOpened(event.target.checked)}
            className="mt-0.5 h-4 w-4 accent-brand-primary"
          />
          <span>
            I opened all {photoCount}{" "}
            {photoCount === 1 ? "photograph" : "photographs"} at full size and
            looked at {photoCount === 1 ? "it" : "them"} properly.
          </span>
        </label>
      ) : null}

      <FormField id="noticed" label="What we noticed" required>
        <textarea
          id="noticed"
          name="noticed"
          required
          rows={6}
          disabled={!canSend}
          value={content.noticed}
          onChange={(event) => update("noticed")(event.target.value)}
          placeholder="Write what you observed from the photos and quiz answers."
          className={formInputClassName}
        />
      </FormField>
      <FormField id="morningRoutine" label="Morning routine" required>
        <textarea
          id="morningRoutine"
          name="morningRoutine"
          required
          rows={4}
          disabled={!canSend}
          value={content.morningRoutine}
          onChange={(event) => update("morningRoutine")(event.target.value)}
          placeholder="Step-by-step AM routine for this customer."
          className={formInputClassName}
        />
      </FormField>
      <FormField id="nightRoutine" label="Night routine" required>
        <textarea
          id="nightRoutine"
          name="nightRoutine"
          required
          rows={4}
          disabled={!canSend}
          value={content.nightRoutine}
          onChange={(event) => update("nightRoutine")(event.target.value)}
          placeholder="Step-by-step PM routine for this customer."
          className={formInputClassName}
        />
      </FormField>
      <FormField id="avoidItems" label="What to avoid" required>
        <textarea
          id="avoidItems"
          name="avoidItems"
          required
          rows={4}
          disabled={!canSend}
          value={content.avoidItems}
          onChange={(event) => update("avoidItems")(event.target.value)}
          placeholder={"One item per line\nHarsh scrubs\nSteroid creams"}
          className={formInputClassName}
        />
      </FormField>
      <FormField id="extraNotes" label="Extra notes">
        <textarea
          id="extraNotes"
          name="extraNotes"
          rows={3}
          disabled={!canSend}
          value={content.extraNotes}
          onChange={(event) => update("extraNotes")(event.target.value)}
          placeholder="Optional follow-up, lifestyle, or monitoring notes."
          className={formInputClassName}
        />
      </FormField>

      <fieldset className="space-y-4 rounded-2xl border border-brand-lavender/70 bg-brand-lavender/[0.07] p-4">
        <legend className="px-1 text-sm font-medium text-brand-ink">
          Guidance sections
        </legend>
        <p className="text-xs leading-relaxed text-brand-gray">
          Pre-filled with sensible wording. Edit them for this client — the
          timeline for pigmentation is not the timeline for oiliness.
        </p>

        <FormField id="startHere" label="Start here">
          <textarea
            id="startHere"
            name="startHere"
            rows={3}
            disabled={!canSend}
            value={guidance.startHere}
            onChange={(event) => updateGuidance("startHere")(event.target.value)}
            className={formInputClassName}
          />
        </FormField>
        <FormField id="timeline" label="What to expect, week by week">
          <textarea
            id="timeline"
            name="timeline"
            rows={5}
            disabled={!canSend}
            value={guidance.timeline}
            onChange={(event) => updateGuidance("timeline")(event.target.value)}
            className={formInputClassName}
          />
        </FormField>
        <FormField id="goodSigns" label="Good signs">
          <textarea
            id="goodSigns"
            name="goodSigns"
            rows={2}
            disabled={!canSend}
            value={guidance.goodSigns}
            onChange={(event) => updateGuidance("goodSigns")(event.target.value)}
            className={formInputClassName}
          />
        </FormField>
        <FormField id="warningSigns" label="Stop and message us if">
          <textarea
            id="warningSigns"
            name="warningSigns"
            rows={3}
            disabled={!canSend}
            value={guidance.warningSigns}
            onChange={(event) =>
              updateGuidance("warningSigns")(event.target.value)
            }
            className={formInputClassName}
          />
        </FormField>
      </fieldset>

      {canSend ? <Checklist checks={checks} /> : null}

      <SubmitButton disabled={!canSend || blocked} />
    </form>
  );
}
