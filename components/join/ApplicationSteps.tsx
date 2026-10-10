"use client";

import { useState } from "react";

import { formInputClassName, formLabelClassName } from "@/components/ui/fieldStyles";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

/**
 * The practitioner application in five short steps — HANDOVER-52 §4.1.
 *
 * Every step is saved when it is finished, and the invite link brings the
 * applicant back to where they left off: someone photographing their
 * degree will leave the page, and they should return to step 3, not step 1.
 * Nothing is stored until the terms box at step 1 is ticked.
 */

type Kind = "practitioner" | "doctor";
type Doc = { id: string; kind: string; name: string };

export type StepsInitial = {
  step: number;
  fullName: string;
  phone: string;
  city: string;
  qualification: string;
  qualificationYear: string;
  institution: string;
  years: string;
  clinics: string;
  about: string;
  portfolioUrl: string;
  regBody: string;
  regNo: string;
  payoutBank: string;
  payoutAccountTitle: string;
  payoutReference: string;
  documents: Doc[];
};

type Fields = Omit<StepsInitial, "step" | "documents">;

const EMPTY: Fields = {
  fullName: "",
  phone: "",
  city: "",
  qualification: "",
  qualificationYear: "",
  institution: "",
  years: "",
  clinics: "",
  about: "",
  portfolioUrl: "",
  regBody: "",
  regNo: "",
  payoutBank: "",
  payoutAccountTitle: "",
  payoutReference: "",
};

const STEPS = ["Who you are", "Your qualification", "Documents", "Your photograph", "How you are paid"] as const;

const DOC_KINDS = [
  { value: "degree", label: "Degree" },
  { value: "attestation", label: "HEC attestation" },
  { value: "certificate", label: "Certificate" },
  { value: "id", label: "CNIC" },
  { value: "registration", label: "Registration" },
  { value: "other", label: "Other" },
] as const;

const DOC_ACCEPT = "application/pdf,image/jpeg,image/png,image/webp";
const PHOTO_ACCEPT = "image/jpeg,image/png,image/webp";
const MAX_BYTES = 10 * 1024 * 1024;

const primary =
  "inline-flex min-h-12 items-center justify-center rounded-full bg-brand-primary px-6 text-sm font-medium text-white disabled:opacity-50";
const secondary =
  "inline-flex min-h-12 items-center justify-center rounded-full border border-brand-border-light px-5 text-sm text-brand-ink hover:border-brand-primary disabled:opacity-50";

type Reply = { ok?: boolean; error?: string; documents?: Doc[]; path?: string; uploadToken?: string; kind?: string; name?: string };

