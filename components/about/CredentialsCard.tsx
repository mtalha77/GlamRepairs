import Image from "next/image";
import Link from "next/link";
import { getAuthor } from "@/lib/seo/authors";
import { getCredential } from "@/lib/seo/site";

/**
 * HANDOVER-11 §2 — the credentials card on /about.
 *
 * Replaces a flat stack of sentences (`CredentialsBlock`) that had no
 * hierarchy: five lines of equal weight, so the HEC attestation — the one
 * independently checkable thing on the page — read no louder than the rest.
 * Three bands give it somewhere to sit: who this is, what they hold, and
 * what the limits are.
 *
 * ── Copy rules, all three deliberate ─────────────────────────────────────
 * 1. No "King Faisal University". The degree line stands alone here. The
 *    awarding institution is on /credentials and in the Person schema,
 *    where there is room to explain the difference between the university
 *    that awarded it and the HEC that attested it. Crammed into a card row
 *    it just reads as two competing issuers.
 * 2. No "completed coursework" around Duke University. The row's shape —
 *    a course title above a university name — already says what it is, and
 *    /credentials carries the full "coursework, not a licence" note.
 * 3. "Membership No.", never "Certificate No." IDS membership is free and
 *    open. Labelling it as a certificate next to an HEC-attested degree
 *    invites the reader to take a free membership for an earned clinical
 *    certification, which discredits the attestation beside it.
 *
 * The strings themselves come from `CREDENTIALS` in lib/seo/site.ts, so a
 * reference number can never say one thing here and another on
 * /credentials. Only the *framing* differs between the two surfaces.
 *
 * Colours are Tailwind theme tokens throughout (see app/globals.css) rather
 * than the hex values in the preview mock, so the card follows the theme.
 */
const ayma = getAuthor("ayma-arif");
const HEC = getCredential("hec-degree");
const IDS = getCredential("ids-membership");
const TELEHEALTH = getCredential("duke-telehealth");

/* ── Icons ───────────────────────────────────────────────────────────────
   Inline rather than files: four 20px glyphs at one call site each, where a
   sprite or four more requests in /public would cost more than it saves. */

function GraduationIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"
      strokeLinecap="round" strokeLinejoin="round" className="h-[1.15rem] w-[1.15rem]" aria-hidden>
      <path d="M22 10 12 5 2 10l10 5 10-5Z" />
      <path d="M6 12v5c0 1.1 2.7 2.5 6 2.5s6-1.4 6-2.5v-5" />
    </svg>
  );
}

function CheckCircleIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"
      strokeLinecap="round" strokeLinejoin="round" className="h-[1.15rem] w-[1.15rem]" aria-hidden>
      <circle cx="12" cy="12" r="9" />
      <path d="m8.5 12.2 2.4 2.4 4.6-4.9" />
    </svg>
  );
}

function BookIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"
      strokeLinecap="round" strokeLinejoin="round" className="h-[1.15rem] w-[1.15rem]" aria-hidden>
      <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H19v15H6.5A2.5 2.5 0 0 0 4 20.5Z" />
      <path d="M4 20.5A2.5 2.5 0 0 1 6.5 18H19v3H6.5A2.5 2.5 0 0 1 4 20.5Z" />
    </svg>
  );
}

function BadgeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"
      strokeLinecap="round" strokeLinejoin="round" className="h-[1.15rem] w-[1.15rem]" aria-hidden>
      <circle cx="12" cy="9" r="5.2" />
      <path d="M8.4 13.4 7 21l5-2.4L17 21l-1.4-7.6" />
    </svg>
  );
}

type Row = {
  icon: React.ReactNode;
  title: string;
  /** Plain sub-line. */
  sub?: string;
  /** Monospace reference chip — a number someone can quote back to the issuer. */
  chip?: string;
  verify?: { label: string; href: string };
};

const rows: Row[] = [
  {
    icon: <GraduationIcon />,
    // Rule 1: the degree stands alone — no institution appended.
    title: HEC?.name ?? "BS Cosmetology & Dermatology Science",
  },
  {
    icon: <CheckCircleIcon />,
    title: "Attested by the Higher Education Commission of Pakistan",
    chip: HEC?.reference,
  },
  {
    icon: <BookIcon />,
    // Rule 2: the university name alone, with no "completed coursework" gloss.
    title: TELEHEALTH?.name ?? "Telehealth: Essentials, Teamwork, and Dermatology",
    sub: TELEHEALTH?.issuer,
    ...(TELEHEALTH?.verifyUrl
      ? { verify: { label: "Verify", href: TELEHEALTH.verifyUrl } }
      : {}),
  },
  {
    icon: <BadgeIcon />,
    title: `Member, ${IDS?.issuer ?? "International Dermoscopy Society"}`,
    // Rule 3: "Membership No.", never "Certificate No."
    ...(IDS?.reference ? { sub: `Membership No. ${IDS.reference}` } : {}),
  },
];

