"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { formInputClassName } from "@/components/ui/fieldStyles";
import {
  approvePractitionerApplication,
  issuePractitionerInvite,
  rejectPractitionerApplication,
  requestApplicationChanges,
  resendPractitionerSignIn,
  revokePractitionerInvite,
  sendAssessmentLink,
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

const REVISION_FIELD_LABELS: Record<string, string> = {
  fullName: "Full name",
  phone: "Phone",
  city: "City",
  qualification: "Qualification",
  years: "Years of practice",
  clinics: "Clinics",
  about: "About",
  portfolioUrl: "Portfolio link",
  documents: "Documents",
};

const STAGES: { status: PractitionerApplicationStatus; label: string }[] = [
  { status: "new", label: "New" },
  { status: "screening", label: "Screening" },
  { status: "interview", label: "Interview" },
  { status: "test_assessment", label: "Test assessments" },
];

/** The note field says what it is for, and who reads it — spec 20 October §6.2. */
const NOTE_LABEL = {
  decide: { label: "Note, optional", hint: "Kept on the application. Not sent to them." },
  changes: { label: "What needs changing, required", hint: "This is emailed to them. At least 15 characters." },
  reject: { label: "Reason, required. This is sent to them", hint: "/join promises a reason, so make it one they can use. At least 6 characters." },
} as const;

const MIN_NOTE = { changes: 15, reject: 6 } as const;

export function ApplicationDecision({
  id,
  status,
  unverifiedCount,
  degreeVerified,
  photoVerified,
}: {
  id: string;
  status: PractitionerApplicationStatus;
  unverifiedCount: number;
  degreeVerified: boolean;
  photoVerified: boolean;
}) {
  const [note, setNote] = useState("");
  const [mode, setMode] = useState<"decide" | "reject" | "changes">("decide");
  const [flagged, setFlagged] = useState<string[]>([]);
  const { result, pending, run } = useAction();
  const canApprove = degreeVerified && photoVerified;
  const missing = [degreeVerified ? null : "the degree", photoVerified ? null : "the photograph"].filter(Boolean).join(" and ");
  const length = note.trim().length;
  const short = mode !== "decide" && length < MIN_NOTE[mode];

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
        <span className="font-medium text-brand-ink">{NOTE_LABEL[mode].label}</span>
        <span className="text-xs text-brand-gray">{NOTE_LABEL[mode].hint}</span>
        <textarea value={note} rows={3} maxLength={1000} onChange={(e) => setNote(e.target.value)} className={formInputClassName} />
        {short && length > 0 ? (
          <span className="text-xs text-brand-error-strong">
            {MIN_NOTE[mode as "changes" | "reject"] - length} more {MIN_NOTE[mode as "changes" | "reject"] - length === 1 ? "character" : "characters"} needed.
          </span>
        ) : null}
      </label>

      {mode === "changes" ? (
        <fieldset>
          <legend className="text-sm text-brand-ink">Highlight for them</legend>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-2">
            {Object.entries(REVISION_FIELD_LABELS).map(([key, label]) => (
              <label key={key} className="inline-flex min-h-10 items-center gap-2 text-sm text-brand-ink">
                <input
                  type="checkbox"
                  checked={flagged.includes(key)}
                  onChange={(e) => setFlagged((list) => (e.target.checked ? [...list, key] : list.filter((k) => k !== key)))}
                />
                {label}
              </label>
            ))}
          </div>
        </fieldset>
      ) : null}

      {mode === "decide" && !canApprove ? (
        <div id="approve-blocked" className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-brand-ink">
          <p className="font-medium">Verify {missing} before approving.</p>
          {unverifiedCount > 0 ? (
            <p className="mt-0.5 text-brand-gray">
              {unverifiedCount} {unverifiedCount === 1 ? "document is" : "documents are"} waiting to be checked.
            </p>
          ) : (
            <p className="mt-0.5 text-brand-gray">
              {missing.includes("photograph") && missing.includes("degree")
                ? "Neither has been uploaded."
                : `No ${missing.replace("the ", "")} has been uploaded.`}
            </p>
          )}
        </div>
      ) : mode === "decide" && unverifiedCount > 0 ? (
        <p className="text-sm text-brand-gray">
          {unverifiedCount} {unverifiedCount === 1 ? "document still needs" : "documents still need"} checking.
        </p>
      ) : null}

      <Feedback result={result} />

      <div className="flex flex-wrap gap-2">
        {mode === "decide" ? (
          <>
            <button
              type="button"
              className={primary}
              disabled={pending || !canApprove}
              aria-describedby={canApprove ? undefined : "approve-blocked"}
              onClick={() => {
                if (!window.confirm("Approve this application? A pending profile and a sign-in account will be created.")) return;
                run(() => approvePractitionerApplication({ id, note }));
              }}
            >
              {pending ? "Working…" : "Approve"}
            </button>
            <button type="button" className={ghost} disabled={pending} onClick={() => setMode("changes")}>
              Request changes…
            </button>
            <button type="button" className={danger} disabled={pending} onClick={() => setMode("reject")}>
              Reject…
            </button>
          </>
        ) : mode === "changes" ? (
          <>
            <button
              type="button"
              className={primary}
              disabled={pending || short}
              onClick={() => run(() => requestApplicationChanges({ id, fields: flagged, message: note }), () => setMode("decide"))}
            >
              {pending ? "Working…" : "Send request"}
            </button>
            <button type="button" className={ghost} onClick={() => setMode("decide")}>
              Cancel
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              className={danger}
              disabled={pending || short}
              onClick={() => run(() => rejectPractitionerApplication({ id, note }))}
            >
              {pending ? "Working…" : "Reject and email them"}
            </button>
            <button type="button" className={ghost} onClick={() => setMode("decide")}>
              Cancel
            </button>
          </>
        )}
      </div>
    </div>
  );
}

