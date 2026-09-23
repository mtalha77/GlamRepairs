import type { Metadata } from "next";
import Link from "next/link";
import JsonLd from "@/components/seo/JsonLd";
import { AUTHORS } from "@/lib/seo/authors";
import { breadcrumbSchema, graph } from "@/lib/seo/schema";
import {
  CREDENTIALS,
  credentialStatus,
  type Credential,
  canonicalOg,
} from "@/lib/seo/site";

/**
 * HOTFIX-6 §2, rebuilt to HOTFIX-36's design — verifiable qualifications.
 *
 * The problem this page answers: every claim about Glam Repairs comes from
 * Glam Repairs. Nothing is independently checkable. This page gives the
 * issuing body and the reference for each credential, so a visitor (or a
 * crawler) can confirm it without taking our word for anything.
 *
 * ── Why the table became cards ───────────────────────────────────────────
 * §2. A four-column table with a dense notes column is hard to read on a
 * phone, buries the reference numbers in a middle column, and gives an
 * open-membership society exactly the same visual weight as a government
 * attestation. The reference number in monospace on a tinted bar is the
 * move that matters: it makes the page read as a registry entry rather
 * than a marketing page, which is the entire reason the page exists.
 *
 * ── This page is still a renderer, not a document ────────────────────────
 * The cards come from `CREDENTIALS` in lib/seo/site.ts. Adding one is a
 * single object there, not markup here — and the status chip comes from
 * `credentialStatus(kind)` rather than being typed per card.
 *
 * That is deliberate, and it is the same reason the old label maps existed.
 * IDS membership is free and open and certifies no competence whatsoever.
 * A chip reading "Government verified" beside it, next to an HEC-attested
 * degree, would invite a reader to read a free membership as an earned
 * clinical certification — which discredits the genuinely valuable HEC
 * reference sitting above it. A membership cannot acquire the stronger
 * chip without editing `credentialStatus`, which is a visible, reviewable
 * change rather than a slip of the keyboard.
 *
 * ── What this page may NOT do any more — §2.3 ────────────────────────────
 * State the limit once, plainly, and then stop. No "what this is not" note
 * attached to each credential, no conceding a weakness the visitor has not
 * raised, and no opening a block by conceding. The scope panel is legally
 * necessary and stays. Everything beyond it reads as doubt, not honesty —
 * which is why the per-credential disclaimers that used to live in each
 * `note` are gone from the data as well as from here.
 *
 * ⚠️ The experience card carries NO caveat. Earlier drafts labelled it
 * "stated, not certified" and explained at length that it has no issuing
 * body. §2.1 removed that and it must not come back: the page argues the
 * credentials are real, and qualifying each one in turn argues the
 * opposite.
 */
const ayma = AUTHORS["ayma-arif"];

/* ── Icons. Inline, one path set each, so no runtime cost and no library. ── */

function SealIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-[22px] w-[22px]"
      aria-hidden
    >
      <path d="M22 10 12 5 2 10l10 5 10-5Z" />
      <path d="M6 12v5c0 1 2.7 2.5 6 2.5s6-1.5 6-2.5v-5" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-[22px] w-[22px]"
      aria-hidden
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

function GlobeIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-[22px] w-[22px]"
      aria-hidden
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M3.6 9h16.8M3.6 15h16.8" />
      <path d="M12 3a15 15 0 0 1 0 18a15 15 0 0 1 0-18Z" />
    </svg>
  );
}

function BookIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-[22px] w-[22px]"
      aria-hidden
    >
      <path d="M4 19V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v13" />
      <path d="M4 19h16" />
      <path d="M8 8h8M8 12h5" />
    </svg>
  );
}

const KIND_ICON = {
  degree: SealIcon,
  membership: GlobeIcon,
  course: BookIcon,
} as const;

/** What sits under the credential name. Never "Completed coursework" — §1.3. */
function subtitleFor(credential: Credential): string {
  if (credential.kind === "degree") {
    return `Degree, attested by the ${credential.issuer.replace(" (HEC)", "")}`;
  }
  if (credential.kind === "membership") return "Membership";
  return credential.issuer;
}

function Seal({ warm = false, children }: { warm?: boolean; children: React.ReactNode }) {
  return (
    <span
      className={`grid h-[46px] w-[46px] flex-none place-items-center rounded-xl border ${
        warm
          ? "border-[#f0e4c8] bg-brand-cream-card text-[#a3792a]"
          : "border-brand-lavender bg-brand-purple-soft text-brand-primary"
      }`}
    >
      {children}
    </span>
  );
}

