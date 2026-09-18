import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Breadcrumbs, { type Crumb } from "@/components/seo/Breadcrumbs";
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

  // HOTFIX-30 Part 1.1 — comma, matching the credential stack. This string
  // is the browser tab and the search result, which is the most-seen place
  // this person's name and title appear together; punctuating it one way
  // there and another way on the page is the drift the stack exists to stop.
  const title = `${author.name}, ${author.title}`;
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

  /*
   * HOTFIX-25 §1.2 — this page already had a visible trail AND a separate
   * BreadcrumbList saying the same thing, hand-written twice. Now one array
   * feeds both. See components/seo/Breadcrumbs.
   *
   * Home / Name, with no "Skin, explained" in between, even though readers
   * arrive here from posts: /authors/[slug] is not under /blog, and a
   * breadcrumb asserting a parent the URL does not have is the kind of
   * mismatch Google discards the whole trail over.
   */
  const trail: Crumb[] = [
    { name: "Home", path: "/" },
    { name: author.name, path: `/authors/${author.slug}` },
  ];

  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <JsonLd
        data={graph(personSchema(author), breadcrumbSchema(trail))}
      />

      <Breadcrumbs trail={trail} className="mb-10" />

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
        {/*
          HOTFIX-30 §1.2 — the long form, on one of the two pages with room.

          "Five years in clinics" is a credential and it belongs in the stack
          below. This is the same fact doing a different job: it says why the
          five years matter to someone deciding whether to send photographs,
          which is the only question this page has to answer.
        */}
        {author.experienceLong ? (
          <p className="mt-4">{author.experienceLong}</p>
        ) : null}
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
          {/* Not "Verify these credentials" — that heading sat above a
              LinkedIn link, which verifies who someone is, not what they
              hold. /credentials is where credentials are verified, and it is
              linked from the block directly above this. */}
          <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-black/45">
            Find {author.name.split(" ")[0]} elsewhere
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
          {/*
            HOTFIX-30 Part 3 — was "her clinical experience". "Clinical"
            implies a clinician, and Ayma is explicitly not one; the site
            says so in her own scope disclaimer a few lines above. Claiming
            it here, on the page whose whole job is establishing what she
            is qualified to say, was the worst possible place for it.
          */}
          her practice before publication. Read our{" "}
          <Link href="/editorial-policy" className="underline underline-offset-2">
            editorial policy
          </Link>
          .
        </p>
      ) : null}
    </main>
  );
}
