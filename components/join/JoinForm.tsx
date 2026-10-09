"use client";

import { useState } from "react";

import { formInputClassName, formLabelClassName } from "@/components/ui/fieldStyles";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

/**
 * The application form — HANDOVER-51 §4.1.
 *
 * Files are only uploaded after the server has accepted the application,
 * which it does only with the terms box ticked. They go straight to the
 * private bucket through one-time URLs the server issued for this
 * application, never through a public address.
 */

const KINDS = [
  { value: "degree", label: "Degree" },
  { value: "attestation", label: "HEC attestation" },
  { value: "certificate", label: "Certificate" },
  { value: "registration", label: "Registration" },
  { value: "id", label: "ID" },
  { value: "other", label: "Other" },
] as const;

const ACCEPT = "application/pdf,image/jpeg,image/png,image/webp";
const MAX_BYTES = 10 * 1024 * 1024;
const MAX_FILES = 6;

type Picked = { file: File; kind: string };

type Fields = {
  fullName: string;
  phone: string;
  city: string;
  qualification: string;
  years: string;
  clinics: string;
  about: string;
  portfolioUrl: string;
  regBody: string;
  regNo: string;
};

type Props =
  | { mode?: "new"; token: string; email: string; kind: "practitioner" | "doctor" }
  | {
      mode: "edit";
      applicationId: string;
      editKey: string;
      email: string;
      kind: "practitioner" | "doctor";
      initial: Fields;
      /** Fields the reviewer flagged, highlighted in the form. */
      flagged: string[];
    };

const EMPTY: Fields = {
  fullName: "",
  phone: "",
  city: "",
  qualification: "",
  years: "",
  clinics: "",
  about: "",
  portfolioUrl: "",
  regBody: "",
  regNo: "",
};

