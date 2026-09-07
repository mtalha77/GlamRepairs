import type { Metadata } from "next";
import Link from "next/link";
import Footer from "@/components/home/Footer";
import JsonLd from "@/components/seo/JsonLd";
import { AUTHORS } from "@/lib/seo/authors";
import { breadcrumbSchema, graph } from "@/lib/seo/schema";

/**
 * HOTFIX-6 §2 — verifiable qualifications.
 *
 * The problem this page answers: every claim about Glam Repairs currently
 * comes from Glam Repairs. Nothing is independently checkable. This page
 * lists exactly what is confirmed, who issued it, and the reference a
 * visitor (or an AI crawler) can use to check it themselves.
 *
 * ── IDS is a membership, never a certification ───────────────────────────
 * International Dermoscopy Society membership is free and open — 16,000+
 * members across 160+ countries. It certifies no competence or training.
 * Labeling it "Certificate No." next to an HEC-attested degree would invite
 * the reader to read a free membership as an earned clinical certification,
 * which discredits the genuinely valuable HEC reference sitting beside it.
 * Always "Member" / "Membership No." here.
 *
 * ── The HEC certificate is a known follow-up, not a gap papered over ─────
 * HEC's e-Attestation certificates are blockchain-secured and verifiable by
 * any institution or employer — the reference number alone is a claim, the
 * certificate is evidence. Talha is supplying the redacted certificate
 * (CNIC, DOB, home address and signature removed) separately; the "Notes"
 * cell says so plainly rather than linking to a document that doesn't exist
 * yet. Update it to link the hosted PDF/image once that file lands.
 */
const ayma = AUTHORS["ayma-arif"];

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
              <tr className="border-b border-black/10 align-top">
                <td className="px-4 py-4 font-medium text-black/85">
                  BS Cosmetology &amp; Dermatology Science
                  <br />
                  <span className="font-normal text-black/55">
                    degree attested
                  </span>
                </td>
                <td className="px-4 py-4 text-black/70">
                  Higher Education Commission of Pakistan (HEC)
                </td>
                <td className="px-4 py-4 font-mono text-xs text-black/70">
                  HEC Attestation Reference No.
                  <br />
                  {ayma.hecReference}
                </td>
                <td className="px-4 py-4 text-black/65">
                  The strongest verification on this page — an official
                  Government of Pakistan confirmation the degree is genuine.
                  A redacted copy of the e-Attestation certificate will be
                  published here as a downloadable PDF; until then, this
                  reference number can be quoted when asking HEC to confirm
                  it directly.
                </td>
              </tr>
              <tr className="align-top">
                <td className="px-4 py-4 font-medium text-black/85">
                  Membership
                </td>
                <td className="px-4 py-4 text-black/70">
                  {ayma.memberOf?.name}
                </td>
                <td className="px-4 py-4 font-mono text-xs text-black/70">
                  Membership No.
                  <br />
                  {ayma.memberOf?.membershipNo}
                </td>
                <td className="px-4 py-4 text-black/65">
                  A professional interest society (16,000+ members across
                  160+ countries) — open membership, not a competence
                  credential. Listed for transparency, not as proof of
                  clinical certification.
                </td>
              </tr>
            </tbody>
          </table>
        </div>

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
