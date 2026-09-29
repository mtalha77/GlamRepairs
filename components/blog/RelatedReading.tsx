import Link from "next/link";
import { listPublishedPosts } from "@/lib/studio/blog";

/**
 * HANDOVER-22 §8 raised this from 2 to 3, matching the cap the studio
 * editor enforces on `related_slugs`.
 */
const MAX_RELATED = 3;

/**
 * HOTFIX-10 §1c — cross-links between posts.
 * HANDOVER-22 §8 — the editor's own choices come first.
 *
 * ── Why the fallback stays ───────────────────────────────────────────────
 * §8 adds `related_slugs`, chosen per post in the studio. It does NOT
 * replace the query: a post nobody has curated yet, or one whose chosen
 * partners have since been unpublished, must still cross-link. So the
 * order is: the editor's picks, in their order, then same-cluster posts,
 * then the most recent — deduplicated, capped at three.
 *
 * Chosen slugs are resolved against the *published* list rather than
 * fetched directly, which is what makes an unpublished or deleted pick a
 * silently skipped entry instead of a dead link. That is also why
 * `related_slugs` carries no foreign key: unpublishing one post must never
 * fail a save on another.
 *
 * Renders nothing when there is no other published post, so a single-post
 * blog never shows an empty "Related reading" heading.
 */
export default async function RelatedReading({
  currentSlug,
  cluster,
  relatedSlugs = [],
}: {
  currentSlug: string;
  cluster: string | null;
  relatedSlugs?: string[];
}) {
  const others = (await listPublishedPosts()).filter(
    (post) => post.slug !== currentSlug,
  );
  if (others.length === 0) return null;

  const bySlug = new Map(others.map((post) => [post.slug, post]));

  const chosen = relatedSlugs
    .map((slug) => bySlug.get(slug))
    .filter((post) => post !== undefined);

  const ranked: typeof others = [];
  const seen = new Set<string>();
  for (const post of [
    ...chosen,
    ...others.filter((post) => cluster && post.cluster === cluster),
    ...others,
  ]) {
    if (seen.has(post.slug)) continue;
    seen.add(post.slug);
    ranked.push(post);
    if (ranked.length === MAX_RELATED) break;
  }

  return (
    <section className="mt-14 border-t border-black/10 pt-8">
      <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-black/45">
        Related reading
      </h2>
      {/*
       * HOTFIX-47 §2 — title and excerpt are separate elements, not two
       * spans inside one link. Anything that reads the text rather than
       * the styles (reader modes, crawlers, screen readers listing links,
       * a flattened render) ran them together into one sentence:
       * "…What Actually Suits Your Skin HereWhich Korean skincare…".
       * A heading plus a paragraph is separated structurally.
       */}
      <ul className="mt-5 grid gap-4">
        {ranked.map((post) => (
          <li key={post.slug}>
            <Link
              href={`/blog/${post.slug}`}
              className="block rounded-2xl border border-brand-lavender/60 bg-brand-cream-card p-5 shadow-sm transition hover:shadow-md"
            >
              <h3 className="font-serif text-xl italic leading-snug text-brand-primary">
                {post.title}
              </h3>
              {post.excerpt ? (
                <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-brand-gray">
                  {post.excerpt}
                </p>
              ) : null}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
