import Image from "next/image";
import Link from "next/link";
import { listPublishedPosts } from "@/lib/studio/blog";

/**
 * HOTFIX-10 §1a — the blog was orphaned.
 *
 * Nothing on the homepage linked to a single post; the only route in was a
 * "Blog" item in the footer, leaving every article three clicks deep with
 * almost no internal link equity. That is a large part of why Search
 * Console reports them as "Discovered – currently not indexed" with
 * `Last crawled: N/A` — Google reads a page nothing links to as a page that
 * does not matter.
 *
 * Renders nothing at all when there are no published posts, so it can never
 * leave an empty section on the homepage.
 */
function formatDate(value: string | null) {
  if (!value) return "";
  return new Date(value).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default async function LatestPostsSection() {
  const posts = (await listPublishedPosts()).slice(0, 3);
  if (posts.length === 0) return null;

  return (
    <section className="bg-white px-4 py-16 sm:px-6 sm:py-20 lg:px-12 lg:py-24">
      <div className="mx-auto max-w-[86rem]">
        <header className="mx-auto max-w-2xl text-center">
          <h2 className="text-brand-primary">
            <span className="font-sans text-[2rem] tracking-[-0.02em] sm:text-[2.75rem] lg:text-[3.25rem]">
              Skin,
            </span>{" "}
            <span className="font-serif italic text-[2rem] sm:text-[2.75rem] lg:text-[3.25rem]">
              explained
            </span>
          </h2>
          <p className="mt-4 font-sans text-base leading-snug text-brand-ink sm:text-lg">
            Straight answers about what your skin is actually doing — written
            and reviewed by a certified practitioner.
          </p>
        </header>

        <ul className="mt-10 grid gap-6 sm:mt-12 lg:grid-cols-3">
          {posts.map((post) => (
            <li key={post.slug}>
              <Link
                href={`/blog/${post.slug}`}
                className="flex h-full flex-col overflow-hidden rounded-[20px] border border-brand-lavender/60 bg-white transition-colors hover:border-brand-lavender"
              >
                {post.heroImageUrl ? (
                  <span className="relative block aspect-[16/9] w-full overflow-hidden bg-brand-purple-soft">
                    <Image
                      src={post.heroImageUrl}
                      alt=""
                      fill
                      sizes="(max-width: 1024px) 100vw, 28rem"
                      className="object-cover"
                    />
                  </span>
                ) : null}
                <span className="flex flex-1 flex-col px-5 py-5 sm:px-6 sm:py-6">
                  {post.publishedAt ? (
                    <time
                      dateTime={post.publishedAt}
                      className="text-xs uppercase tracking-[0.08em] text-brand-gray"
                    >
                      {formatDate(post.publishedAt)}
                    </time>
                  ) : null}
                  <span className="mt-2 font-serif text-xl leading-snug text-brand-primary sm:text-[1.375rem]">
                    {post.title}
                  </span>
                  {post.excerpt ? (
                    <span className="mt-3 flex-1 font-sans text-sm leading-relaxed text-brand-ink sm:text-[0.9375rem]">
                      {post.excerpt}
                    </span>
                  ) : null}
                  <span className="mt-4 font-sans text-sm font-medium text-brand-primary underline underline-offset-2">
                    Read the article
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>

        <div className="mt-10 text-center">
          <Link
            href="/blog"
            className="inline-block rounded-full border border-brand-primary px-7 py-3 font-sans text-sm font-medium text-brand-primary transition-colors hover:bg-brand-primary hover:text-white"
          >
            Read all articles
          </Link>
        </div>
      </div>
    </section>
  );
}
