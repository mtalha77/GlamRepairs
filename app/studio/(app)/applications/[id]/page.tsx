import Link from "next/link";
import { notFound } from "next/navigation";

import {
  ApplicationDecision,
  DocumentVerifyToggle,
  ResendSignInButton,
} from "@/components/studio/applications/ApplicationControls";
import { DOCUMENT_KIND_LABEL, getApplication, OPEN_STATUSES, STATUS_LABEL } from "@/lib/practitioners/applications";
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
  const { app, documents, profile } = data;
  const open = OPEN_STATUSES.includes(app.status);

  return (
    <div className="space-y-6">
      <div>
        <Link href="/studio/applications" className="text-sm text-brand-primary underline underline-offset-2">
          ← Applications
        </Link>
        <h1 className="mt-2 font-serif text-2xl text-brand-primary">{app.full_name}</h1>
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
          <Row label="Agreed to terms" value={app.agreed_at ? formatStudioDateTime(app.agreed_at) : "No"} />
          <Row label="Decision note" value={app.decision_note} />
        </dl>
      </section>

      <section className={card} aria-labelledby="docs-heading">
        <h2 id="docs-heading" className="font-serif text-xl text-brand-primary">
          Documents
        </h2>
        <p className="mt-1 text-sm text-brand-gray">Links expire after 10 minutes; reload the page for fresh ones.</p>
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
                      Open
                    </a>
                  ) : (
                    <span className="text-brand-error-strong">File missing</span>
                  )}
                  <DocumentVerifyToggle id={d.id} applicationId={app.id} verified={d.verified} />
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {open ? (
        <section className={card} aria-labelledby="decide-heading">
          <h2 id="decide-heading" className="font-serif text-xl text-brand-primary">
            Decide
          </h2>
          <div className="mt-4">
            <ApplicationDecision
              id={app.id}
              status={app.status}
              documentCount={documents.length}
              verifiedCount={documents.filter((d) => d.verified).length}
            />
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
