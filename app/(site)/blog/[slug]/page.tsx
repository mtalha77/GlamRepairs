import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import RelatedReading from "@/components/blog/RelatedReading";
import Breadcrumbs, { type Crumb } from "@/components/seo/Breadcrumbs";
import AuthorByline from "@/components/seo/AuthorByline";
import JsonLd from "@/components/seo/JsonLd";
import { getAuthor } from "@/lib/seo/authors";
import {
  breadcrumbSchema,
  faqSchema,
  graph,
  medicalArticleSchema,
  reviewedPageSchema,
} from "@/lib/seo/schema";
import Image from "next/image";
import { getPostHero } from "@/lib/blog/postHero";
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
  const hero = await getPostHero(post.slug);

  return {
    /*
     * HOTFIX-31 §4.3 — `absolute`, so the root template does NOT append
     * " | GlamRepairs".
     *
     * The document's fix is "trim meta_title to 60", and on its own that
     * does not work: the root layout's title template adds 14 characters,
     * so a 60-character meta_title still renders a 74-character <title>.
     * The live post measured 78.
     *
     * Those 14 characters were buying nothing. Google truncates around 60,
     * so the brand suffix was being cut off in the result anyway, while
     * still pushing the words that matter out of view. A post headline is
     * self-describing and the domain is shown beside it.
     *
     * This drops every post by 14 characters. Titles still over 60 after
     * it are an editorial trim, not a code fix — see the PR.
     */
    title: { absolute: title },
    description,
    alternates: { canonical: `/blog/${post.slug}` },
    openGraph: {
      type: "article",
      title,
      description,
      url: `/blog/${post.slug}`,
      publishedTime: post.publishedAt ?? undefined,
      modifiedTime: post.updatedAt,
      // HANDOVER-23 §1.1 — `opengraph-image.tsx` in this same route segment
      // generates a per-post typographic card, which Next attaches when no
      // image is given here. HANDOVER-45: a hero from the media library
      // wins, with its real dimensions. `hero_image_url` on its own does
      // not: every post carried one pointing at an undeployed file, which
      // made every post's og:image a 404.
      ...(hero
        ? { images: [{ url: hero.url, width: hero.width, height: hero.height, alt: hero.alt }] }
        : {}),
    },
    // Large-image cards need a genuinely large, post-specific image. That
    // used to mean `summary` without a hero, because a repeated brand
    // fallback is not "large image" content, it is just not-blank. The
    // generated per-post card IS post-specific — it carries that post's
    // headline and cluster — so `summary_large_image` is now honest for
    // every post rather than only the ones with a photograph.
    twitter: {
      card: "summary_large_image",
      title,
      description,
      ...(hero ? { images: [hero.url] } : {}),
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
  const hero = await getPostHero(post.slug);

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

  /*
   * HOTFIX-25 §1.2 — declared once, consumed twice: by `breadcrumbSchema`
   * below and by <Breadcrumbs> just under it. See components/seo/Breadcrumbs.
   *
   * "Skin, explained" rather than "Blog": that is the <h1> of the page this
   * crumb links to, and a breadcrumb label that disagrees with the page it
   * points at is the exact drift this single array exists to prevent. The
   * old markup said "Blog" while every visible surface said "Skin,
   * explained".
   */
  const trail: Crumb[] = [
    { name: "Home", path: "/" },
    { name: "Skin, explained", path: "/blog" },
    { name: post.title, path: `/blog/${post.slug}` },
  ];

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
            image: hero
              ? {
                  url: hero.url,
                  width: hero.width,
                  height: hero.height,
                  caption: hero.caption,
                  alt: hero.alt,
                }
              : undefined,
          }),
          ...(reviewer
            ? [
                reviewedPageSchema({
                  title: post.title,
                  description:
                    post.metaDescription || post.excerpt || post.title,
                  path: `/blog/${post.slug}`,
                  reviewer,
                  datePublished: post.publishedAt ?? post.createdAt,
                  dateModified: post.updatedAt,
                }),
              ]
            : []),
          breadcrumbSchema(trail),
          // FAQPage only when the questions are on the page — they render
          // below, from the same array.
          ...(post.faq.length
            ? [faqSchema(post.faq.map((f) => ({ question: f.q, answer: f.a })), `/blog/${post.slug}`)]
            : []),
        )}
      />

      {/* Replaces a lone "Skin, explained" back-link, which was the only
          visible navigation on a post and gave a reader no sense of where
          the post sat. */}
      <Breadcrumbs trail={trail} className="mb-8" />

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

      {hero ? (
        /*
         * HANDOVER-45 §4.5 — the hero is the likely Largest Contentful Paint
         * element, so it loads eagerly at high priority (`priority`), and its
         * stored width and height reserve the space before it arrives.
         * Every other image on the site stays lazy.
         */
        <figure className="mt-8">
          <Image
            src={hero.url}
            alt={hero.alt}
            width={hero.width}
            height={hero.height}
            priority
            sizes="(max-width: 700px) 100vw, 672px"
            className="h-auto w-full rounded-2xl"
          />
          {hero.caption || hero.credit ? (
            <figcaption className="mt-2 text-xs text-black/55">
              {hero.caption}
              {hero.caption && hero.credit ? " " : ""}
              {hero.credit ? <span className="text-black/40">{hero.credit}</span> : null}
            </figcaption>
          ) : null}
        </figure>
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

      {post.faq.length ? (
        <section className="mt-14" aria-labelledby="post-faq">
          <h2 id="post-faq" className="font-[family-name:var(--font-playfair)] text-2xl">
            Questions people ask
          </h2>
          <div className="mt-5 space-y-5">
            {post.faq.map((f) => (
              <div key={f.q}>
                <h3 className="font-semibold">{f.q}</h3>
                <p className="mt-1.5 leading-relaxed text-black/75">{f.a}</p>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <RelatedReading
        currentSlug={post.slug}
        cluster={post.cluster}
        relatedSlugs={post.relatedSlugs}
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
