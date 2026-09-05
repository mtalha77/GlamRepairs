import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import AuthorByline from "@/components/seo/AuthorByline";
import JsonLd from "@/components/seo/JsonLd";
import { getAuthor } from "@/lib/seo/authors";
import { breadcrumbSchema, graph, medicalArticleSchema } from "@/lib/seo/schema";
import { getPublishedPost } from "@/lib/studio/blog";
import { extractHeadings, renderMarkdown, slugifyHeading } from "@/lib/blog/markdown";

export const revalidate = 3600;

// No build-time enumeration: the only read available here is the cookie-scoped
// anon client, and `cookies()` cannot run inside `generateStaticParams` (it
// executes at build time with no request). Returning an empty set means posts
// are rendered on first request and then cached for `revalidate` seconds —
// which also lets a newly published post appear without a rebuild.
export async function generateStaticParams() {
  return [];
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPublishedPost(slug);
  if (!post) return {};

  const title = post.metaTitle || post.title;
  const description = post.metaDescription || post.excerpt || undefined;

  return {
    title,
    description,
    alternates: { canonical: `/blog/${post.slug}` },
    openGraph: {
      type: "article",
      title,
      description,
      url: `/blog/${post.slug}`,
      publishedTime: post.publishedAt ?? undefined,
      modifiedTime: post.updatedAt,
      // No `images` when there's no hero — Next's file-convention
      // app/opengraph-image.tsx fills that gap automatically, so a share
      // is never imageless even before Ayma adds hero images to posts.
      ...(post.heroImageUrl ? { images: [post.heroImageUrl] } : {}),
    },
    // Large-image cards need a genuinely large, post-specific image. Without
    // a hero, `summary` is the honest card type — a repeated brand fallback
    // isn't "large image" content, it's just not-blank.
    twitter: {
      card: post.heroImageUrl ? "summary_large_image" : "summary",
      title,
      description,
    },
  };
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = await getPublishedPost(slug);
  if (!post) notFound();

  const author = getAuthor(post.authorSlug);
  const reviewer = post.reviewerSlug ? getAuthor(post.reviewerSlug) : undefined;

  // The registry is the source of truth for credentials. If a slug no longer
  // resolves, fail loudly rather than rendering YMYL content with no byline.
  if (!author) notFound();

  const headings = extractHeadings(post.bodyMarkdown);

  // Anchor ids are injected after rendering so the ToC links land correctly,
  // without teaching the renderer about heading ids.
  const html = renderMarkdown(post.bodyMarkdown).replace(
    /<h2>(.*?)<\/h2>/g,
    (_m, inner: string) =>
      `<h2 id="${slugifyHeading(inner.replace(/<[^>]+>/g, ""))}">${inner}</h2>`,
  );

  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <JsonLd
        data={graph(
          medicalArticleSchema({
            title: post.title,
            description: post.metaDescription || post.excerpt || post.title,
            path: `/blog/${post.slug}`,
            author,
            reviewer,
            datePublished: post.publishedAt ?? post.createdAt,
            dateModified: post.updatedAt,
            image: post.heroImageUrl ?? undefined,
          }),
          breadcrumbSchema([
            { name: "Home", path: "/" },
            { name: "Blog", path: "/blog" },
            { name: post.title, path: `/blog/${post.slug}` },
          ]),
        )}
      />

      <nav className="mb-8 text-sm text-black/50">
        <Link href="/blog" className="underline underline-offset-2">
          Skin, explained
        </Link>
      </nav>

      {post.cluster ? (
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8a63b5]">
          {post.cluster}
        </p>
      ) : null}
      <h1 className="mt-2 font-[family-name:var(--font-playfair)] text-4xl leading-tight">
        {post.title}
      </h1>
      {post.excerpt ? (
        <p className="mt-4 text-lg leading-relaxed text-black/65">
          {post.excerpt}
        </p>
      ) : null}

      <div className="mt-8">
        <AuthorByline
          author={author}
          reviewer={reviewer}
          datePublished={post.publishedAt ?? post.createdAt}
          dateModified={post.updatedAt}
        />
      </div>

      {headings.length > 2 ? (
        <nav className="mt-10 rounded-xl bg-black/[0.035] px-5 py-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-black/45">
            On this page
          </p>
          <ul className="mt-3 space-y-1.5 text-sm">
            {headings.map((h) => (
              <li key={h.id}>
                <a href={`#${h.id}`} className="underline-offset-2 hover:underline">
                  {h.text}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      ) : null}

      {/* Content is escaped before markdown rendering — see lib/blog/markdown.ts */}
      <article
        className="prose-gr mt-10"
        dangerouslySetInnerHTML={{ __html: html }}
      />

      <section className="mt-14 rounded-2xl bg-[#662d91] px-7 py-8 text-[#fff3da]">
        <h2 className="text-2xl font-semibold">Not sure this is your pattern?</h2>
        <p className="mt-2 text-[#d6cdea]">
          That is exactly what an assessment is for. Answer a few questions, send
          a few photos, and get a written plan for your skin specifically.
        </p>
        {/* `/booking` redirects to the funnel — link direct, no 3XX hop. */}
        <Link
          href="/onboarding/step/1"
          className="mt-5 inline-block rounded-full bg-[#fff3da] px-7 py-3 text-sm font-bold uppercase tracking-widest text-[#662d91]"
        >
          Start your assessment
        </Link>
      </section>
    </main>
  );
}