export default function JoinForm(props: Props) {
  const { email, kind } = props;
  const editing = props.mode === "edit";
  const flagged = new Set(props.mode === "edit" ? props.flagged : []);
  const [fields, setFields] = useState<Fields>(props.mode === "edit" ? props.initial : EMPTY);
  const [files, setFiles] = useState<Picked[]>([]);
  const [terms, setTerms] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const set = (k: keyof Fields) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setFields((f) => ({ ...f, [k]: e.target.value }));

  function addFiles(list: FileList | null) {
    if (!list) return;
    setError(null);
    const next = [...files];
    for (const file of Array.from(list)) {
      if (next.length >= MAX_FILES) {
        setError(`Attach at most ${MAX_FILES} files.`);
        break;
      }
      if (file.size > MAX_BYTES) {
        setError(`${file.name} is over 10 MB.`);
        continue;
      }
      if (!ACCEPT.split(",").includes(file.type)) {
        setError(`${file.name}: only PDF, JPG, PNG or WebP files.`);
        continue;
      }
      next.push({ file, kind: next.length === 0 ? "degree" : "certificate" });
    }
    setFiles(next);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!terms) return setError("Please agree to the terms to continue.");
    if (files.length === 0 && !editing) return setError("Please attach at least your degree.");
    setBusy(true);
    try {
      const start = await fetch(props.mode === "edit" ? "/api/join/update" : "/api/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(props.mode === "edit" ? { applicationId: props.applicationId, editKey: props.editKey } : { token: props.token }),
          terms,
          ...fields,
          files: files.map((f) => ({ kind: f.kind, name: f.file.name, size: f.file.size, type: f.file.type })),
        }),
      });
      const started = (await start.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        applicationId?: string;
        key?: string;
        uploads?: { path: string; token: string; kind: string; name: string }[];
      };
      if (!started.ok || !started.uploads || !started.applicationId) {
        setError(started.error ?? "Something went wrong. Please try again.");
        return;
      }

      const supabase = createBrowserSupabaseClient();
      const uploaded: { path: string; kind: string; name: string }[] = [];
      for (let i = 0; i < started.uploads.length; i++) {
        const u = started.uploads[i];
        const { error: upError } = await supabase.storage
          .from("practitioner-docs")
          .uploadToSignedUrl(u.path, u.token, files[i].file, { contentType: files[i].file.type });
        if (!upError) uploaded.push({ path: u.path, kind: u.kind, name: u.name });
      }

      const complete = await fetch("/api/join/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ applicationId: started.applicationId, key: started.key, files: uploaded }),
      });
      const completed = (await complete.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!completed.ok) {
        setError(completed.error ?? "Your application is saved, but the documents could not be recorded.");
        return;
      }
      if (uploaded.length < files.length) {
        setError(
          `Your application is saved, but ${files.length - uploaded.length} of your files did not upload. We will ask you for them by email.`,
        );
      }
      setDone(true);
    } catch {
      setError("Something went wrong. Please check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div role="status" className="rounded-2xl border border-brand-lavender/70 bg-white p-5">
        <h2 className="font-serif text-2xl text-brand-primary">Thank you</h2>
        <p className="mt-2 text-sm leading-relaxed text-brand-ink">
          {editing
            ? `Your changes are saved. We will look at them and reply by email to ${email}.`
            : `Your application has arrived. We read every one ourselves and will reply by email to ${email}.`}
        </p>
        {error ? <p className="mt-2 text-sm text-brand-error-strong">{error}</p> : null}
      </div>
    );
  }

  const flag = (k: string) => (flagged.has(k) ? " ring-2 ring-amber-400 rounded-xl" : "");
  const field = (k: keyof Fields, label: string, attrs: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <label className={`block${flag(k)}`}>
      <span className={formLabelClassName}>
        {label}
        {flagged.has(k) ? <span className="ml-2 text-xs font-medium text-amber-700">Please check</span> : null}
      </span>
      <input value={fields[k]} onChange={set(k)} className={formInputClassName} {...attrs} />
    </label>
  );

  return (
    <form onSubmit={submit} className="space-y-5 rounded-2xl border border-brand-lavender/70 bg-white p-5 sm:p-6" noValidate>
      <p className="text-sm text-brand-gray">
        Applying as <strong className="font-medium text-brand-ink">{email}</strong>
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        {field("fullName", "Full name", { autoComplete: "name", required: true })}
        {field("phone", "Phone (WhatsApp)", { autoComplete: "tel", inputMode: "tel" })}
        {field("city", "City", { autoComplete: "address-level2" })}
        {field("years", "Years of practice", { inputMode: "numeric", required: true })}
      </div>
      {field("qualification", "Qualification", { placeholder: "e.g. BS Cosmetology & Dermatology Science", required: true })}
      <label className={`block${flag("clinics")}`}>
        <span className={formLabelClassName}>Clinics you have worked at</span>
        <textarea value={fields.clinics} onChange={set("clinics")} rows={2} maxLength={600} className={formInputClassName} />
      </label>
      <label className={`block${flag("about")}`}>
        <span className={formLabelClassName}>About your practice</span>
        <textarea value={fields.about} onChange={set("about")} rows={4} maxLength={2000} required className={formInputClassName} />
      </label>
      {field("portfolioUrl", "Portfolio or LinkedIn link (optional)", { type: "url", inputMode: "url" })}
      {kind === "doctor" ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {field("regBody", "Registration body", { required: true })}
          {field("regNo", "Registration number", { required: true })}
        </div>
      ) : null}

      <fieldset className={flag("documents")}>
        <legend className={formLabelClassName}>
          {editing ? "Add documents (optional)" : "Documents (PDF, JPG, PNG or WebP, up to 10 MB each)"}
          {flagged.has("documents") ? <span className="ml-2 text-xs font-medium text-amber-700">Please check</span> : null}
        </legend>
        <p className="text-xs text-brand-gray">Your degree, its HEC attestation and any certificates. They are kept privately and only our team can open them.</p>
        <input type="file" accept={ACCEPT} multiple onChange={(e) => addFiles(e.target.files)} className="mt-2 block w-full text-sm" />
        {files.length ? (
          <ul className="mt-3 space-y-2">
            {files.map((f, i) => (
              <li key={i} className="flex flex-wrap items-center gap-2 rounded-xl bg-brand-cream-card/60 px-3 py-2 text-sm">
                <span className="min-w-0 basis-full truncate sm:basis-auto sm:flex-1">{f.file.name}</span>
                <select
                  value={f.kind}
                  onChange={(e) => setFiles((list) => list.map((x, j) => (j === i ? { ...x, kind: e.target.value } : x)))}
                  className="rounded-lg border border-brand-border-light bg-white px-2 py-1.5 text-sm"
                  aria-label={`What is ${f.file.name}?`}
                >
                  {KINDS.map((k) => (
                    <option key={k.value} value={k.value}>
                      {k.label}
                    </option>
                  ))}
                </select>
                <button type="button" onClick={() => setFiles((list) => list.filter((_, j) => j !== i))} className="min-h-10 px-2 text-brand-primary underline">
                  Remove
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </fieldset>

      <label className="flex items-start gap-3 rounded-xl border border-brand-lavender/60 px-4 py-3 text-sm leading-relaxed">
        <input type="checkbox" checked={terms} onChange={(e) => setTerms(e.target.checked)} className="mt-1 h-4 w-4 shrink-0" />
        <span>
          The information and documents I am sending are accurate and mine. I agree that GlamRepairs may keep them to
          review my application, and that if I am not accepted they are deleted within 30 days. Nothing is uploaded
          until this box is ticked.
        </span>
      </label>

      {error ? (
        <p role="alert" className="text-sm text-brand-error-strong">
          {error}
        </p>
      ) : null}

      <button type="submit" disabled={busy} className="min-h-12 w-full rounded-full bg-brand-primary px-6 text-sm text-white disabled:opacity-60">
        {busy ? "Sending…" : editing ? "Save changes" : "Send application"}
      </button>
    </form>
  );
}