function Chip({ warm = false, children }: { warm?: boolean; children: React.ReactNode }) {
  return (
    <span
      className={`flex-none rounded-full border px-[11px] py-[5px] text-[0.625rem] font-semibold uppercase tracking-[0.1em] ${
        warm
          ? "border-[#f0e4c8] bg-brand-cream-card text-[#8a6a1f]"
          : "border-[#bcdcc8] bg-[#eaf5ee] text-[#2f7d52]"
      }`}
    >
      {children}
    </span>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-[1.25rem] border border-brand-border-light bg-white shadow-[0_1px_2px_rgba(102,45,145,.05),0_14px_32px_-20px_rgba(102,45,145,.24)]">
      {children}
    </div>
  );
}

function CardHead({
  icon,
  title,
  subtitle,
  chip,
  warm = false,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  chip: string;
  warm?: boolean;
}) {
  return (
    <div className="flex flex-wrap items-start gap-4 px-6 pb-4 pt-[22px]">
      <Seal warm={warm}>{icon}</Seal>
      <div className="min-w-0 flex-1">
        <h2 className="font-serif text-[1.1875rem] font-semibold leading-tight text-brand-ink">
          {title}
        </h2>
        <p className="mt-[3px] text-[0.8125rem] text-[#8a8590]">{subtitle}</p>
      </div>
      <Chip warm={warm}>{chip}</Chip>
    </div>
  );
}

/**
 * The reference bar.
 *
 * Monospace on a cream ground, because a reference number set in body type
 * reads as decoration and set in mono reads as a record. That is the whole
 * argument of the page in one detail.
 */
function ReferenceBar({
  label,
  value,
  href,
  action,
}: {
  label: string;
  value: string;
  href?: string;
  action?: string;
}) {
  return (
    <div className="mx-6 flex flex-wrap items-center justify-between gap-3.5 rounded-xl border border-[#f0e4c8] bg-brand-cream-card px-3.5 py-[11px]">
      <div className="min-w-0">
        <p className="text-[0.6563rem] font-semibold uppercase tracking-[0.12em] text-[#8a8590]">
          {label}
        </p>
        <p className="break-all font-mono text-sm text-brand-ink">{value}</p>
      </div>
      {href && action ? (
        <a
          href={href}
          target="_blank"
          /*
            §3.6 — citations, not endorsements. `nofollow` so no equity
            passes to a society's homepage or a course platform, `noopener`
            because they open in a new tab. `noreferrer` is deliberately
            not added: these are links we are happy to be seen sending.
          */
          rel="nofollow noopener"
          className="whitespace-nowrap border-b border-brand-lavender pb-px text-[0.8125rem] font-medium text-brand-primary"
        >
          {action}
        </a>
      ) : null}
    </div>
  );
}

function CheckText({ label, children }: { label?: string; children: React.ReactNode }) {
  return (
    <p className="px-6 pt-3.5 text-[0.8438rem] leading-[1.75] text-brand-gray">
      <strong className="font-medium text-brand-ink">{label ?? "How to check it"}:</strong>{" "}
      {children}
    </p>
  );
}

function Aside({ lead, body }: { lead: string; body: string }) {
  return (
    <p className="mx-6 mb-[22px] mt-4 rounded-r-lg border-l-[3px] border-brand-lavender bg-[#fbfafc] px-4 py-[13px] text-[0.8125rem] leading-[1.7] text-brand-gray">
      <strong className="font-medium text-brand-ink">{lead}</strong> {body}
    </p>
  );
}

function CredentialCard({ credential }: { credential: Credential }) {
  const Icon = KIND_ICON[credential.kind];
  const referenceLabel =
    credential.referenceLabel ??
    (credential.kind === "membership" ? "Membership number" : "Certificate");

  return (
    <Card>
      <CardHead
        icon={<Icon />}
        title={credential.name}
        subtitle={subtitleFor(credential)}
        chip={credentialStatus(credential.kind)}
      />

      {credential.reference ? (
        <ReferenceBar
          label={referenceLabel}
          value={credential.reference}
          href={credential.verifyUrl}
          action={credential.verifyLabel}
        />
      ) : credential.verifyUrl ? (
        <ReferenceBar
          label={referenceLabel}
          value={
            credential.includes?.length
              ? `${credential.includes.length}-part specialisation`
              : "Verification link"
          }
          href={credential.verifyUrl}
          action={credential.verifyLabel}
        />
      ) : null}

      <CheckText label={credential.checkLabel}>{credential.check}</CheckText>

      {credential.aside ? (
        <Aside lead={credential.aside.lead} body={credential.aside.body} />
      ) : (
        <div className="pb-[22px]" />
      )}

      {credential.documentUrl ? (
        <p className="px-6 pb-[22px]">
          <a
            href={credential.documentUrl}
            target="_blank"
            rel="nofollow noopener"
            className="text-[0.8125rem] font-medium text-brand-primary underline underline-offset-2"
          >
            View the document
          </a>
        </p>
      ) : null}
    </Card>
  );
}

