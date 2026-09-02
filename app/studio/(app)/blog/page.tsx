import Link from "next/link";
import { redirect } from "next/navigation";
import { requireStudioMember } from "@/lib/studio/member";
import { listAllPosts } from "@/lib/studio/blog";
import { AUTHORS } from "@/lib/seo/authors";

/**
 * Studio → Blog. Lists everything, drafts included (RLS allows members to see
 * drafts; the public policy does not).
 */
export const dynamic = "force-dynamic";

function fmt(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

const STATUS_STYLES: Record<string, string> = {
  published: "bg-emerald-100 text-emerald-800",
  draft: "bg-amber-100 text-amber-800",
  archived: "bg-neutral-200 text-neutral-600",
};

export default async function StudioBlogPage() {
  const { user, member } = await requireStudioMember();
  if (!user) redirect("/studio/login");
  if (!member) redirect("/studio/no-access");

  const posts = await listAllPosts();

  return (
    <div className="px-6 py-8">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Blog</h1>
          <p className="mt-1 text-sm text-neutral-500">
            Drafts are private. Publishing requires a named reviewer.
          </p>
        </div>
        <Link
          href="/studio/blog/new"
          className="rounded-xl bg-[#662d91] px-5 py-2.5 text-sm font-semibold text-white"
        >
          New post
        </Link>
      </header>

      {posts.length === 0 ? (
        <p className="mt-10 rounded-xl bg-neutral-50 px-5 py-6 text-neutral-500">
          No posts yet. Create the first one.
        </p>
      ) : (
        <div className="mt-8 overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-neutral-200 text-xs uppercase tracking-wider text-neutral-500">
              <tr>
                <th className="py-3 pr-4 font-medium">Title</th>
                <th className="py-3 pr-4 font-medium">Status</th>
                <th className="py-3 pr-4 font-medium">Reviewer</th>
                <th className="py-3 pr-4 font-medium">Published</th>
                <th className="py-3 font-medium">Updated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {posts.map((p) => {
                const reviewer = p.reviewerSlug ? AUTHORS[p.reviewerSlug] : null;
                return (
                  <tr key={p.id} className="align-top">
                    <td className="py-4 pr-4">
                      <Link
                        href={`/studio/blog/${p.id}`}
                        className="font-medium underline-offset-2 hover:underline"
                      >
                        {p.title}
                      </Link>
                      <p className="mt-0.5 font-mono text-xs text-neutral-400">
                        /blog/{p.slug}
                      </p>
                    </td>
                    <td className="py-4 pr-4">
                      <span
                        className={`inline-block rounded-full px-2.5 py-1 text-xs font-semibold ${
                          STATUS_STYLES[p.status] ?? ""
                        }`}
                      >
                        {p.status}
                      </span>
                    </td>
                    <td className="py-4 pr-4 text-neutral-600">
                      {reviewer ? (
                        reviewer.name
                      ) : (
                        <span className="text-amber-700">not set</span>
                      )}
                    </td>
                    <td className="py-4 pr-4 text-neutral-600">
                      {fmt(p.publishedAt)}
                    </td>
                    <td className="py-4 text-neutral-600">{fmt(p.updatedAt)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
