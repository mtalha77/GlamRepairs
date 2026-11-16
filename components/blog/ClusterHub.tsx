import Link from "next/link";

import Breadcrumbs, { type Crumb } from "@/components/seo/Breadcrumbs";
import JsonLd from "@/components/seo/JsonLd";
import type { Cluster } from "@/lib/blog/clusters";
import { breadcrumbSchema, graph } from "@/lib/seo/schema";
import type { BlogPost } from "@/lib/studio/blog";

/** /blog/<cluster>: the written introduction, then every published post in it. */
export default function ClusterHub({ slug, cluster, posts }: { slug: string; cluster: Cluster; posts: BlogPost[] }) {
  const trail: Crumb[] = [
    { name: "Home", path: "/" },
    { name: "Skin, explained", path: "/blog" },
    { name: cluster.title, path: `/blog/${slug}` },
  ];
  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <JsonLd data={graph(breadcrumbSchema(trail))} />
      <Breadcrumbs trail={trail} className="mb-7" />
      <header>
        <h1 className="font-[family-name:var(--font-playfair)] text-4xl leading-tight text-brand-ink sm:text-5xl">{cluster.title}</h1>
        <div className="mt-5 max-w-2xl space-y-4 text-lg leading-relaxed text-brand-gray">
          {cluster.intro.map((p) => (
            <p key={p}>{p}</p>
          ))}
        </div>
        {cluster.see ? (
          <p className="mt-4">
            <Link href={cluster.see.href} className="font-medium text-brand-primary underline underline-offset-2">
              {cluster.see.label}
            </Link>
          </p>
        ) : null}
      </header>

      <ul className="mt-12 divide-y divide-brand-lavender/60 border-y border-brand-lavender/60">
        {posts.map((post) => (
          <li key={post.slug} className="py-6">
            <Link href={`/blog/${post.slug}`} className="group block">
              <h2 className="font-[family-name:var(--font-playfair)] text-2xl leading-snug text-brand-ink group-hover:text-brand-primary">
                {post.title}
              </h2>
              {post.excerpt ? <p className="mt-2 leading-relaxed text-brand-gray">{post.excerpt}</p> : null}
            </Link>
          </li>
        ))}
      </ul>

      <p className="mt-10 text-sm text-brand-gray">
        <Link href="/blog" className="underline underline-offset-2">
          All topics
        </Link>
      </p>
    </main>
  );
}