/**
 * Experience, as its own card — §2.1.
 *
 * Second in the order, not last, because it is what actually predicts
 * whether an assessment will be any good. It was previously a bare
 * sentence dropped below the table with no heading and no explanation of
 * why it mattered, which is exactly how it read: appended.
 */
function ExperienceCard() {
  return (
    <Card>
      <CardHead
        warm
        icon={<ClockIcon />}
        title={ayma.experience ?? ""}
        subtitle="Professional experience, before Glam Repairs"
        chip="Five years"
      />
      <p className="px-6 pt-3.5 text-[0.8438rem] leading-[1.75] text-brand-gray">
        Before Glam Repairs, {ayma.name.split(" ")[0]} spent five years
        assessing skin face to face in aesthetic clinics in Lahore. Several
        hundred faces a year, in the same climate and the same hard water.
      </p>
      <Aside
        lead="This is what makes a photograph readable."
        body="Recognising a pattern quickly comes from having seen it many times, in the conditions your skin actually lives in."
      />
    </Card>
  );
}

const TITLE = "Ayma Arif Credentials: HEC Attested, Verifiable";
/* §3.2 — 154 characters, inside the 150-160 target. The wording §3.2
   supplied measured 146, so "her" and "for" are added rather than the
   sentence being rebuilt. */
const DESCRIPTION =
  "Ayma Arif's credentials with issuing bodies and reference numbers, " +
  "including her HEC attestation, so you can verify every claim on this " +
  "site for yourself.";

export const metadata: Metadata = {
  /*
   * §3.3 — `absolute`, because the root template appends " | GlamRepairs"
   * and the point of this title is that it fits. "Credentials" carried
   * neither the practitioner's name nor any intent, and people search the
   * name.
   */
  title: { absolute: `${TITLE} | GlamRepairs` },
  description: DESCRIPTION,
  /*
   * §3.1/§3.2 — canonical, og:url, og:image AND the twitter block, all from
   * one call. Passing title and description through here is what stops
   * `twitter:` falling back to the homepage's, which is what it was doing.
   */
  ...canonicalOg("/credentials", {
    title: `${TITLE} | GlamRepairs`,
    description: DESCRIPTION,
    type: "profile",
  }),
};

