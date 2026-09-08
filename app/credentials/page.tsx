import type { Metadata } from "next";
import Link from "next/link";
import Footer from "@/components/home/Footer";
import JsonLd from "@/components/seo/JsonLd";
import { AUTHORS } from "@/lib/seo/authors";
import { breadcrumbSchema, graph } from "@/lib/seo/schema";
import { CREDENTIALS, type Credential, type CredentialKind } from "@/lib/seo/site";

/**
 * HOTFIX-6 §2 — verifiable qualifications.
 *
 * The problem this page answers: every claim about Glam Repairs currently
 * comes from Glam Repairs. Nothing is independently checkable. This page
 * lists exactly what is confirmed, who issued it, and the reference a
 * visitor (or an AI crawler) can use to check it themselves.
 *
 * ── This page is a renderer, not a document ──────────────────────────────
 * The rows come from `CREDENTIALS` in lib/seo/site.ts. Adding a credential
 * is one object there, not markup here — and, more importantly, the *label
 * wording* is derived from the credential's `kind` by the two maps below
 * rather than typed per row.
 *
 * That is deliberate. IDS membership is free and open (16,000+ members
 * across 160+ countries) and certifies no competence whatsoever. Labelling
 * it "Certificate No." next to an HEC-attested degree would invite the
 * reader to read a free membership as an earned clinical certification,
 * which discredits the genuinely valuable HEC reference sitting beside it.
 * The same applies to completed coursework. So the word "certified" appears
 * nowhere in this file's rendering logic: a `membership` or `course` row
 * cannot be made to claim certification without changing the maps, which is
 * a visible, reviewable change rather than a slip of the keyboard.
 *
 * ── The HEC certificate is a known follow-up, not a gap papered over ─────
 * HEC's e-Attestation certificates are blockchain-secured and verifiable by
 * any institution or employer — the reference number alone is a claim, the
 * certificate is evidence. Talha is supplying the redacted certificate
 * (CNIC, DOB, home address and signature removed) separately; until it
 * lands the row's note says so plainly rather than linking to a document
 * that doesn't exist. Set `documentUrl` on the credential once it does.
 */
const ayma = AUTHORS["ayma-arif"];

/** What the row *is*. Never "Certification" for anything but a degree. */
const KIND_LABEL: Record<CredentialKind, string> = {
  degree: "Degree, attested",
  membership: "Membership",
  course: "Completed coursework",
};

/** What the reference number *is*. Never "Certificate No.". */
const KIND_REFERENCE_LABEL: Record<CredentialKind, string> = {
  degree: "Attestation reference",
  membership: "Membership No.",
  course: "Reference",
};

