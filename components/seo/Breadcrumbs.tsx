import Link from "next/link";

export type Crumb = {
  name: string;
  /** Site-relative, leading slash, e.g. "/blog". */
  path: string;
};

/**
 * The VISIBLE breadcrumb trail. Its markup counterpart stays in the page's
 * own `@graph`, from the same array — see "One array" below.
 *
 * ── Why this exists — HOTFIX-25 §1.2 ─────────────────────────────────────
 * The brief asks for breadcrumbs on blog posts "with BreadcrumbList". The
 * markup was already there, on eleven surfaces — what was missing was the
 * breadcrumb itself. A post rendered a single "Skin, explained" back-link
 * and separately emitted a three-level Home › Blog › Title BreadcrumbList.
 *
 * That gap is the actual defect, not a cosmetic one. Google's structured
 * data policy requires markup to describe content that is visible on the
 * page; a BreadcrumbList describing a trail no reader can see is markup
 * with no corresponding page feature, and is eligible to be ignored. So
 * the three-level trail was being emitted and earning nothing.
 *
 * ── One array ────────────────────────────────────────────────────────────
 * This component renders no JSON-LD of its own, deliberately. `graph()`
 * exists so a page ships one script tag rather than five, and a second
 * <JsonLd> here would undo that on every page that used it.
 *
 * Instead the page declares the trail ONCE as a local and passes the same
 * variable to both consumers:
 *
 *     const trail = [
 *       { name: "Home", path: "/" },
 *       { name: "Skin, explained", path: "/blog" },
 *       { name: post.title, path: `/blog/${post.slug}` },
 *     ];
 *     <JsonLd data={graph(article, breadcrumbSchema(trail))} />
 *     <Breadcrumbs trail={trail} />
 *
 * That is not a convention to remember — it is one variable, so the
 * visible trail and the markup cannot disagree. Two hand-written copies
 * of a hierarchy drift the first time a section is renamed, and the copy
 * that drifts silently is always the markup, because nobody reads it.
 *
 * ── Where this is used, and where it deliberately is not ─────────────────
 * Only on the routes with real depth: /blog/[slug], /authors/[slug],
 * /air-quality/[city], and the two section roots above them.
 *
 * The flat pages (/about, /compare, /credentials, /sample-assessment,
 * /terms, /privacy, /editorial-policy) are all direct children of Home. A
 * visible "Home › Terms" tells a reader nothing they cannot see from the
 * site header two centimetres above it, and Google does not show a
 * one-level breadcrumb either. Those pages keep their existing
 * `breadcrumbSchema` call and gain no visible trail.
 *
 * ── The last crumb ───────────────────────────────────────────────────────
 * Rendered as text, not a link, and marked `aria-current="page"`. It is the
 * page you are already on. It still appears in the BreadcrumbList with its
 * own `item` URL, which is what Google expects for the final position.
 */
export default function Breadcrumbs({
  trail,
  className = "text-black/50",
}: {
  /** Root first, current page last. Two or more entries. */
  trail: Crumb[];
  /**
   * Replaces the default trail colour as well as adding spacing, so a page
   * on a different palette can pass its own. The base keeps only `text-sm`
   * for exactly this reason: if the default colour lived there, a caller
   * passing `text-brand-gray` would be fighting `text-black/50` on
   * specificity rather than replacing it, and which one won would depend on
   * their order in the generated stylesheet — not on the order here.
   */
  className?: string;
}) {
  const last = trail.length - 1;

  return (
    <nav aria-label="Breadcrumb" className={`text-sm ${className}`.trim()}>
      <ol className="flex flex-wrap items-center gap-x-2">
        {trail.map((crumb, i) => (
          <li key={crumb.path} className="flex items-center gap-x-2">
            {i > 0 ? (
              <span aria-hidden className="text-black/25">
                /
              </span>
            ) : null}
            {i === last ? (
              /*
               * `line-clamp-1` because the last crumb on a post is the
               * post title, which can be sixty characters. Wrapping a
               * breadcrumb onto three lines above the h1 looks broken,
               * and the title is about to be repeated in full as the h1
               * immediately below, so nothing is lost by truncating it.
               */
              <span aria-current="page" className="line-clamp-1 text-black/70">
                {crumb.name}
              </span>
            ) : (
              <Link
                href={crumb.path}
                className="inline-flex min-h-11 min-w-11 items-center rounded underline decoration-black/20 underline-offset-2 transition-colors hover:text-brand-primary hover:decoration-brand-primary/40"
              >
                {crumb.name}
              </Link>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
