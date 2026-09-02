import { notFound, redirect } from "next/navigation";
import BlogEditor from "@/components/studio/BlogEditor";
import { requireStudioMember } from "@/lib/studio/member";
import { getPostById } from "@/lib/studio/blog";
import { listAuthors, listReviewers } from "@/lib/seo/authors";

/**
 * Editor. `/studio/blog/new` is handled by the same route — a literal "new"
 * segment means "no post loaded yet" rather than a missing record.
 */
export const dynamic = "force-dynamic";

export default async function StudioBlogEditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { user, member } = await requireStudioMember();
  if (!user) redirect("/studio/login");
  if (!member) redirect("/studio/no-access");

  const { id } = await params;
  const isNew = id === "new";
  const post = isNew ? null : await getPostById(id);
  if (!isNew && !post) notFound();

  return (
    <BlogEditor
      post={post}
      authors={listAuthors().map((a) => ({ slug: a.slug, name: a.name }))}
      reviewers={listReviewers().map((a) => ({
        slug: a.slug,
        name: a.name,
        credentials: a.credentials,
      }))}
    />
  );
}
