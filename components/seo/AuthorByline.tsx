import Link from "next/link";
import type { Author } from "@/lib/seo/authors";

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
  dateModified,
}: {
  author: Author;
  reviewer?: Author;
  datePublished: string;
  dateModified?: string;
}) {
  const updated = dateModified && dateModified !== datePublished;

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
          <p>
            <span className="text-black/55">Written by </span>
            <Link
              href={`/authors/${author.slug}`}
              className="font-semibold underline underline-offset-2"
            >
              {author.name}
            </Link>
            <span className="text-black/55">
              {" "}
              — {author.title}, {author.credentials}
            </span>
          </p>
          <p className="mt-0.5 text-black/55">
            <time dateTime={datePublished}>Published {fmt(datePublished)}</time>
            {updated ? (
              <>
                {" · "}
                <time dateTime={dateModified}>
                  Last reviewed {fmt(dateModified!)}
                </time>
              </>
            ) : null}
          </p>
        </div>
      </div>

      {reviewer ? (
        <p className="rounded-lg bg-black/[0.035] px-3 py-2 text-black/70">
          <span className="font-semibold text-black/80">
            Reviewed for accuracy by{" "}
          </span>
          <Link
            href={`/authors/${reviewer.slug}`}
            className="font-semibold underline underline-offset-2"
          >
            {reviewer.name}
          </Link>
          , {reviewer.credentials}.
        </p>
      ) : null}

      <p className="text-xs text-black/45">
        This article is general information, not a diagnosis or a substitute for
        individual medical advice. If a skin concern is painful, spreading,
        changing shape or not responding to care, see a doctor.
      </p>
    </div>
  );
}
