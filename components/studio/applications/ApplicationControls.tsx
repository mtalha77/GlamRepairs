"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { formInputClassName } from "@/components/ui/fieldStyles";
import {
  approvePractitionerApplication,
  issuePractitionerInvite,
  rejectPractitionerApplication,
  resendPractitionerSignIn,
  revokePractitionerInvite,
  setApplicationStage,
  verifyApplicationDocument,
  type ApplicationActionResult,
} from "@/lib/practitioners/applicationActions";
import type { PractitionerApplicationStatus } from "@/lib/supabase/database.types";

const primary = "min-h-11 rounded-xl bg-brand-primary px-4 py-2.5 text-sm text-white disabled:opacity-50";
const ghost = "min-h-10 rounded-lg border border-brand-border-light px-3 py-1.5 text-sm text-brand-ink hover:border-brand-primary disabled:opacity-50";
const danger = "min-h-11 rounded-xl border border-brand-error/40 px-4 py-2.5 text-sm text-brand-error-strong disabled:opacity-50";

function Feedback({ result }: { result: ApplicationActionResult | null }) {
  if (!result) return null;
  return result.ok ? (
    <p role="status" className="rounded-xl bg-brand-success/15 px-4 py-2.5 text-sm text-brand-success-strong">
      {result.message}
    </p>
  ) : (
    <p role="alert" className="rounded-xl bg-brand-error/10 px-4 py-2.5 text-sm text-brand-error-strong">
      {result.error}
    </p>
  );
}

function useAction() {
  const router = useRouter();
  const [result, setResult] = useState<ApplicationActionResult | null>(null);
  const [pending, start] = useTransition();
  const run = (fn: () => Promise<ApplicationActionResult>, after?: () => void) =>
    start(async () => {
      const res = await fn();
      setResult(res);
      if (res.ok) {
        after?.();
        router.refresh();
      }
    });
  return { result, pending, run };
}

export function InvitePractitionerForm() {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [note, setNote] = useState("");
  const { result, pending, run } = useAction();
  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-brand-gray">Their name</span>
          <input value={name} onChange={(e) => setName(e.target.value)} className={formInputClassName} />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-brand-gray">Email</span>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={formInputClassName} />
        </label>
      </div>
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-brand-gray">A line for the email (optional)</span>
        <input value={note} maxLength={300} onChange={(e) => setNote(e.target.value)} className={formInputClassName} />
      </label>
      <Feedback result={result} />
      <button
        type="button"
        className={primary}
        disabled={pending || !email}
        onClick={() =>
          run(
            () => issuePractitionerInvite({ email, name, note }),
            () => {
              setEmail("");
              setName("");
              setNote("");
            },
          )
        }
      >
        {pending ? "Sending…" : "Send invite"}
      </button>
    </div>
  );
}

export function RevokeInviteButton({ id }: { id: string }) {
  const { result, pending, run } = useAction();
  return (
    <span className="inline-flex flex-col items-end gap-1">
      <button type="button" className={ghost} disabled={pending} onClick={() => run(() => revokePractitionerInvite(id))}>
        Revoke
      </button>
      {result && !result.ok ? <span className="text-xs text-brand-error-strong">{result.error}</span> : null}
    </span>
  );
}

export function DocumentVerifyToggle({ id, applicationId, verified }: { id: string; applicationId: string; verified: boolean }) {
  const { result, pending, run } = useAction();
  return (
    <span className="inline-flex flex-col items-end gap-1">
      <label className="inline-flex min-h-10 items-center gap-2 text-sm text-brand-ink">
        <input
          type="checkbox"
          checked={verified}
          disabled={pending}
          onChange={(e) => run(() => verifyApplicationDocument({ id, applicationId, verified: e.target.checked }))}
        />
        Verified
      </label>
      {result && !result.ok ? <span className="text-xs text-brand-error-strong">{result.error}</span> : null}
    </span>
  );
}

const STAGES: { status: PractitionerApplicationStatus; label: string }[] = [
  { status: "new", label: "New" },
  { status: "screening", label: "Screening" },
  { status: "interview", label: "Interview" },
  { status: "test_assessment", label: "Test assessments" },
];

export function ApplicationDecision({
  id,
  status,
  documentCount,
  verifiedCount,
}: {
  id: string;
  status: PractitionerApplicationStatus;
  documentCount: number;
  verifiedCount: number;
}) {
  const [note, setNote] = useState("");
  const [rejecting, setRejecting] = useState(false);
  const { result, pending, run } = useAction();
  const unverified = documentCount - verifiedCount;

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-medium text-brand-ink">Stage</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {STAGES.map((s) => (
            <button
              key={s.status}
              type="button"
              disabled={pending || s.status === status}
              aria-pressed={s.status === status}
              onClick={() => run(() => setApplicationStage({ id, status: s.status }))}
              className={s.status === status ? `${ghost} border-brand-primary bg-brand-purple-soft` : ghost}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <label className="flex flex-col gap-1 text-sm">
        <span className="text-brand-ink">{rejecting ? "Reason (emailed to the applicant)" : "Note (optional for approval)"}</span>
        <textarea value={note} rows={3} maxLength={1000} onChange={(e) => setNote(e.target.value)} className={formInputClassName} />
      </label>

      {unverified > 0 ? (
        <p className="text-sm text-brand-gray">
          {unverified} of {documentCount} {documentCount === 1 ? "document is" : "documents are"} not marked verified yet.
        </p>
      ) : null}

      <Feedback result={result} />

      <div className="flex flex-wrap gap-2">
        {!rejecting ? (
          <>
            <button
              type="button"
              className={primary}
              disabled={pending}
              onClick={() => {
                if (!window.confirm("Approve this application? A pending profile and a sign-in account will be created.")) return;
                run(() => approvePractitionerApplication({ id, note }));
              }}
            >
              {pending ? "Working…" : "Approve"}
            </button>
            <button type="button" className={danger} disabled={pending} onClick={() => setRejecting(true)}>
              Reject…
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              className={danger}
              disabled={pending || note.trim().length <= 5}
              onClick={() => run(() => rejectPractitionerApplication({ id, note }))}
            >
              {pending ? "Working…" : "Reject and email them"}
            </button>
            <button type="button" className={ghost} onClick={() => setRejecting(false)}>
              Cancel
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export function ResendSignInButton({ applicationId }: { applicationId: string }) {
  const { result, pending, run } = useAction();
  return (
    <div className="space-y-2">
      <button type="button" className={ghost} disabled={pending} onClick={() => run(() => resendPractitionerSignIn({ applicationId }))}>
        {pending ? "Sending…" : "Send sign-in link"}
      </button>
      <Feedback result={result} />
    </div>
  );
}