export default function ApplicationSteps({
  token,
  email,
  kind,
  initial,
}: {
  token: string;
  email: string;
  kind: Kind;
  initial: StepsInitial | null;
}) {
  const [saved, setSaved] = useState(initial?.step ?? 1);
  const [step, setStep] = useState(initial?.step ?? 1);
  const [fields, setFields] = useState<Fields>(initial ? { ...EMPTY, ...initial } : EMPTY);
  const [docs, setDocs] = useState<Doc[]>(initial?.documents ?? []);
  const [terms, setTerms] = useState(Boolean(initial));
  const [docKind, setDocKind] = useState<string>(initial?.documents.some((d) => d.kind === "degree") ? "certificate" : "degree");
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const set = (k: keyof Fields) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setFields((f) => ({ ...f, [k]: e.target.value }));

  async function call(action: string, extra: Record<string, unknown> = {}): Promise<Reply> {
    const res = await fetch("/api/join/draft", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, action, ...extra }),
    });
    return (await res.json().catch(() => ({}))) as Reply;
  }

  async function save(action: string, extra: Record<string, unknown>, next: number) {
    setBusy(true);
    setError(null);
    try {
      const reply = await call(action, extra);
      if (!reply.ok) return setError(reply.error ?? "Something went wrong. Please try again.");
      if (next > 5) return setDone(true);
      setSaved((s) => Math.max(s, next));
      setStep(next);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      setError("Something went wrong. Please check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  async function upload(file: File | undefined, fileKind: string) {
    if (!file) return;
    setError(null);
    if (file.size > MAX_BYTES) return setError(`${file.name} is over 10 MB.`);
    setBusy(true);
    try {
      const ticket = await call("upload", { kind: fileKind, name: file.name, size: file.size, type: file.type });
      if (!ticket.ok || !ticket.path || !ticket.uploadToken) return setError(ticket.error ?? "Could not prepare the upload.");
      const { error: upError } = await createBrowserSupabaseClient()
        .storage.from("practitioner-docs")
        .uploadToSignedUrl(ticket.path, ticket.uploadToken, file, { contentType: file.type });
      if (upError) return setError("The upload did not finish. Please try again.");
      const recorded = await call("record", { path: ticket.path, kind: fileKind, name: file.name });
      if (!recorded.ok) return setError(recorded.error ?? "The file arrived but could not be recorded.");
      setDocs(recorded.documents ?? []);
      if (fileKind === "photo") setPhotoPreview(URL.createObjectURL(file));
      else if (fileKind === "degree") setDocKind("certificate");
    } catch {
      setError("Something went wrong. Please check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    setBusy(true);
    setError(null);
    const reply = await call("remove", { documentId: id }).catch(() => ({ ok: false }) as Reply);
    setBusy(false);
    if (!reply.ok) return setError(reply.error ?? "Could not remove the file.");
    setDocs(reply.documents ?? []);
  }

  if (done) {
    return (
      <div role="status" className="rounded-2xl bg-brand-purple-soft p-6">
        <h2 className="font-serif text-2xl italic text-brand-primary">Submitted</h2>
        <p className="mt-2 text-sm leading-relaxed text-brand-ink">
          Thank you. We read every application ourselves and reply within 3 working days, by email to {email}.
        </p>
      </div>
    );
  }

  const field = (k: keyof Fields, label: string, attrs: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <label className="block">
      <span className={formLabelClassName}>{label}</span>
      <input value={fields[k]} onChange={set(k)} className={formInputClassName} {...attrs} />
    </label>
  );

  const documents = docs.filter((d) => d.kind !== "photo");
  const photo = docs.find((d) => d.kind === "photo");

  return (
    <div className="space-y-5">
      <ol className="grid grid-cols-5 gap-1.5" aria-label="Application steps">
        {STEPS.map((label, i) => {
          const n = i + 1;
          const reachable = n <= saved;
          return (
            <li key={label}>
              <button
                type="button"
                disabled={!reachable || busy}
                onClick={() => setStep(n)}
                aria-current={n === step ? "step" : undefined}
                className="flex min-h-12 w-full flex-col items-start gap-1 text-left disabled:cursor-default"
              >
                <span className={`h-1.5 w-full rounded-full ${n <= saved ? "bg-brand-primary" : "bg-brand-lavender"}`} />
                <span className={`text-[11px] leading-tight sm:text-xs ${n === step ? "font-medium text-brand-primary" : "text-brand-gray"}`}>
                  <span className="sm:hidden">{n}</span>
                  <span className="hidden sm:inline">{label}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ol>

      <div className="space-y-5 rounded-2xl bg-brand-cream-card p-5 sm:p-6">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.12em] text-brand-accent">Step {step} of 5</p>
          <h2 className="mt-1 font-serif text-2xl italic text-brand-primary">{STEPS[step - 1]}</h2>
        </div>

        {step === 1 ? (
          <>
            <p className="text-sm text-brand-gray">
              Applying as <strong className="font-medium text-brand-ink">{email}</strong>. About 30 seconds.
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              {field("fullName", "Full name", { autoComplete: "name" })}
              {field("phone", "Phone (WhatsApp if you have it)", { autoComplete: "tel", inputMode: "tel" })}
              {field("city", "City", { autoComplete: "address-level2" })}
            </div>
            {!initial ? (
              <label className="flex min-h-12 items-start gap-3 rounded-xl border border-brand-lavender/60 bg-white px-4 py-3 text-sm leading-relaxed">
                <input type="checkbox" checked={terms} onChange={(e) => setTerms(e.target.checked)} className="mt-1 h-5 w-5 shrink-0" />
                <span>
                  The information and documents I send are accurate and mine. GlamRepairs may keep them to review my
                  application, and if I am not accepted they are deleted within 30 days. Nothing is saved until this box
                  is ticked.
                </span>
              </label>
            ) : null}
          </>
        ) : null}

        {step === 2 ? (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              {field("qualification", "Degree or qualification", { placeholder: "e.g. BSc Cosmetology" })}
              {field("institution", "Where you studied")}
              {field("qualificationYear", "Year you qualified", { inputMode: "numeric", maxLength: 4 })}
              {field("years", "Years practising", { inputMode: "numeric", maxLength: 2 })}
            </div>
            {kind === "doctor" ? (
              <div className="grid gap-4 sm:grid-cols-2">
                {field("regBody", "Registration body", { placeholder: "e.g. PMDC" })}
                {field("regNo", "Registration number")}
              </div>
            ) : null}
            <label className="block">
              <span className={formLabelClassName}>Clinics you have worked at (optional)</span>
              <textarea value={fields.clinics} onChange={set("clinics")} rows={2} maxLength={600} className={formInputClassName} />
            </label>
            <label className="block">
              <span className={formLabelClassName}>Your practice, in a few lines</span>
              <textarea value={fields.about} onChange={set("about")} rows={4} maxLength={2000} className={formInputClassName} />
            </label>
            {field("portfolioUrl", "Instagram or portfolio link (optional)", { inputMode: "url" })}
          </>
        ) : null}

        {step === 3 ? (
          <>
            <p className="text-sm leading-relaxed text-brand-ink">
              Your degree is the one we need. Add your HEC attestation if you have it, any certificates, and your CNIC.
              PDF, JPG, PNG or WebP, up to 10 MB each. Only the studio&apos;s administrator can open them.
            </p>
            {documents.length ? (
              <ul className="divide-y divide-brand-lavender/60 rounded-xl bg-white">
                {documents.map((d) => (
                  <li key={d.id} className="flex items-center justify-between gap-3 px-4 py-2 text-sm">
                    <span className="min-w-0 truncate text-brand-ink">
                      <span className="font-medium">{DOC_KINDS.find((k) => k.value === d.kind)?.label ?? "Document"}</span>
                      <span className="text-brand-gray"> · {d.name}</span>
                    </span>
                    <button type="button" className="min-h-12 shrink-0 px-2 text-brand-error-strong underline" disabled={busy} onClick={() => remove(d.id)}>
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
            <div className="flex flex-wrap items-end gap-3">
              <label className="block">
                <span className={formLabelClassName}>This file is</span>
                <select value={docKind} onChange={(e) => setDocKind(e.target.value)} className={`${formInputClassName} min-h-12`}>
                  {DOC_KINDS.map((k) => (
                    <option key={k.value} value={k.value}>
                      {k.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className={`${secondary} cursor-pointer`}>
                {busy ? "Uploading…" : "Choose file"}
                <input
                  type="file"
                  accept={DOC_ACCEPT}
                  className="sr-only"
                  disabled={busy}
                  onChange={(e) => {
                    void upload(e.target.files?.[0], docKind);
                    e.target.value = "";
                  }}
                />
              </label>
            </div>
          </>
        ) : null}

        {step === 4 ? (
          <div className="grid gap-5 sm:grid-cols-[auto_1fr]">
            <figure className="w-32">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/images/ayma-480.webp" alt="Example: Ayma Arif's profile photograph" className="h-40 w-32 rounded-xl object-cover" />
              <figcaption className="mt-1 text-xs text-brand-gray">A photograph like Ayma&apos;s</figcaption>
            </figure>
            <div className="space-y-3 text-sm leading-relaxed text-brand-ink">
              <p>Clients see it beside your name. What works:</p>
              <ul className="list-disc space-y-1 pl-5">
                <li>Your face clearly visible, looking at the camera</li>
                <li>A plain background and daylight</li>
                <li>No filters, no sunglasses, nobody else in the picture</li>
              </ul>
              {photo ? (
                <div className="flex items-center gap-3">
                  {photoPreview ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={photoPreview} alt="Your photograph" className="h-20 w-16 rounded-lg object-cover" />
                  ) : null}
                  <span className="text-brand-gray">Added: {photo.name}</span>
                </div>
              ) : null}
              <label className={`${secondary} cursor-pointer`}>
                {busy ? "Uploading…" : photo ? "Replace photograph" : "Choose photograph"}
                <input
                  type="file"
                  accept={PHOTO_ACCEPT}
                  className="sr-only"
                  disabled={busy}
                  onChange={(e) => {
                    void upload(e.target.files?.[0], "photo");
                    e.target.value = "";
                  }}
                />
              </label>
            </div>
          </div>
        ) : null}

        {step === 5 ? (
          <>
            <p className="text-sm leading-relaxed text-brand-ink">
              Paid monthly by bank transfer, by the 5th, for the month before. We need the bank and the name on the
              account. Please do not enter the account number here: we will confirm it with you directly before the first
              payment.
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              {field("payoutBank", "Bank", { placeholder: "e.g. Meezan Bank" })}
              {field("payoutAccountTitle", "Account title")}
              {field("payoutReference", "Last four digits of the account (optional)", { inputMode: "numeric", maxLength: 6 })}
            </div>
          </>
        ) : null}

        {error ? (
          <p role="alert" className="text-sm text-brand-error-strong">
            {error}
          </p>
        ) : null}

        <div className="flex flex-wrap items-center gap-3">
          {step > 1 ? (
            <button type="button" className={secondary} disabled={busy} onClick={() => setStep(step - 1)}>
              Back
            </button>
          ) : null}
          {step === 1 ? (
            <button
              type="button"
              className={primary}
              disabled={busy || !terms}
              onClick={() => save("who", { terms, fullName: fields.fullName, phone: fields.phone, city: fields.city }, 2)}
            >
              {busy ? "Saving…" : "Save and continue"}
            </button>
          ) : null}
          {step === 2 ? (
            <button
              type="button"
              className={primary}
              disabled={busy}
              onClick={() =>
                save(
                  "qualification",
                  {
                    qualification: fields.qualification,
                    institution: fields.institution,
                    qualificationYear: fields.qualificationYear,
                    years: fields.years,
                    clinics: fields.clinics,
                    about: fields.about,
                    portfolioUrl: fields.portfolioUrl,
                    regBody: fields.regBody,
                    regNo: fields.regNo,
                  },
                  3,
                )
              }
            >
              {busy ? "Saving…" : "Save and continue"}
            </button>
          ) : null}
          {step === 3 ? (
            <button type="button" className={primary} disabled={busy || !documents.some((d) => d.kind === "degree")} onClick={() => save("documents", {}, 4)}>
              Continue
            </button>
          ) : null}
          {step === 4 ? (
            <button type="button" className={primary} disabled={busy || !photo} onClick={() => save("photo", {}, 5)}>
              Continue
            </button>
          ) : null}
          {step === 5 ? (
            <button
              type="button"
              className={primary}
              disabled={busy}
              onClick={() =>
                save(
                  "submit",
                  { payoutBank: fields.payoutBank, payoutAccountTitle: fields.payoutAccountTitle, payoutReference: fields.payoutReference },
                  6,
                )
              }
            >
              {busy ? "Submitting…" : "Submit application"}
            </button>
          ) : null}
        </div>
        <p className="text-xs text-brand-gray">Saved after every step. Your invitation link brings you back here.</p>
      </div>
    </div>
  );
}
