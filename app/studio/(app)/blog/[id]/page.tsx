import { notFound, redirect } from "next/navigation";
import BlogEditor from "@/components/studio/BlogEditor";
import { requireStudioMember } from "@/lib/studio/member";
import { getPostById, listAllPosts } from "@/lib/studio/blog";
import { listAuthors, listReviewers } from "@/lib/seo/authors";
import { listMedia } from "@/lib/studio/media";
import { createServerSupabaseClient } from "@/lib/supabase/server";

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

  // HANDOVER-22 §8 — candidates for the related-posts picker. Archived posts
  // are excluded: they are not coming back, so offering them is offering a
  // link that will never resolve.
  const otherPosts = (await listAllPosts())
    .filter((other) => other.id !== post?.id && other.status !== "archived")
    .map((other) => ({
      slug: other.slug,
      title: other.title,
      status: other.status,
    }));

  // HANDOVER-45 — the hero picker offers library images uploaded as heroes
  // (they are sized for it), and shows whichever one is linked now.
  const heroMedia = await listMedia({ role: "hero" });
  let currentHeroId: string | null = null;
  if (post) {
    const supabase = await createServerSupabaseClient();
    const { data } = await supabase
      .from("studio_post_media")
      .select("media_id")
      .eq("post_slug", post.slug)
      .eq("role", "hero")
      .maybeSingle();
    currentHeroId = data?.media_id ?? null;
  }

  return (
    <BlogEditor
      heroOptions={heroMedia.map((m) => ({
        id: m.id,
        url: m.publicUrl,
        alt: m.altText,
        filename: m.filename,
        width: m.width,
        height: m.height,
      }))}
      currentHeroId={currentHeroId}
      post={post}
      authors={listAuthors().map((a) => ({ slug: a.slug, name: a.name }))}
      reviewers={listReviewers().map((a) => ({
        slug: a.slug,
        name: a.name,
        credentials: a.credentials,
      }))}
      otherPosts={otherPosts}
    />
  );
}