/** Send, or send again, the screening assessment link — spec 20 October §6.3. */
export function SendAssessmentButton({ id, sentLabel }: { id: string; sentLabel: string | null }) {
  const { result, pending, run } = useAction();
  return (
    <div className="space-y-2">
      <button
        type="button"
        className={sentLabel ? ghost : primary}
        disabled={pending}
        onClick={() => {
          if (sentLabel && !window.confirm("Send the link again? It allows one more start.")) return;
          run(() => sendAssessmentLink({ id }));
        }}
      >
        {pending ? "Sending…" : sentLabel ? "Send the link again" : "Send the assessment link"}
      </button>
      {sentLabel ? <p className="text-xs text-brand-gray">Last sent {sentLabel}.</p> : null}
      <Feedback result={result} />
    </div>
  );
}

export function ResendSignInButton({ applicationId }: { applicationId: string }) {
  const { result, pending, run } = useAction();
  const [copied, setCopied] = useState(false);
  const link = result?.link;
  return (
    <div className="space-y-2">
      <button type="button" className={ghost} disabled={pending} onClick={() => run(() => resendPractitionerSignIn({ applicationId }))}>
        {pending ? "Sending…" : "Send a new sign-in link"}
      </button>
      <Feedback result={result} />
      {link ? (
        // Also shown here so it can go on WhatsApp. It signs this person in,
        // so send it only to them. A newer link retires this one.
        <div className="space-y-2 rounded-xl border border-brand-lavender/70 bg-white p-3">
          <code className="block break-all text-xs text-brand-ink">{link}</code>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className={ghost}
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(link);
                  setCopied(true);
                } catch {
                  setCopied(false);
                }
              }}
            >
              {copied ? "Copied" : "Copy link"}
            </button>
            <a
              className={`${ghost} inline-flex items-center`}
              href={`https://wa.me/?text=${encodeURIComponent(`Your GlamRepairs studio link (works for 7 days): ${link}`)}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              Share on WhatsApp
            </a>
          </div>
        </div>
      ) : null}
    </div>
  );
}
