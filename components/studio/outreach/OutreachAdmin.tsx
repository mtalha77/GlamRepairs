"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { formInputClassName } from "@/components/ui/fieldStyles";
import {
  enrolList,
  importOutreachCsv,
  markContactReplied,
  pauseOutreach,
  previewEnrolment,
  previewOutreachCsv,
  resumeOutreach,
  saveOutreachSettings,
  saveOutreachStep,
  setContactsEmailStatus,
  setSequenceActive,
  suppressManually,
  type CsvPreview,
  type EnrolPreview,
  type OutreachResult,
} from "@/lib/outreach/actions";

const primary = "min-h-11 rounded-xl bg-brand-primary px-4 py-2.5 text-sm text-white disabled:opacity-50";
const ghost = "min-h-10 rounded-lg border border-brand-border-light px-3 py-1.5 text-sm text-brand-ink hover:border-brand-primary disabled:opacity-50";
const danger = "min-h-10 rounded-lg border border-brand-error/40 px-3 py-1.5 text-sm text-brand-error-strong disabled:opacity-50";
const label = "flex flex-col gap-1 text-sm";

type Result = OutreachResult<unknown>;

function useAction() {
  const router = useRouter();
  const [result, setResult] = useState<Result | null>(null);
  const [pending, start] = useTransition();
  const run = <T,>(fn: () => Promise<OutreachResult<T>>, after?: (r: OutreachResult<T>) => void) =>
    start(async () => {
      const res = await fn();
      setResult(res as Result);
      after?.(res);
      if (res.ok) router.refresh();
    });
  return { result, pending, run };
}

function Feedback({ result }: { result: Result | null }) {
  if (!result || (result.ok && !result.message)) return null;
  return (
    <p
      role={result.ok ? "status" : "alert"}
      className={`rounded-xl px-4 py-2.5 text-sm ${result.ok ? "bg-brand-success/15 text-brand-success-strong" : "bg-brand-error/10 text-brand-error-strong"}`}
    >
      {result.ok ? result.message : result.error}
    </p>
  );
}

// ── Pause and settings ────────────────────────────────────────────────────

export function PauseControl({ paused }: { paused: boolean }) {
  const [note, setNote] = useState("");
  const { result, pending, run } = useAction();
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-end gap-2">
        <label className={`${label} min-w-[16rem] flex-1`}>
          <span className="text-brand-gray">{paused ? "What did you check before resuming? (required)" : "Reason for pausing"}</span>
          <input value={note} onChange={(e) => setNote(e.target.value)} className={formInputClassName} />
        </label>
        {paused ? (
          <button type="button" className={primary} disabled={pending} onClick={() => run(() => resumeOutreach({ note }))}>
            Resume sending
          </button>
        ) : (
          <button type="button" className={danger} disabled={pending} onClick={() => run(() => pauseOutreach({ reason: note }))}>
            Pause all sending
          </button>
        )}
      </div>
      <Feedback result={result} />
    </div>
  );
}

export function SettingsForm({ dailyCap, hourlyCap, businessAddress }: { dailyCap: number; hourlyCap: number; businessAddress: string }) {
  const [d, setD] = useState(String(dailyCap));
  const [h, setH] = useState(String(hourlyCap));
  const [addr, setAddr] = useState(businessAddress);
  const { result, pending, run } = useAction();
  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-[8rem_8rem_1fr]">
        <label className={label}>
          <span className="text-brand-gray">Daily cap</span>
          <input inputMode="numeric" value={d} onChange={(e) => setD(e.target.value)} className={formInputClassName} />
        </label>
        <label className={label}>
          <span className="text-brand-gray">Hourly cap</span>
          <input inputMode="numeric" value={h} onChange={(e) => setH(e.target.value)} className={formInputClassName} />
        </label>
        <label className={label}>
          <span className="text-brand-gray">Business postal address (printed in every email)</span>
          <input value={addr} onChange={(e) => setAddr(e.target.value)} placeholder="Street, city, postcode, country" className={formInputClassName} />
        </label>
      </div>
      <p className="text-xs text-brand-gray">
        Start a new sending domain at 10 to 20 a day and raise it slowly while bounces stay under 2% and replies come in.
      </p>
      <button
        type="button"
        className={primary}
        disabled={pending}
        onClick={() => run(() => saveOutreachSettings({ dailyCap: Number(d), hourlyCap: Number(h), businessAddress: addr }))}
      >
        Save settings
      </button>
      <Feedback result={result} />
    </div>
  );
}

// ── Lists ─────────────────────────────────────────────────────────────────

