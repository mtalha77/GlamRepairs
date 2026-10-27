import Link from "next/link";
import { notFound } from "next/navigation";

import {
  ApplicationDecision,
  DocumentVerifyToggle,
  ResendSignInButton,
  SendAssessmentButton,
} from "@/components/studio/applications/ApplicationControls";
import { DOCUMENT_KIND_LABEL, getApplication, OPEN_STATUSES, STATUS_LABEL } from "@/lib/practitioners/applications";
import { studioAssessment, type StudioAttempt } from "@/lib/practitioners/assessment";
import { formatStudioDateTime } from "@/lib/studio/formatDate";
import { requireStudioMember } from "@/lib/studio/member";

/** One application — HANDOVER-51 §4.2. Super admin only. */

export const dynamic = "force-dynamic";

const card = "rounded-2xl border border-brand-lavender/70 bg-white p-5";

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  if (value === null || value === undefined || value === "") return null;
  return (
    <div className="grid gap-1 py-2 sm:grid-cols-[12rem_1fr]">
      <dt className="text-sm text-brand-gray">{label}</dt>
      <dd className="whitespace-pre-line text-sm text-brand-ink">{value}</dd>
    </div>
  );
}

/**
 * WhatsApp the applicant on their own number — spec 20 October §6.4. Not the
 * hiring number: this is us contacting them. Numbers come from everywhere
 * (the first applicant is Nigerian), so the country code is kept as typed
 * and nothing is ever prepended. A leading 00 is the international prefix;
 * a single leading 0 means no country code, which wa.me cannot open.
 */
function applicantWhatsApp(phone: string | null, fullName: string): { href: string | null; display: string } | null {
  if (!phone) return null;
  let digits = phone.replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.length < 8) return null;
  if (digits.startsWith("0")) return { href: null, display: phone };
  const first = fullName.trim().split(/\s+/)[0] ?? "";
  const text = `Hi ${first}, this is Glam Repairs about your practitioner application.`;
  return { href: `https://wa.me/${digits}?text=${encodeURIComponent(text)}`, display: phone };
}

function AssessmentResult({ attempt }: { attempt: StudioAttempt }) {
  if (attempt.state === "in_progress") {
    return <p className="text-sm text-brand-ink">Attempt {attempt.attemptNo} is in progress, started {formatStudioDateTime(attempt.startedAt)}.</p>;
  }
  if (attempt.state === "abandoned") {
    return <p className="text-sm text-brand-gray">Attempt {attempt.attemptNo}, started {formatStudioDateTime(attempt.startedAt)}, was closed without a result.</p>;
  }
  const flag = attempt.flagReason ? attempt.flagReason.charAt(0).toUpperCase() + attempt.flagReason.slice(1) : null;
  return (
    <div className="space-y-2 text-sm">
      <p className="font-medium text-brand-ink">
        Assessment{attempt.attemptNo > 1 ? `, attempt ${attempt.attemptNo}` : ""}: {attempt.score} of {attempt.maxScore}, {attempt.percent} percent.{" "}
        <span className={attempt.passed ? "text-brand-success-strong" : "text-brand-error-strong"}>
          {attempt.passed ? "Passed." : `Below the ${attempt.passMark} percent pass mark.`}
        </span>
      </p>
      <p className="text-brand-gray">
        {attempt.minutes !== null ? `Completed in ${attempt.minutes} ${attempt.minutes === 1 ? "minute" : "minutes"}. ` : ""}
        {attempt.blurEvents > 0 && !attempt.flagged ? `Left the tab ${attempt.blurEvents} ${attempt.blurEvents === 1 ? "time" : "times"}.` : ""}
      </p>
      {attempt.flagged && flag ? (
        <p className="rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-brand-ink">
          <span className="font-medium">Flagged for a closer look:</span> {flag} A flag is a reason to look, not a decision.
        </p>
      ) : null}
      {attempt.answers.length ? (
        <details className="rounded-xl border border-brand-lavender/60 px-3 py-2">
          <summary className="min-h-10 cursor-pointer py-2 text-brand-primary">See answers</summary>
          <ol className="mt-2 list-decimal space-y-3 pl-5">
            {attempt.answers.map((a, i) => (
              <li key={i}>
                <p className="text-brand-ink">{a.prompt}</p>
                <p className={a.right ? "text-brand-success-strong" : "text-brand-error-strong"}>
                  {a.right ? "Right: " : "Chose: "}
                  {a.chosen ?? "not answered"}
                </p>
                {!a.right ? <p className="text-brand-ink">Answer: {a.correct}</p> : null}
                <p className="text-xs text-brand-gray">{a.rationale}</p>
              </li>
            ))}
          </ol>
        </details>
      ) : null}
    </div>
  );
}

