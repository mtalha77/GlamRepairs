import type { Metadata } from "next";
import Link from "next/link";
import BlogIndex, { type BlogIndexPost } from "@/components/blog/BlogIndex";
import Breadcrumbs, { type Crumb } from "@/components/seo/Breadcrumbs";
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

  /**
   * HANDOVER-22 §7 — dates and author names are resolved here, on the
   * server, rather than in the client component that renders the cards.
   * `toLocaleDateString` follows the machine's locale, so formatting in the
   * browser would produce a different string from the one the server sent
   * and hydration would mismatch on any visitor whose locale is not en-GB.
   */
  const cards: BlogIndexPost[] = posts.map((post) => ({
    id: post.id,
    slug: post.slug,
    title: post.title,
    excerpt: post.excerpt,
    cluster: post.cluster,
    authorName: AUTHORS[post.authorSlug]?.name ?? null,
    publishedLabel: fmt(post.publishedAt),
    readingMinutes: post.readingMinutes,
  }));

  /* Declared once, consumed twice — see components/seo/Breadcrumbs. */
  const trail: Crumb[] = [
    { name: "Home", path: "/" },
    { name: "Skin, explained", path: "/blog" },
  ];

  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <JsonLd data={graph(breadcrumbSchema(trail))} />

      {/* HOTFIX-25 §1.2 — one hop, but it is the hop back to the homepage
          from the section root, and it is the crumb Google reads for every
          post underneath. */}
      <Breadcrumbs trail={trail} className="mb-7" />

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

      <BlogIndex posts={cards} />

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
