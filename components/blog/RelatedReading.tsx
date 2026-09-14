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
      <ul className="mt-4 space-y-4">
        {ranked.map((post) => (
          <li key={post.slug}>
            <Link href={`/blog/${post.slug}`} className="group block">
              <span className="block font-[family-name:var(--font-playfair)] text-xl text-[#662d91] underline-offset-4 group-hover:underline">
                {post.title}
              </span>
              {post.excerpt ? (
                <span className="mt-1 block text-black/65">{post.excerpt}</span>
              ) : null}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
