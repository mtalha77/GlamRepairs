import Link from "next/link";
import type { Author } from "@/lib/seo/authors";
import CredentialsBlock from "@/components/seo/CredentialsBlock";

/**
 * Byline + "Medically reviewed by" block.
 *
 * ── Why the dates are visible, not just in the markup ────────────────────────
 * Google's raters, and every AI engine that decides what to cite, look for a
 * named author with a linked bio, a named reviewer, and explicit publish /
 * update dates that a *human* can see on the page. Putting them only in
 * JSON-LD is a common half-measure that gets no credit.
 *
 * The reviewer line is the part most sites skip. On YMYL content it is the
 * difference between "someone wrote this" and "someone qualified stands behind
 * it" — and it is the single fastest E-E-A-T improvement available.
 */
function fmt(date: string) {
  return new Date(date).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default function AuthorByline({
  author,
  reviewer,
  datePublished,
  reviewedAt,
}: {
  author: Author;
  reviewer?: Author;
  datePublished: string;
  /**
   * Handover 73 Part 1.2: studio_blog_posts.reviewed_at, the date the review
   * happened. Not updated_at: an edit is not a review.
   */
  reviewedAt?: string | null;
  /** Accepted for older callers; the review date is what is shown. */
  dateModified?: string;
}) {
  return (
    <div className="flex flex-col gap-3 border-y border-black/10 py-5 text-sm">
      <div className="flex items-center gap-3">
        {author.photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={author.photo}
            alt=""
            width={44}
            height={44}
            className="h-11 w-11 rounded-full object-cover"
          />
        ) : null}
        <div className="leading-snug">
          {/*
            Handover 73 Part 1. The name in `data-byline-author` must equal
            the schema author's name; scripts/check-byline.mjs asserts it on
            every published post after each deploy.
          */}
          <p>
            <span className="text-black/55">Written by </span>
            <Link
              href={`/authors/${author.slug}`}
              data-byline-author
              className="font-semibold underline underline-offset-2"
            >
              {author.name}
            </Link>
            <span className="text-black/55">, {author.title}</span>
          </p>
          <p className="mt-0.5 text-black/55">
            {reviewer && reviewedAt ? (
              <>
                Reviewed by{" "}
                <Link
                  href={`/authors/${reviewer.slug}`}
                  data-byline-reviewer
                  className="font-medium text-black/75 underline underline-offset-2"
                >
                  {reviewer.name}
                </Link>{" "}
                on <time dateTime={reviewedAt}>{fmt(reviewedAt)}</time>
                {" · "}
              </>
            ) : null}
            <time dateTime={datePublished}>Published {fmt(datePublished)}</time>
          </p>
        </div>
      </div>

      {/* HOTFIX-6 §1 — full credentials block, identical to /about and
          /authors/[slug]. Compact spacing for the in-article byline. */}
      <CredentialsBlock slug={author.slug} compact showProfileLink={false} />
      <p className="text-xs">
        <Link
          href={`/authors/${author.slug}`}
          className="font-medium underline underline-offset-2 text-black/55"
        >
          View full profile
        </Link>
      </p>

      <p className="text-xs text-black/45">
        This article is general information, not a diagnosis or a substitute for
        individual medical advice. If a skin concern is painful, spreading,
        changing shape or not responding to care, see a doctor.
      </p>
    </div>
  );
}
