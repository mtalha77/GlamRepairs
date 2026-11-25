import Link from "next/link";
import OwnershipBlock from "@/components/legal/OwnershipBlock";
import JsonLd from "@/components/seo/JsonLd";
import { breadcrumbSchema, graph } from "@/lib/seo/schema";
import { renderMarkdown } from "@/lib/blog/markdown";

/**
 * Shared renderer for Terms and Privacy.
 *
 * Reuses the blog's markdown renderer rather than introducing a second one, so
 * these pages inherit the same escaping guarantees. Legal copy is authored by
 * us, but "authored by us" is not a security model.
 *
 * The `lastUpdated` date is rendered visibly and as a `<time>` element. For
 * legal documents that is not decoration — it is how a reader establishes which
 * version applied to them, and it is what the Terms themselves point at when
 * they say "the version published when you purchase is the version that
 * applies".
 */
/**
 * The legal copy is authored one paragraph per line. The shared renderer
 * joins consecutive lines into a single paragraph (right for blog prose
 * wrapped at 80 columns), which ran every section of /terms and /privacy
 * into one block, and put a paragraph that follows a list inside the
 * <ul>. A blank line between every pair of lines, except between two
 * bullets, restores what the author wrote. Handover 75.
 */
function paragraphPerLine(md: string): string {
  const bullet = /^\s*[-*]\s+/;
  const lines = md.split("\n");
  return lines
    .map((line, i) => {
      const next = lines[i + 1];
      const keepTight = next !== undefined && bullet.test(line) && bullet.test(next);
      return keepTight ? line + "\n" : line + "\n\n";
    })
    .join("");
}

export default function LegalPage({
  title,
  path,
  intro,
  lastUpdated,
  markdown,
  ownership = false,
}: {
  title: string;
  /** The page's own path, for the breadcrumb. */
  path: "/terms" | "/privacy" | "/refunds";
  /** Handover 75: the owner and address block, directly under the date. */
  ownership?: boolean;
  intro: string;
  /** ISO date, e.g. "2026-09-02" */
  lastUpdated: string;
  markdown: string;
}) {
  const html = renderMarkdown(paragraphPerLine(markdown));
  const formatted = new Date(lastUpdated).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <JsonLd
        data={graph(
          breadcrumbSchema([
            { name: "Home", path: "/" },
            { name: title, path },
          ]),
        )}
      />
      <h1 className="font-[family-name:var(--font-playfair)] text-4xl leading-tight">
        {title}
      </h1>
      <p className="mt-3 text-sm text-black/50">
        Last updated <time dateTime={lastUpdated}>{formatted}</time>
      </p>
      {ownership ? <OwnershipBlock className="mt-6 bg-brand-cream-light" /> : null}
      <p className="mt-6 text-lg leading-relaxed text-black/70">{intro}</p>
      <article
        className="prose-gr mt-10"
        dangerouslySetInnerHTML={{ __html: html }}
      />
      <nav className="mt-14 border-t border-black/10 pt-6 text-sm text-black/55">
        <Link href="/terms" className="underline underline-offset-2">
          Terms &amp; Conditions
        </Link>
        <span aria-hidden> · </span>
        <Link href="/privacy" className="underline underline-offset-2">
          Privacy Policy
        </Link>
        <span aria-hidden> · </span>
        <Link href="/refunds" className="underline underline-offset-2">
          Refunds and cancellations
        </Link>
        <span aria-hidden> · </span>
        <Link href="/editorial-policy" className="underline underline-offset-2">
          Editorial policy
        </Link>
      </nav>
    </main>
  );
}
