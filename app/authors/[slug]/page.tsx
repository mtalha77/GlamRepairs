import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import CredentialsBlock from "@/components/seo/CredentialsBlock";
import JsonLd from "@/components/seo/JsonLd";
import { getAuthor, listAuthors } from "@/lib/seo/authors";
import { breadcrumbSchema, graph, personSchema } from "@/lib/seo/schema";
import { SITE } from "@/lib/seo/site";

/**
 * Author bio page.
 *
 * A byline on a post is not enough for YMYL. Google's raters look for a
 * dedicated page carrying the full name, the credential, a registration number
 * where one applies, a photo, and links to verifiable external profiles. This
 * is that page, and it is what every `author` reference in the article schema
 * resolves to.
 */
export function generateStaticParams() {
  return listAuthors().map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const author = getAuthor(slug);
  if (!author) return {};

  const title = `${author.name} — ${author.title}`;
  return {
    title,
    description: author.bio,
    alternates: { canonical: `/authors/${author.slug}` },
    openGraph: {
      type: "profile",
      title: `${title} | ${SITE.name}`,
      description: author.bio,
      url: `/authors/${author.slug}`,
    },
  };
}

export default async function AuthorPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const author = getAuthor(slug);
  if (!author) notFound();

  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <JsonLd
        data={graph(
          personSchema(author),
          breadcrumbSchema([
            { name: "Home", path: "/" },
            { name: author.name, path: `/authors/${author.slug}` },
          ]),
        )}
      />

      <nav className="mb-10 text-sm text-black/50">
        <Link href="/" className="underline underline-offset-2">
          Home
        </Link>
        <span aria-hidden> / </span>
        <span>{author.name}</span>
      </nav>

      <header className="flex flex-col gap-5 sm:flex-row sm:items-center">
        {author.photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={author.photo}
            alt={author.name}
            width={112}
            height={112}
            className="h-28 w-28 rounded-full object-cover"
          />
        ) : null}
        <div>
          <h1 className="font-[family-name:var(--font-playfair)] text-4xl">
            {author.name}
          </h1>
          <p className="mt-1 text-black/70">{author.title}</p>
        </div>
      </header>

      <section className="mt-10 space-y-4 text-lg leading-relaxed text-black/80">
        <p>{author.bio}</p>
      </section>

      <section className="mt-10 rounded-2xl bg-black/[0.03] px-6 py-5">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-black/45">
          Credentials
        </h2>
        <CredentialsBlock slug={author.slug} showProfileLink={false} />
        <p className="mt-3">
          <Link
            href="/credentials"
            className="text-xs font-medium underline underline-offset-2"
          >
            See how to verify these credentials
          </Link>
        </p>
      </section>

      {author.profiles?.length ? (
        <section className="mt-10">
          <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-black/45">
            Verify these credentials
          </h2>
          <ul className="mt-3 space-y-1">
            {author.profiles.map((p) => (
              <li key={p.url}>
                <a
                  href={p.url}
                  rel="me noopener"
                  target="_blank"
                  className="underline underline-offset-2"
                >
                  {p.label}
                </a>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {author.canReview ? (
        <p className="mt-10 rounded-xl bg-black/[0.035] px-5 py-4 text-sm text-black/70">
          {author.name.split(" ")[0]} reviews content on {SITE.name} for
          accuracy. Articles carrying her review badge have been checked against
          her clinical experience before publication. Read our{" "}
          <Link href="/editorial-policy" className="underline underline-offset-2">
            editorial policy
          </Link>
          .
        </p>
      ) : null}
    </main>
  );
}
