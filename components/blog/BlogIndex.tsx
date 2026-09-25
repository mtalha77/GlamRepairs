"use client";

import { useState } from "react";
import Link from "next/link";
import { useAutoAnimate } from "@formkit/auto-animate/react";

import AnimatedSlideIn from "@/components/home/AnimatedSlideIn";

/**
 * HANDOVER-22 §7 — the blog index as cards, with a featured lead post and
 * cluster filtering.
 *
 * ── Why this is a client component and the page is not ───────────────────
 * Only the filter is interactive. The posts are fetched and rendered on the
 * server (the page keeps `revalidate = 3600`) and handed here as plain
 * data, so the full list is in the initial HTML — a crawler sees every post
 * and every link regardless of which pill is selected. Filtering hides
 * cards that are already in the document; it never fetches.
 *
 * ── Motion ───────────────────────────────────────────────────────────────
 * Entrances reuse AnimatedSlideIn, which already handles reveal-once and
 * `prefers-reduced-motion`.
 *
 * HANDOVER-23 §3 — the grid additionally gets `@formkit/auto-animate`
 * (~2 KB), which is the one place on the public site where it earns its
 * weight: filtering genuinely adds and removes list items, and without it
 * the remaining cards jump to their new positions. auto-animate reads
 * `prefers-reduced-motion` itself, so no guard is needed here.
 *
 * ⚠️ It is deliberately NOT on the FAQ, which §3 also suggests. FAQ rows
 * are hidden with the `hidden` attribute rather than removed from the
 * array — the FAQPage schema marks up every question, and marking up
 * content absent from the DOM is a structured data violation. Nothing
 * enters or leaves, so auto-animate would have nothing to animate. The
 * accordion's own 0fr→1fr transition already covers §2.6.
 */

export type BlogIndexPost = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  cluster: string | null;
  authorName: string | null;
  publishedLabel: string;
  readingMinutes: number | null;
};

const ALL = "__all__";

function Meta({ post }: { post: BlogIndexPost }) {
  return (
    <p className="mt-3 text-sm text-black/50">
      {post.authorName ? `${post.authorName} · ` : ""}
      {post.publishedLabel}
      {post.readingMinutes ? ` · ${post.readingMinutes} min read` : ""}
    </p>
  );
}

function ClusterPill({ cluster }: { cluster: string }) {
  return (
    <span className="inline-block rounded-full bg-[#f2ebf9] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#662d91]">
      {cluster}
    </span>
  );
}

export default function BlogIndex({ posts }: { posts: BlogIndexPost[] }) {
  const [active, setActive] = useState<string>(ALL);
  const [gridRef] = useAutoAnimate<HTMLUListElement>();

  const clusters = Array.from(
    new Set(posts.map((post) => post.cluster).filter((c) => c !== null)),
  );

  const filtered =
    active === ALL
      ? posts
      : posts.filter((post) => post.cluster === active);

  // The lead card is only meaningful on the unfiltered view. Inside a cluster
  // every post is equally "the newest in this cluster", and promoting one
  // would just make the grid start with a gap.
  const featured = active === ALL ? posts[0] : undefined;
  const rest = featured ? filtered.slice(1) : filtered;

  if (posts.length === 0) {
    return (
      <p className="mt-16 rounded-xl bg-black/[0.035] px-5 py-6 text-black/60">
        Nothing published yet. New articles appear here as they are reviewed.
      </p>
    );
  }

  return (
    <>
      {clusters.length > 1 ? (
        <div className="mt-10 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setActive(ALL)}
            aria-pressed={active === ALL}
            className={`min-h-11 rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] transition-colors ${
              active === ALL
                ? "bg-[#662d91] text-white"
                : "bg-black/[0.04] text-black/60 hover:bg-black/[0.08]"
            }`}
          >
            All
          </button>
          {clusters.map((cluster) => (
            <button
              key={cluster}
              type="button"
              onClick={() => setActive(cluster)}
              aria-pressed={active === cluster}
              className={`min-h-11 rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] transition-colors ${
                active === cluster
                  ? "bg-[#662d91] text-white"
                  : "bg-black/[0.04] text-black/60 hover:bg-black/[0.08]"
              }`}
            >
              {cluster}
            </button>
          ))}
        </div>
      ) : null}

      {featured ? (
        <AnimatedSlideIn direction="up" className="mt-8">
          <article className="rounded-3xl border border-black/10 bg-white p-6 shadow-sm transition-shadow hover:shadow-md sm:p-8">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-block rounded-full bg-[#662d91] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#fff3da]">
                Latest
              </span>
              {featured.cluster ? (
                <ClusterPill cluster={featured.cluster} />
              ) : null}
            </div>
            <h2 className="mt-4 font-[family-name:var(--font-playfair)] text-3xl leading-tight sm:text-4xl">
              <Link
                href={`/blog/${featured.slug}`}
                className="underline-offset-4 hover:underline"
              >
                {featured.title}
              </Link>
            </h2>
            {featured.excerpt ? (
              <p className="mt-3 text-lg leading-relaxed text-black/70">
                {featured.excerpt}
              </p>
            ) : null}
            <Meta post={featured} />
          </article>
        </AnimatedSlideIn>
      ) : null}

      {rest.length > 0 ? (
        <ul ref={gridRef} className="mt-6 grid gap-5 sm:grid-cols-2">
          {rest.map((post, index) => (
            <li key={post.id} className="h-full">
              <AnimatedSlideIn
                direction="up"
                // Staggered by row, not by card: a per-card delay makes a
                // two-column grid reveal diagonally, which reads as a glitch.
                delay={Math.floor(index / 2) * 70}
                className="h-full"
              >
                <article className="flex h-full flex-col rounded-2xl border border-black/10 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
                  {post.cluster ? <ClusterPill cluster={post.cluster} /> : null}
                  <h2 className="mt-3 text-xl font-semibold leading-snug">
                    <Link
                      href={`/blog/${post.slug}`}
                      className="underline-offset-4 hover:underline"
                    >
                      {post.title}
                    </Link>
                  </h2>
                  {post.excerpt ? (
                    <p className="mt-2 leading-relaxed text-black/70">
                      {post.excerpt}
                    </p>
                  ) : null}
                  <div className="mt-auto">
                    <Meta post={post} />
                  </div>
                </article>
              </AnimatedSlideIn>
            </li>
          ))}
        </ul>
      ) : null}

      {filtered.length === 0 ? (
        <p className="mt-8 rounded-xl bg-black/[0.035] px-5 py-6 text-black/60">
          Nothing in this topic yet.
        </p>
      ) : null}
    </>
  );
}
