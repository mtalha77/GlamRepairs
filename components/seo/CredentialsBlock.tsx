import Link from "next/link";
import { getAuthor } from "@/lib/seo/authors";

/**
 * The credentials block — HOTFIX-6 §1.
 *
 * One component, rendered identically everywhere (/about, /authors/[slug],
 * every blog byline, the plan-selection/checkout step) instead of five
 * hand-typed copies drifting apart. `lib/seo/authors.ts` is the single
 * source of truth; extend the author record there, never hardcode a
 * credential string in a page.
 *
 * ── The copy rules are HANDOVER-11 §2's, applied here at last ────────────
 * /about's CredentialsCard has carried three copy rules since it was built.
 * Two of them were never applied to THIS component, which is the one that
 * renders on every blog byline, /authors/[slug] and the checkout step — so
 * the site followed its own rules on one surface and broke them on five.
 * HOTFIX-25 §2.2 fixed that. Rule 1 (the degree stands alone) is at the
 * degree line below; Rule 2 (no platform next to the issuer) is in
 * lib/seo/authors.ts where `continuingEducation` is built. Rule 3
 * ("Membership No.", never "Certificate No.") was already correct here.
 *
 * ── Why every line is here, including the disclaimer ─────────────────────
 * An AI search engine flagged this site for unclear credentials. The HEC
 * attestation line is the load-bearing one — an official Government of
 * Pakistan verification the degree is genuine — so it gets its own visual
 * weight (`font-medium`), not just another list item. The IDS line is
 * deliberately "Member" / "Membership No.", never "Certified" — see the
 * warning in lib/seo/authors.ts. Continuing education names the actual
 * course and awarding university rather than a vague category, because a
 * named Duke University specialization is evidence and "continuing education
 * in telehealth" is not. And the closing disclaimer is not a hedge:
 * stating the scope limit plainly is the fix for the ambiguity that got this
 * site flagged in the first place. Do not shorten it away.
 */
export default function CredentialsBlock({
  slug = "ayma-arif",
  compact = false,
  showProfileLink = true,
  className = "",
}: {
  slug?: string;
  compact?: boolean;
  /** Hide the "View full profile" link — set false when already on that profile page. */
  showProfileLink?: boolean;
  className?: string;
}) {
  const author = getAuthor(slug);
  if (!author) return null;

  const bodyText = compact ? "text-xs" : "text-sm";
  const headingText = compact ? "text-sm" : "text-base";

  return (
    <div className={`space-y-1.5 ${bodyText} leading-relaxed ${className}`}>
      <p className={`${headingText} font-semibold text-brand-primary`}>
        {author.name} — {author.title}
      </p>
      {/*
        HOTFIX-25 §2.2 — the degree stands alone. No institution appended.

        This is HANDOVER-11 §2 Rule 1, which /about's CredentialsCard has
        followed since it was built while this component — the one every
        blog byline, /authors/[slug] and the checkout step render through —
        kept appending ", King Faisal University". So the site stated the
        rule and then broke it on more surfaces than it kept it.

        The reason is worth keeping: crammed onto one line, the awarding
        university and the HEC that attested the degree read as two
        competing issuers, which weakens the attestation — the one
        independently checkable claim here. `institution` is unchanged in
        the data and still feeds `recognizedBy` on the Person node and
        /credentials, where there is room to explain the difference.
      */}
      <p className="text-brand-ink">{author.credentials}</p>
      {author.hecReference ? (
        <p className="font-medium text-brand-ink">
          Degree attested by the Higher Education Commission of Pakistan —
          Ref. {author.hecReference}
        </p>
      ) : null}
      {author.memberOf ? (
        <p className="text-brand-gray">
          Member, {author.memberOf.name}
          {author.memberOf.membershipNo
            ? ` (Membership No. ${author.memberOf.membershipNo})`
            : ""}
        </p>
      ) : null}
      {author.continuingEducation?.map((item) => (
        <p key={item} className="text-brand-gray">
          {item}
        </p>
      ))}
      {author.scopeDisclaimer ? (
        <p className="pt-1 text-xs italic text-brand-gray">
          {author.scopeDisclaimer}
        </p>
      ) : null}
      {!compact && showProfileLink ? (
        <p className="flex flex-wrap gap-x-4 gap-y-1 pt-1">
          <Link
            href={`/authors/${author.slug}`}
            className="text-xs font-medium underline underline-offset-2 text-brand-primary"
          >
            View full profile
          </Link>
          <Link
            href="/credentials"
            className="text-xs font-medium underline underline-offset-2 text-brand-primary"
          >
            Verify these credentials
          </Link>
          {/* An outbound link to a real, named profile. Reads as a person a
              visitor can look up rather than a name on a page — and it is the
              same URL carried in the Person node's `sameAs`, so the visible
              claim and the structured one cannot diverge. */}
          {author.profiles?.map((profile) => (
            <a
              key={profile.url}
              href={profile.url}
              target="_blank"
              rel="me noopener noreferrer"
              className="text-xs font-medium underline underline-offset-2 text-brand-primary"
            >
              {profile.label}
            </a>
          ))}
        </p>
      ) : null}
    </div>
  );
}