function CredentialRow({ credential }: { credential: Credential }) {
  const referenceLabel =
    credential.referenceLabel ?? KIND_REFERENCE_LABEL[credential.kind];

  return (
    <tr className="border-b border-black/10 align-top last:border-b-0">
      <td className="px-4 py-4 font-medium text-black/85">
        {credential.name}
        <br />
        <span className="font-normal text-black/55">
          {KIND_LABEL[credential.kind]}
        </span>
        {credential.includes?.length ? (
          <ul className="mt-2 list-disc space-y-0.5 pl-4 text-xs font-normal text-black/55">
            {credential.includes.map((course) => (
              <li key={course}>{course}</li>
            ))}
          </ul>
        ) : null}
      </td>
      <td className="px-4 py-4 text-black/70">
        {credential.issuer}
        {credential.platform ? (
          <>
            <br />
            <span className="text-black/50">via {credential.platform}</span>
          </>
        ) : null}
      </td>
      <td className="px-4 py-4 text-xs text-black/70">
        {credential.reference ? (
          <span className="font-mono">
            {referenceLabel}
            <br />
            {credential.reference}
          </span>
        ) : null}
        {credential.verifyUrl ? (
          <a
            href={credential.verifyUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={`${credential.reference ? "mt-2 " : ""}block underline underline-offset-2`}
          >
            Verify online
          </a>
        ) : null}
        {credential.documentUrl ? (
          <a
            href={credential.documentUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 block underline underline-offset-2"
          >
            View document
          </a>
        ) : null}
        {!credential.reference &&
        !credential.verifyUrl &&
        !credential.documentUrl ? (
          <span className="text-black/45">—</span>
        ) : null}
      </td>
      <td className="px-4 py-4 text-black/65">{credential.note}</td>
    </tr>
  );
}

export const metadata: Metadata = {
  title: "Credentials",
  description:
    "Ayma Arif's confirmed credentials — issuing body, reference number, and " +
    "how to verify each one.",
  alternates: { canonical: "/credentials" },
};

export default function CredentialsPage() {
  return (
    <>
      <JsonLd
        data={graph(
          breadcrumbSchema([
            { name: "Home", path: "/" },
            { name: "Credentials", path: "/credentials" },
          ]),
        )}
      />
      <main className="mx-auto max-w-3xl px-6 py-16 sm:py-20">
        <nav className="mb-10 text-sm text-black/50">
          <Link href="/" className="underline underline-offset-2">
            Home
          </Link>
          <span aria-hidden> / </span>
          <span>Credentials</span>
        </nav>

        <h1 className="font-[family-name:var(--font-playfair)] text-4xl text-brand-primary">
          Credentials
        </h1>
        <p className="mt-4 max-w-2xl text-lg leading-relaxed text-black/75">
          Every claim about {ayma.name} on this site should be checkable, not
          just stated. This page lists what&apos;s confirmed, who issued it, and
          the reference you can use to verify it yourself.
        </p>

        <div className="mt-10 overflow-x-auto rounded-2xl border border-black/10">
          <table className="w-full min-w-[640px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-black/10 bg-black/[0.03]">
                <th scope="col" className="px-4 py-3 font-semibold text-black/70">
                  Credential
                </th>
                <th scope="col" className="px-4 py-3 font-semibold text-black/70">
                  Issuing body
                </th>
                <th scope="col" className="px-4 py-3 font-semibold text-black/70">
                  Reference
                </th>
                <th scope="col" className="px-4 py-3 font-semibold text-black/70">
                  Notes
                </th>
              </tr>
            </thead>
            <tbody>
              {CREDENTIALS.map((credential) => (
                <CredentialRow key={credential.id} credential={credential} />
              ))}
            </tbody>
          </table>
        </div>

        {ayma.profiles?.length ? (
          <p className="mt-8 text-sm text-black/65">
            You can also check who {ayma.name.split(" ")[0]} is directly:{" "}
            {ayma.profiles.map((profile, i) => (
              <span key={profile.url}>
                {i > 0 ? ", " : ""}
                <a
                  href={profile.url}
                  target="_blank"
                  rel="me noopener noreferrer"
                  className="underline underline-offset-2"
                >
                  {profile.label}
                </a>
              </span>
            ))}
            .
          </p>
        ) : null}

        {ayma.scopeDisclaimer ? (
          <p className="mt-8 rounded-xl bg-black/[0.035] px-5 py-4 text-sm text-black/70">
            {ayma.scopeDisclaimer}
          </p>
        ) : null}

        <p className="mt-6 text-sm text-black/55">
          Want to verify any of this directly, or have a question about a
          credential? Email{" "}
          <a
            href="mailto:glamrepairs@gmail.com"
            className="underline underline-offset-2"
          >
            glamrepairs@gmail.com
          </a>
          .
        </p>

        <p className="mt-10">
          <Link
            href={`/authors/${ayma.slug}`}
            className="text-sm font-medium underline underline-offset-2 text-brand-primary"
          >
            View {ayma.name}&apos;s full profile
          </Link>
        </p>
      </main>
      <Footer />
    </>
  );
}
