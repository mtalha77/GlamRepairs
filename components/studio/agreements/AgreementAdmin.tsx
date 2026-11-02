"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { formInputClassName } from "@/components/ui/fieldStyles";
import {
  deleteAgreementDraft,
  publishAgreement,
  saveAgreementDraft,
  sendAgreementReminder,
  type AgreementActionResult,
} from "@/lib/practitioners/agreementActions";

const primary = "min-h-11 rounded-xl bg-brand-primary px-4 py-2.5 text-sm text-white disabled:opacity-50";
const ghost = "min-h-10 rounded-lg border border-brand-border-light px-3 py-1.5 text-sm text-brand-ink hover:border-brand-primary disabled:opacity-50";
const danger = "min-h-10 rounded-lg border border-brand-error/40 px-3 py-1.5 text-sm text-brand-error-strong disabled:opacity-50";

function useAction() {
  const router = useRouter();
  const [result, setResult] = useState<AgreementActionResult | null>(null);
  const [pending, start] = useTransition();
  const run = (fn: () => Promise<AgreementActionResult>) =>
    start(async () => {
      const res = await fn();
      setResult(res);
      if (res.ok) router.refresh();
    });
  return { result, pending, run };
}

function Feedback({ result }: { result: AgreementActionResult | null }) {
  if (!result) return null;
  return (
    <p
      role={result.ok ? "status" : "alert"}
      className={`rounded-xl px-4 py-2.5 text-sm ${result.ok ? "bg-brand-success/15 text-brand-success-strong" : "bg-brand-error/10 text-brand-error-strong"}`}
    >
      {result.ok ? result.message : result.error}
    </p>
  );
}

/** Create a version or edit one that is not yet published. */
export function AgreementDraftEditor({
  initial,
}: {
  initial?: { version: string; title: string; body: string; effectiveFrom: string };
}) {
  const [version, setVersion] = useState(initial?.version ?? "");
  const [title, setTitle] = useState(initial?.title ?? "Practitioner Services Agreement");
  const [body, setBody] = useState(initial?.body ?? "");
  const [effectiveFrom, setEffectiveFrom] = useState(initial?.effectiveFrom ?? new Date().toISOString().slice(0, 10));
  const { result, pending, run } = useAction();
  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-brand-gray">Version</span>
          <input
            value={version}
            onChange={(e) => setVersion(e.target.value)}
            readOnly={Boolean(initial)}
            placeholder="aesthetics-v1"
            className={formInputClassName}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-brand-gray">Title</span>
          <input value={title} onChange={(e) => setTitle(e.target.value)} className={formInputClassName} />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-brand-gray">In force from</span>
          <input type="date" value={effectiveFrom} onChange={(e) => setEffectiveFrom(e.target.value)} className={formInputClassName} />
        </label>
      </div>
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-brand-gray">Full text, exactly as practitioners will read and accept it</span>
        <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={18} className={`${formInputClassName} font-mono text-xs leading-relaxed`} />
      </label>
      <button type="button" className={primary} disabled={pending} onClick={() => run(() => saveAgreementDraft({ version, title, body, effectiveFrom }))}>
        Save draft
      </button>
      <Feedback result={result} />
    </div>
  );
}

/** Publishing freezes the text for good, so the version is typed back. */
export function PublishAgreementBox({ version, blockers }: { version: string; blockers: string[] }) {
  const [confirm, setConfirm] = useState("");
  const { result, pending, run } = useAction();
  return (
    <div className="space-y-2 rounded-xl border border-brand-lavender/70 bg-brand-surface-alt p-4">
      <p className="text-sm font-medium text-brand-ink">
        Once published, this version can never be edited, and every practitioner on this track will be asked to accept it
        again.
      </p>
      <p className="text-sm text-brand-gray">
        Each of them is emailed a link to read and accept it in the studio. A later change means publishing the next
        version.
      </p>
      {blockers.length ? (
        <p className="text-sm text-brand-error-strong">Cannot be published yet: the text still has {blockers.join(" and ")}.</p>
      ) : null}
      <div className="flex flex-wrap items-end gap-2">
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-brand-gray">Type {version} to confirm</span>
          <input value={confirm} onChange={(e) => setConfirm(e.target.value)} className={formInputClassName} />
        </label>
        <button
          type="button"
          className={primary}
          disabled={pending || confirm.trim() !== version || blockers.length > 0}
          onClick={() => run(() => publishAgreement({ version, confirm }))}
        >
          Publish and freeze
        </button>
        <button
          type="button"
          className={danger}
          disabled={pending}
          onClick={() => {
            if (window.confirm(`Delete the ${version} draft?`)) run(() => deleteAgreementDraft(version));
          }}
        >
          Delete draft
        </button>
      </div>
      <Feedback result={result} />
    </div>
  );
}

export function NewDraftToggle() {
  const [open, setOpen] = useState(false);
  return open ? (
    <AgreementDraftEditor />
  ) : (
    <button type="button" className={ghost} onClick={() => setOpen(true)}>
      New version
    </button>
  );
}

/** One click to email a practitioner the link to accept (never the PDF). */
export function SendReminderButton({ practitionerId }: { practitionerId: string }) {
  const { result, pending, run } = useAction();
  return (
    <div className="space-y-1">
      <button type="button" className={ghost} disabled={pending} onClick={() => run(() => sendAgreementReminder({ practitionerId }))}>
        {pending ? "Sending..." : "Send reminder"}
      </button>
      {result ? (
        <p role={result.ok ? "status" : "alert"} className={`text-xs ${result.ok ? "text-brand-success-strong" : "text-brand-error-strong"}`}>
          {result.ok ? result.message : result.error}
        </p>
      ) : null}
    </div>
  );
}