function size(bytes: number | null) {
  if (!bytes) return "";
  return bytes > 1_000_000 ? `${(bytes / 1_000_000).toFixed(1)} MB` : `${Math.round(bytes / 1000)} KB`;
}

export default async function ApplicationPage({ params }: { params: Promise<{ id: string }> }) {
  const { member } = await requireStudioMember();
  if (!member?.isSuperAdmin) notFound();
  const { id } = await params;
  const data = await getApplication(id);
  if (!data) notFound();
  const { app, documents, profile, revisions } = data;
  const open = OPEN_STATUSES.includes(app.status);
  const attempts = await studioAssessment(app.id);
  const whatsapp = applicantWhatsApp(app.phone, app.full_name);
  const verified = (kind: string) => documents.some((d) => d.kind === kind && d.verified);

  return (
    <div className="space-y-6">
      <div>
        <Link href="/studio/applications" className="text-sm text-brand-primary underline underline-offset-2">
          ← Applications
        </Link>
        <div className="mt-2 flex flex-wrap items-baseline gap-x-4 gap-y-1">
          <h1 className="font-serif text-2xl text-brand-primary">{app.full_name}</h1>
          {whatsapp?.href ? (
            <a
              href={whatsapp.href}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-12 items-center text-sm text-brand-primary underline underline-offset-2 hover:no-underline"
            >
              WhatsApp {whatsapp.display}
            </a>
          ) : whatsapp ? (
            <span className="text-sm text-brand-gray">{whatsapp.display} (no country code, so WhatsApp cannot open it)</span>
          ) : null}
        </div>
        <p className="mt-1 text-sm text-brand-gray">
          {STATUS_LABEL[app.status]} · applied {formatStudioDateTime(app.created_at)} ·{" "}
          {app.source === "invite" ? "invited" : app.source === "manual" ? "added by hand" : "apply page"}
          {app.kind === "doctor" ? " · doctor" : ""}
        </p>
      </div>

      <section className={card} aria-label="Application">
        <dl className="divide-y divide-brand-lavender/40">
          <Row label="Email" value={app.email} />
          <Row label="Phone" value={app.phone} />
          <Row label="City" value={app.city} />
          <Row label="Qualification" value={app.qualification} />
          <Row label="Studied at" value={[app.institution, app.qualification_year].filter(Boolean).join(", ") || null} />
          <Row label="Years of practice" value={app.years_experience != null ? String(app.years_experience) : null} />
          <Row label="Clinics" value={app.clinics} />
          <Row label="About" value={app.about} />
          <Row
            label="Portfolio"
            value={
              app.portfolio_url ? (
                <a href={app.portfolio_url} target="_blank" rel="noopener noreferrer nofollow" className="break-all text-brand-primary underline underline-offset-2">
                  {app.portfolio_url}
                </a>
              ) : null
            }
          />
          <Row label="Registration" value={app.reg_body ? `${app.reg_body} ${app.reg_no ?? ""}` : null} />
          <Row
            label="Payout"
            value={app.payout_bank ? `${app.payout_bank}, ${app.payout_account_title ?? ""}${app.payout_reference ? `, ending ${app.payout_reference}` : ""}` : null}
          />
          <Row label="Submitted" value={app.submitted_at ? formatStudioDateTime(app.submitted_at) : "Not yet (draft)"} />
          <Row label="Agreed to terms" value={app.agreed_at ? formatStudioDateTime(app.agreed_at) : "No"} />
          <Row label="Decision note" value={app.decision_note} />
        </dl>
      </section>

      <section className={card} aria-labelledby="docs-heading">
        <h2 id="docs-heading" className="font-serif text-xl text-brand-primary">
          Documents
        </h2>
        <p className="mt-1 text-sm text-brand-gray">Links expire after 10 minutes; reload the page for fresh ones.</p>
        {/* HANDOVER-59 Part 1.2 — a malicious PDF attacks the machine that
            opens it. The link opens the browser's own viewer, on the
            storage domain rather than ours; downloading and opening in a
            desktop reader is the risk. */}
        <p className="mt-1 text-sm text-brand-gray">
          Open documents in the browser only. Do not download a PDF and open it in Adobe Reader or another desktop app.
        </p>
        {documents.length === 0 ? (
          <p className="mt-3 text-sm text-brand-gray">No documents uploaded.</p>
        ) : (
          <ul className="mt-3 divide-y divide-brand-lavender/50">
            {documents.map((d) => (
              <li key={d.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
                <span>
                  <span className="font-medium text-brand-ink">{DOCUMENT_KIND_LABEL[d.kind]}</span>
                  <span className="text-brand-gray">
                    {" "}
                    · {d.originalName ?? "file"} {size(d.bytes) ? `· ${size(d.bytes)}` : ""}
                  </span>
                  {d.purgeAfter ? (
                    <span className="block text-xs text-brand-error-strong">Deleted after {formatStudioDateTime(d.purgeAfter)}</span>
                  ) : null}
                </span>
                <span className="flex items-center gap-3">
                  {d.url ? (
                    <a href={d.url} target="_blank" rel="noopener noreferrer" className="text-brand-primary underline underline-offset-2">
                      Open in browser
                    </a>
                  ) : d.scan === "clean" ? (
                    <span className="text-brand-error-strong">File missing</span>
                  ) : d.scan === "unchecked" || d.scan === "pending" ? (
                    <span className="text-brand-gray">Being checked</span>
                  ) : (
                    <span className="text-brand-error-strong">Failed the safety check, not opened</span>
                  )}
                  <DocumentVerifyToggle id={d.id} applicationId={app.id} verified={d.verified} />
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {revisions.length ? (
        <section className={card} aria-labelledby="revisions-heading">
          <h2 id="revisions-heading" className="font-serif text-xl text-brand-primary">
            Changes requested
          </h2>
          <ul className="mt-3 space-y-3 text-sm">
            {revisions.map((r) => (
              <li key={r.id} className="rounded-xl bg-brand-cream-card/60 px-3 py-2">
                <p className="whitespace-pre-line text-brand-ink">{r.message}</p>
                <p className="mt-1 text-xs text-brand-gray">
                  {formatStudioDateTime(r.requested_at)}
                  {r.fields.length ? ` · ${r.fields.join(", ")}` : ""} ·{" "}
                  {r.resolved_at ? `updated by them ${formatStudioDateTime(r.resolved_at)}` : "waiting for them"}
                </p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {open ? (
        <section className={card} aria-labelledby="decide-heading">
          <h2 id="decide-heading" className="font-serif text-xl text-brand-primary">
            Decide
          </h2>
          <div className="mt-4">
            <ApplicationDecision
              id={app.id}
              status={app.status}
              unverifiedCount={documents.filter((d) => !d.verified).length}
              degreeVerified={verified("degree")}
              photoVerified={verified("photo")}
            />
          </div>
        </section>
      ) : null}

      {app.status === "test_assessment" || attempts.length ? (
        <section className={card} aria-labelledby="assessment-heading">
          <h2 id="assessment-heading" className="font-serif text-xl text-brand-primary">
            Assessment
          </h2>
          <p className="mt-1 text-sm text-brand-gray">12 questions, 20 minutes, marked automatically. Flags are shown here and never decide anything.</p>
          <div className="mt-4 space-y-4">
            {attempts.map((t) => (
              <AssessmentResult key={t.id} attempt={t} />
            ))}
            {attempts.length === 0 && app.assessment_sent_at ? (
              <p className="text-sm text-brand-ink">Sent. They have not started it yet.</p>
            ) : null}
            {open && attempts.filter((t) => t.state === "submitted").length < 2 && !attempts.some((t) => t.state === "in_progress") ? (
              <SendAssessmentButton id={app.id} sentLabel={app.assessment_sent_at ? formatStudioDateTime(app.assessment_sent_at) : null} />
            ) : null}
          </div>
        </section>
      ) : null}

      {profile ? (
        <section className={card} aria-labelledby="profile-heading">
          <h2 id="profile-heading" className="font-serif text-xl text-brand-primary">
            Profile
          </h2>
          <ul className="mt-3 space-y-1 text-sm text-brand-ink">
            <li>Status: {profile.status} (not shown to clients until approved)</li>
            <li>Sign-in account: {profile.user_id ? "created" : "not yet"}</li>
            <li>Photograph: {profile.photo_url ? "added" : "missing"}</li>
            <li>Bio: {profile.bio && profile.bio.length > 80 ? "added" : "missing or under 80 characters"}</li>
          </ul>
          <div className="mt-4">
            <ResendSignInButton applicationId={app.id} />
          </div>
        </section>
      ) : null}
    </div>
  );
}
