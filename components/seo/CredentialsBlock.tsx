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
 * ── Why every line is here, including the disclaimer ─────────────────────
 * An AI search engine flagged this site for unclear credentials. The HEC
 * attestation line is the load-bearing one — an official Government of
 * Pakistan verification the degree is genuine — so it gets its own visual
 * weight (`font-medium`), not just another list item. The IDS line is
 * deliberately "Member" / "Membership No.", never "Certified" — see the
 * warning in lib/seo/authors.ts. And the closing disclaimer is not a hedge:
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
      <p className="text-brand-ink">
        {author.credentials}
        {author.institution ? `, ${author.institution}` : ""}
      </p>
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
        <p className="pt-1">
          <Link
            href={`/authors/${author.slug}`}
            className="text-xs font-medium underline underline-offset-2 text-brand-primary"
          >
            View full profile
          </Link>
        </p>
      ) : null}
    </div>
  );
}