export function CsvImport() {
  const router = useRouter();
  const [preview, setPreview] = useState<CsvPreview | null>(null);
  const [form, setForm] = useState<HTMLFormElement | null>(null);
  const { result, pending, run } = useAction();
  const data = () => new FormData(form ?? undefined);
  return (
    <form ref={setForm} className="space-y-3" onChange={() => setPreview(null)} onSubmit={(e) => e.preventDefault()}>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className={label}>
          <span className="text-brand-gray">List name</span>
          <input name="name" required placeholder="Lahore aesthetics enquiries, Nov 2026" className={formInputClassName} />
        </label>
        <label className={label}>
          <span className="text-brand-gray">Who is on it</span>
          <select name="audience" defaultValue="" className={formInputClassName}>
            <option value="" disabled>
              Choose
            </option>
            <option value="practitioner">Practitioners (warm: they contacted us)</option>
            <option value="brand">Brands</option>
          </select>
        </label>
        <label className={`${label} sm:col-span-2`}>
          <span className="text-brand-gray">Where these addresses came from (required, kept with the list)</span>
          <input name="sourceNote" placeholder="Replies to our Instagram post, 1 to 30 October; each asked to hear more" className={formInputClassName} />
        </label>
        <label className={label}>
          <span className="text-brand-gray">Country when the file has none (2 letters)</span>
          <input name="defaultCountry" maxLength={2} placeholder="PK" className={`${formInputClassName} uppercase`} />
        </label>
        <label className={label}>
          <span className="text-brand-gray">CSV file (needs an &quot;email&quot; column)</span>
          <input name="file" type="file" accept=".csv,text/csv" className="text-sm" />
        </label>
      </div>
      <label className="flex items-start gap-2 text-sm text-brand-ink">
        <input type="checkbox" name="addressesChecked" className="mt-1" />
        <span>Every address in this file has been checked with a verification tool or is one the person gave us. Mark them valid.</span>
      </label>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className={ghost}
          disabled={pending}
          onClick={() =>
            run(
              () => previewOutreachCsv(data()),
              (r) => setPreview(r.ok ? (r.data ?? null) : null),
            )
          }
        >
          Preview
        </button>
        {preview ? (
          <button
            type="button"
            className={primary}
            disabled={pending}
            onClick={() =>
              run(
                () => importOutreachCsv(data()),
                (r) => {
                  if (r.ok && r.data) {
                    setPreview(null);
                    router.push(`/studio/outreach/lists/${r.data.listId}`);
                  }
                },
              )
            }
          >
            Import {preview.importable} contacts
          </button>
        ) : null}
      </div>
      {preview ? (
        <div className="space-y-2 rounded-xl bg-brand-lavender/30 p-4 text-sm text-brand-ink">
          <p>
            {preview.total} rows. {preview.importable} new, {preview.alreadyContacts} already on a list, {preview.invalid} not valid addresses.
            {preview.noCountry ? ` ${preview.noCountry} have no country and will not be sent to until one is set.` : ""}
          </p>
          {preview.blocked.length ? (
            <p className="text-brand-error-strong">
              {preview.blocked.length} would be blocked at enrolment:{" "}
              {preview.blocked
                .slice(0, 6)
                .map((b) => `${b.email} (${b.reason})`)
                .join("; ")}
              {preview.blocked.length > 6 ? "; and more" : ""}
            </p>
          ) : null}
          {preview.sample.length ? (
            <ul className="list-disc pl-5 text-xs text-brand-gray">
              {preview.sample.map((c) => (
                <li key={c.email}>
                  {c.email}
                  {c.first_name ? `, ${c.first_name}` : ""}
                  {c.company ? `, ${c.company}` : ""}
                  {c.country_code ? `, ${c.country_code}` : ""}
                </li>
              ))}
            </ul>
          ) : null}
          <p className="text-xs text-brand-gray">Importing sends nothing. Enrolment is a separate step on the list page.</p>
        </div>
      ) : null}
      {result && !(result.ok && result.message === "Preview ready.") ? <Feedback result={result} /> : null}
    </form>
  );
}

export function SuppressForm() {
  const [email, setEmail] = useState("");
  const [note, setNote] = useState("");
  const { result, pending, run } = useAction();
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-end gap-2">
        <label className={`${label} min-w-[14rem] flex-1`}>
          <span className="text-brand-gray">Address</span>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={formInputClassName} />
        </label>
        <label className={`${label} min-w-[14rem] flex-1`}>
          <span className="text-brand-gray">Note</span>
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Asked by phone not to be emailed" className={formInputClassName} />
        </label>
        <button type="button" className={danger} disabled={pending} onClick={() => run(() => suppressManually({ email, note }))}>
          Never email
        </button>
      </div>
      <Feedback result={result} />
    </div>
  );
}

