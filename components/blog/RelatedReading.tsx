import Link from "next/link";
import { listPublishedPosts } from "@/lib/studio/blog";

const MAX_RELATED = 2;

/**
 * HOTFIX-10 §1c — cross-links between posts.
 *
 * Written as a query rather than hand-written inline links so it keeps
 * working as more posts publish: same-cluster posts are preferred (the
 * Pakistan/pollution and melasma posts share a cluster and are natural
 * partners), then the most recent fill any remaining slot. Nothing to
 * maintain per post, and no risk of a hand-written link pointing at a post
 * that was later unpublished.
 *
 * Renders nothing when there is no other published post, so a single-post
 * blog never shows an empty "Related reading" heading.
 */
export default async function RelatedReading({
  currentSlug,
  cluster,
}: {
  currentSlug: string;
  cluster: string | null;
}) {
  const others = (await listPublishedPosts()).filter(
    (post) => post.slug !== currentSlug,
  );
  if (others.length === 0) return null;

  const ranked = [
    ...others.filter((post) => cluster && post.cluster === cluster),
    ...others.filter((post) => !cluster || post.cluster !== cluster),
  ].slice(0, MAX_RELATED);

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
