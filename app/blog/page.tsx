import type { Metadata } from "next";
import Link from "next/link";
import JsonLd from "@/components/seo/JsonLd";
import { listPublishedPosts } from "@/lib/studio/blog";
import { AUTHORS } from "@/lib/seo/authors";
import { breadcrumbSchema, graph } from "@/lib/seo/schema";
import { SITE } from "@/lib/seo/site";

export const metadata: Metadata = {
  title: "Skin, explained",
  description:
    "Straight answers about skin from a certified practitioner — what is " +
    "actually happening, what to do about it, and when to see a doctor instead.",
  alternates: { canonical: "/blog" },
};

// Published posts change rarely; revalidate hourly rather than per request.
export const revalidate = 3600;

function fmt(d: string | null) {
  if (!d) return "";
  return new Date(d).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default async function BlogIndexPage() {
  const posts = await listPublishedPosts();

  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <JsonLd
        data={graph(
          breadcrumbSchema([
            { name: "Home", path: "/" },
            { name: "Blog", path: "/blog" },
          ]),
        )}
      />

      <header>
        <h1 className="font-[family-name:var(--font-playfair)] text-5xl">
          Skin, explained
        </h1>
        <p className="mt-4 max-w-xl text-lg text-black/65">
          Straight answers about what your skin is actually doing — written and
          reviewed by a certified practitioner. No brand names, no miracle
          promises.
        </p>
      </header>

      {posts.length === 0 ? (
        <p className="mt-16 rounded-xl bg-black/[0.035] px-5 py-6 text-black/60">
          Nothing published yet. New articles appear here as they are reviewed.
        </p>
      ) : (
        <ul className="mt-14 divide-y divide-black/10">
          {posts.map((post) => {
            const author = AUTHORS[post.authorSlug];
            return (
              <li key={post.id} className="py-8">
                {post.cluster ? (
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8a63b5]">
                    {post.cluster}
                  </p>
                ) : null}
                <h2 className="mt-2 text-2xl font-semibold leading-snug">
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
                <p className="mt-3 text-sm text-black/50">
                  {author ? `${author.name} · ` : ""}
                  {fmt(post.publishedAt)}
                  {post.readingMinutes ? ` · ${post.readingMinutes} min read` : ""}
                </p>
              </li>
            );
          })}
        </ul>
      )}

      <section className="mt-16 rounded-2xl bg-[#662d91] px-7 py-8 text-[#fff3da]">
        <h2 className="text-2xl font-semibold">
          Reading about it only gets you so far
        </h2>
        <p className="mt-2 text-[#d6cdea]">
          Telling these patterns apart from a description is genuinely hard. A
          certified practitioner can look at your skin properly and write you a
          plan you keep.
        </p>
        {/* Straight to the funnel. `/booking` is a redirect, and linking to it
            would add a needless 3XX hop on every internal link. */}
        <Link
          href="/onboarding/step/1"
          className="mt-5 inline-block rounded-full bg-[#fff3da] px-7 py-3 text-sm font-bold uppercase tracking-widest text-[#662d91]"
        >
          Get your assessment
        </Link>
      </section>

      <p className="mt-10 text-xs text-black/45">
        Articles on {SITE.name} are general information, not a diagnosis. See our{" "}
        <Link href="/editorial-policy" className="underline underline-offset-2">
          editorial policy
        </Link>
        .
      </p>
    </main>
  );
}