// ── A list's contacts and enrolment ─────────────────────────────────────────

export type ContactView = {
  id: string;
  email: string;
  first_name: string | null;
  company: string | null;
  country_code: string | null;
  status: string;
  email_status: string;
  progress: string;
};

const STATUS_TONE: Record<string, string> = {
  valid: "text-brand-success-strong",
  invalid: "text-brand-error-strong",
  risky: "text-brand-error-strong",
  unknown: "text-brand-gray",
};

export function ContactTable({ contacts }: { contacts: ContactView[] }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const { result, pending, run } = useAction();
  const toggle = (id: string) =>
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  const all = selected.size === contacts.length && contacts.length > 0;
  const mark = (status: "valid" | "risky" | "invalid") => run(() => setContactsEmailStatus({ contactIds: [...selected], status }), (r) => r.ok && setSelected(new Set()));
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="text-brand-gray">{selected.size} selected. Mark address as:</span>
        <button type="button" className={ghost} disabled={pending || !selected.size} onClick={() => mark("valid")}>
          Valid
        </button>
        <button type="button" className={ghost} disabled={pending || !selected.size} onClick={() => mark("risky")}>
          Risky
        </button>
        <button type="button" className={ghost} disabled={pending || !selected.size} onClick={() => mark("invalid")}>
          Invalid
        </button>
      </div>
      <Feedback result={result} />
      <div className="overflow-x-auto">
        <table className="w-full min-w-[46rem] text-left text-sm">
          <thead className="text-xs uppercase tracking-[0.06em] text-brand-gray">
            <tr>
              <th className="py-2 pr-2">
                <input type="checkbox" aria-label="Select all" checked={all} onChange={() => setSelected(all ? new Set() : new Set(contacts.map((c) => c.id)))} />
              </th>
              <th className="py-2 pr-3 font-medium">Contact</th>
              <th className="py-2 pr-3 font-medium">Country</th>
              <th className="py-2 pr-3 font-medium">Address</th>
              <th className="py-2 pr-3 font-medium">Status</th>
              <th className="py-2 pr-3 font-medium">Sequence</th>
              <th className="py-2 font-medium">Reply</th>
            </tr>
          </thead>
          <tbody>
            {contacts.map((c) => (
              <tr key={c.id} className="border-t border-brand-lavender/50 align-top">
                <td className="py-2 pr-2">
                  <input type="checkbox" aria-label={`Select ${c.email}`} checked={selected.has(c.id)} onChange={() => toggle(c.id)} />
                </td>
                <td className="py-2 pr-3">
                  <Link href={`/studio/outreach/contacts/${c.id}`} className="text-brand-primary underline-offset-2 hover:underline">
                    {c.email}
                  </Link>
                  <div className="text-xs text-brand-gray">{[c.first_name, c.company].filter(Boolean).join(", ")}</div>
                </td>
                <td className="py-2 pr-3">{c.country_code ?? <span className="text-brand-error-strong">none</span>}</td>
                <td className={`py-2 pr-3 ${STATUS_TONE[c.email_status] ?? ""}`}>{c.email_status}</td>
                <td className="py-2 pr-3">{c.status}</td>
                <td className="py-2 pr-3 text-xs text-brand-gray">{c.progress}</td>
                <td className="py-2">{["queued", "active", "complete", "new"].includes(c.status) ? <MarkRepliedButton contactId={c.id} compact /> : null}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function MarkRepliedButton({ contactId, compact }: { contactId: string; compact?: boolean }) {
  const { result, pending, run } = useAction();
  return (
    <div className="space-y-1">
      <button type="button" className={ghost} disabled={pending} onClick={() => run(() => markContactReplied(contactId))}>
        {compact ? "Replied" : "Mark replied (stops every sequence)"}
      </button>
      {compact && result?.ok ? null : <Feedback result={result} />}
    </div>
  );
}

export function EnrolForm({ listId, sequences }: { listId: string; sequences: { code: string; name: string; active: boolean }[] }) {
  const [code, setCode] = useState(sequences[0]?.code ?? "");
  const [preview, setPreview] = useState<EnrolPreview | null>(null);
  const [confirmText, setConfirmText] = useState("");
  const { result, pending, run } = useAction();
  if (!sequences.length) return <p className="text-sm text-brand-gray">No sequence for this audience.</p>;
  const seq = sequences.find((s) => s.code === code);
  const ready = preview && confirmText.trim() === String(preview.eligible);
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-2">
        <label className={`${label} min-w-[16rem]`}>
          <span className="text-brand-gray">Sequence</span>
          <select
            value={code}
            onChange={(e) => {
              setCode(e.target.value);
              setPreview(null);
            }}
            className={formInputClassName}
          >
            {sequences.map((s) => (
              <option key={s.code} value={s.code}>
                {s.name}
                {s.active ? "" : " (switched off)"}
              </option>
            ))}
          </select>
        </label>
        <button type="button" className={ghost} disabled={pending} onClick={() => run(() => previewEnrolment({ listId, sequenceCode: code }), (r) => setPreview(r.ok ? (r.data ?? null) : null))}>
          Check who is eligible
        </button>
      </div>
      {preview ? (
        <div className="space-y-3 rounded-xl border border-brand-lavender bg-brand-lavender/20 p-4 text-sm">
          <p className="text-brand-ink">
            <strong>{preview.eligible}</strong> contacts would be enrolled in <strong>{preview.sequenceName}</strong>.
          </p>
          {Object.keys(preview.excluded).length ? (
            <ul className="list-disc pl-5 text-xs text-brand-gray">
              {Object.entries(preview.excluded).map(([k, n]) => (
                <li key={k}>
                  {n} left out: {k}
                </li>
              ))}
            </ul>
          ) : null}
          {seq && !seq.active ? (
            <p className="text-xs text-brand-gray">The sequence is switched off, so nothing sends until it is switched on with every blank filled.</p>
          ) : null}
          {preview.eligible ? (
            <>
              <label className={label}>
                <span className="text-brand-gray">
                  Type {preview.eligible} to confirm you are enrolling {preview.eligible} people in {preview.sequenceName}
                </span>
                <input inputMode="numeric" value={confirmText} onChange={(e) => setConfirmText(e.target.value)} className={`${formInputClassName} max-w-[10rem]`} />
              </label>
              <button
                type="button"
                className={primary}
                disabled={pending || !ready}
                onClick={() =>
                  run(
                    () => enrolList({ listId, sequenceCode: code, confirmCount: preview.eligible }),
                    () => {
                      setPreview(null);
                      setConfirmText("");
                    },
                  )
                }
              >
                Enrol {preview.eligible} in {preview.sequenceName}
              </button>
            </>
          ) : null}
        </div>
      ) : null}
      <Feedback result={result} />
    </div>
  );
}

// ── Sequences ─────────────────────────────────────────────────────────────

export function SequenceToggle({ code, active, blanks }: { code: string; active: boolean; blanks: string[] }) {
  const { result, pending, run } = useAction();
  return (
    <div className="space-y-2">
      <button
        type="button"
        className={active ? danger : primary}
        disabled={pending || (!active && blanks.length > 0)}
        onClick={() => run(() => setSequenceActive({ code, active: !active }))}
      >
        {active ? "Switch off" : "Switch on"}
      </button>
      {!active && blanks.length ? <p className="text-xs text-brand-error-strong">Fill in first: {blanks.join(", ")}</p> : null}
      <Feedback result={result} />
    </div>
  );
}

export function StepEditor({ step }: { step: { id: string; step_no: number; delay_days: number; subject: string; body_md: string } }) {
  const [subject, setSubject] = useState(step.subject);
  const [body, setBody] = useState(step.body_md);
  const [day, setDay] = useState(String(step.delay_days));
  const { result, pending, run } = useAction();
  const blanks = [...`${subject}\n${body}`.matchAll(/(\[[^\]\n]{1,120}\])(?!\()/g)].map((m) => m[1]);
  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-[6rem_1fr]">
        <label className={label}>
          <span className="text-brand-gray">Day</span>
          <input inputMode="numeric" value={day} onChange={(e) => setDay(e.target.value)} className={formInputClassName} />
        </label>
        <label className={label}>
          <span className="text-brand-gray">Subject</span>
          <input value={subject} onChange={(e) => setSubject(e.target.value)} className={formInputClassName} />
        </label>
      </div>
      <label className={label}>
        <span className="text-brand-gray">
          Body. Paragraphs, **bold**, &quot;- &quot; lists and [text](https://...) links. Use {"{{first_name}}"} and {"{{company}}"}.
        </span>
        <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={12} className={`${formInputClassName} font-mono text-xs leading-relaxed`} />
      </label>
      {blanks.length ? <p className="text-xs text-brand-error-strong">Still to fill in: {blanks.join(", ")}</p> : null}
      <button type="button" className={primary} disabled={pending} onClick={() => run(() => saveOutreachStep({ stepId: step.id, subject, body, delayDays: Number(day) }))}>
        Save step {step.step_no}
      </button>
      <Feedback result={result} />
    </div>
  );
}