export default function CredentialsPage() {
  const degrees = CREDENTIALS.filter((c) => c.kind === "degree");
  // §2.4 — degree, experience, society, coursework. Strongest first, and
  // experience second. CREDENTIALS already holds membership before course.
  const rest = CREDENTIALS.filter((c) => c.kind !== "degree");

  return (
    <>
      {/*
        §3.5 asked for the `Person` node with `hasCredential` and
        `hasOccupation` to be added here. It is NOT added here, because it
        is already on this page — and on every other route — from the
        site-wide entity graph in app/layout.tsx. Verified in the rendered
        output: the degree with its HEC identifier, the Duke course, and
        `hasOccupation` carrying the five years as an Occupation rather than
        a credential (HOTFIX-30 §2.2) all emit correctly today.

        Emitting it again from this page produced two Person nodes sharing
        one `@id` in the same document. Consumers merge them, so nothing
        breaks, but it is duplicate bytes on every request and a second
        place for the two copies to drift apart later. One entity, one
        node, declared once.
      */}
      <JsonLd
        data={graph(
          breadcrumbSchema([
            { name: "Home", path: "/" },
            { name: "Credentials", path: "/credentials" },
          ]),
        )}
      />
      <main className="mx-auto max-w-[55rem] px-6 pb-[90px] pt-8">
        <nav className="text-[0.8125rem] text-[#8a8590]">
          <Link href="/" className="text-brand-accent underline underline-offset-2">
            Home
          </Link>
          <span aria-hidden> / </span>
          <span>Credentials</span>
        </nav>

        <p className="gr-eyebrow mt-[34px]">Verification</p>
        <h1 className="mt-3 font-serif text-[1.75rem] font-semibold leading-[1.16] text-brand-ink sm:text-[2.25rem]">
          Every claim on this site,{" "}
          <em className="italic text-brand-primary">and how to check it</em>
        </h1>
        <p className="mt-3.5 max-w-[40rem] text-base leading-[1.8] text-brand-gray">
          Anyone can say they are qualified. This page gives you the issuing
          body and the reference number for each credential, so you can
          confirm it without taking our word for anything.
        </p>

        <div className="mt-[34px] grid gap-4">
          {degrees.map((credential) => (
            <CredentialCard key={credential.id} credential={credential} />
          ))}
          <ExperienceCard />
          {rest.map((credential) => (
            <CredentialCard key={credential.id} credential={credential} />
          ))}
        </div>

        {/*
          §2.2 — the scope block, stated once, with no editorialising.

          The licensing paragraph is deleted and must not return. The old
          block explained that Pakistan has no licensing body for this work
          and that nobody can be licensed in it. That reasoning is a rule
          for whoever writes copy, not something a visitor needs; it was
          appearing in several places; and on a page arguing the credentials
          are real it reads as a concession nobody asked for.
        */}
        <section className="mt-[34px] rounded-[1.25rem] border border-[#f0e4c8] bg-brand-cream-card px-7 py-[26px]">
          <h2 className="font-serif text-[1.1875rem] italic text-brand-primary">
            The scope of what we do
          </h2>
          <p className="mt-3 text-[0.9063rem] leading-[1.8] text-brand-gray">
            {ayma.name} is a {ayma.title}. Glam Repairs provides cosmetic
            skincare guidance and does not diagnose or treat medical
            conditions.
          </p>
          <p className="mt-3.5 border-t border-[#f0e4c8] pt-[13px] text-[0.8438rem] text-brand-gray">
            <strong className="font-medium text-brand-ink">
              If what you describe needs a doctor, we will tell you.
            </strong>
          </p>
        </section>

        <p className="mt-[26px] text-center text-[0.9063rem] leading-relaxed text-brand-gray">
          Want to check something we have not listed, or have a question about
          any of this?
          <br />
          Email{" "}
          <a
            href="mailto:glamrepairs@gmail.com"
            className="font-medium text-brand-primary underline underline-offset-2"
          >
            glamrepairs@gmail.com
          </a>
          {ayma.profiles?.length ? (
            <>
              , see{" "}
              {ayma.profiles.map((profile, i) => (
                <span key={profile.url}>
                  {i > 0 ? ", " : ""}
                  <a
                    href={profile.url}
                    target="_blank"
                    /* `rel="me"` stays: this one IS an identity claim. */
                    rel="me noopener"
                    className="font-medium text-brand-primary underline underline-offset-2"
                  >
                    {profile.label}
                  </a>
                </span>
              ))}
            </>
          ) : null}
          , or read{" "}
          <Link
            href={`/authors/${ayma.slug}`}
            className="font-medium text-brand-primary underline underline-offset-2"
          >
            {ayma.name.split(" ")[0]}&apos;s full profile
          </Link>
          .
        </p>

        {/*
          §4.1 — this page's own closing block, pointing at the sample
          rather than the funnel. Someone reading credentials is still
          deciding, and the honest next step for a reader weighing whether
          the person is any good is to read what she writes.
        */}
        <section className="mt-10 rounded-[1.25rem] border border-brand-border-light bg-white px-7 py-8 text-center shadow-[0_1px_2px_rgba(102,45,145,.05),0_18px_40px_-20px_rgba(102,45,145,.26)]">
          <h2 className="font-serif text-[1.4375rem] leading-snug text-brand-ink">
            See what she actually{" "}
            <em className="italic text-brand-primary">writes</em>
          </h2>
          <p className="mx-auto mt-2 max-w-[31rem] text-[0.9063rem] leading-relaxed text-brand-gray">
            Credentials tell you who is reading your photographs. A sample
            assessment tells you what you get for it.
          </p>
          <Link
            href="/sample-assessment"
            className="mt-5 inline-block rounded-full bg-brand-primary px-8 py-3.5 text-[0.9375rem] font-medium text-white shadow-[0_10px_24px_-10px_rgba(102,45,145,.6)] transition-transform hover:-translate-y-0.5"
          >
            Read a full assessment &rarr;
          </Link>
        </section>
      </main>
    </>
  );
}