export default function CredentialsCard() {
  if (!ayma) return null;

  return (
    <div className="overflow-hidden rounded-3xl border border-brand-lavender/70 bg-white text-left shadow-sm">
      {/* ── Band 1: who ─────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-4 bg-gradient-to-br from-brand-purple-soft via-brand-purple-tint to-white px-6 py-5 sm:px-7">
        {/* The gradient ring survives the photo swap: it is the padding on
            this wrapper, so the portrait sits inside it rather than
            replacing it. Photo in the circle only — never a large portrait
            elsewhere on the card. */}
        <span className="shrink-0 rounded-full bg-gradient-to-br from-brand-light to-brand-primary p-[2px]">
          <Image
            src="/images/ayma-480.webp"
            alt="Ayma Arif, Certified Aesthetics Practitioner"
            width={56}
            height={56}
            sizes="56px"
            className="h-14 w-14 rounded-full border-2 border-white object-cover"
          />
        </span>

        <div className="min-w-0">
          <p className="font-serif text-lg leading-tight text-brand-ink sm:text-xl">
            {ayma.name}
          </p>
          <p className="mt-0.5 text-sm font-medium text-brand-primary">
            {ayma.title}
          </p>
        </div>

        <span className="ml-auto inline-flex shrink-0 items-center gap-1.5 rounded-full bg-brand-success/12 px-3 py-1.5 text-xs font-medium text-brand-success-strong">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"
            strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5" aria-hidden>
            <path d="m5 12.5 4.2 4.2L19 7" />
          </svg>
          Credentials verified
        </span>
      </div>

      {/* ── Band 2: what ────────────────────────────────────────────────
          Two columns on desktop rather than a stack: four credentials in a
          single column made this card twice as tall as the prose above it,
          which is what made the old block feel like fine print. */}
      <div className="grid gap-x-6 gap-y-4 px-6 py-6 sm:grid-cols-2 sm:px-7">
        {rows.map((row) => (
          <div key={row.title} className="flex gap-3">
            <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-brand-purple-soft text-brand-primary">
              {row.icon}
            </span>
            <div className="min-w-0">
              <p className="text-sm font-medium leading-snug text-brand-ink">
                {row.title}
              </p>
              {row.sub ? (
                <p className="mt-1 text-xs leading-relaxed text-brand-gray">
                  {row.sub}
                  {row.verify ? (
                    <>
                      {" · "}
                      <a
                        href={row.verify.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium text-brand-primary underline underline-offset-2"
                      >
                        {row.verify.label}
                      </a>
                    </>
                  ) : null}
                </p>
              ) : null}
              {row.chip ? (
                <p className="mt-1.5 inline-block rounded-md bg-brand-surface px-2 py-1 font-mono text-[0.68rem] leading-none text-brand-gray">
                  {row.chip}
                </p>
              ) : null}
            </div>
          </div>
        ))}
      </div>

      {/* ── Band 3: the limits ──────────────────────────────────────────
          Not a hedge and not small print. An AI search engine flagged this
          site for being unclear whether these are medical credentials;
          stating the scope plainly is the fix. It stays verbatim. */}
      <div className="flex flex-col gap-4 border-t border-brand-lavender/50 bg-brand-cream-light px-6 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-7">
        <p className="max-w-xl text-xs leading-relaxed text-brand-gray">
          {ayma.scopeDisclaimer}
        </p>
        <div className="flex shrink-0 flex-wrap gap-2.5">
          <Link
            href="/credentials"
            className="rounded-full bg-brand-primary px-4 py-2 text-xs font-medium text-white transition-[background-color,transform] duration-150 hover:-translate-y-px hover:bg-brand-primary-dark"
          >
            Verify credentials
          </Link>
          <Link
            href={`/authors/${ayma.slug}`}
            className="rounded-full border border-brand-primary/35 px-4 py-2 text-xs font-medium text-brand-primary transition-[background-color,border-color,transform] duration-150 hover:-translate-y-px hover:border-brand-primary hover:bg-brand-purple-soft"
          >
            Full profile
          </Link>
        </div>
      </div>
    </div>
  );
}
