-- HOTFIX-47 §1. A post cannot be published while its body is an outline
-- or thin.
--
-- The app checked length only for the post you clicked Publish on. The
-- bundle path (publish_blog_posts, used when a post links to drafts)
-- publishes every linked draft with no content check at all, which is how
-- an outline ends up live behind a finished pillar. A CHECK constraint
-- holds for the app, the bundle RPC and hand-written SQL alike.
--
-- 3,000 characters: a post shorter than that is thin content whatever it
-- says, and thin pages drag on the whole domain. Every published post is
-- currently over 8,700, so this validates immediately.
--
-- Keep the placeholder pattern in step with lib/blog/publishRules.ts.
alter table public.studio_blog_posts
  add constraint studio_blog_posts_published_is_finished check (
    status <> 'published'
    or (
      char_length(btrim(coalesce(body_markdown, ''))) >= 3000
      and coalesce(body_markdown, '') !~ '_To write\._|DRAFT OUTLINE|\mTODO\M'
      and coalesce(body_markdown, '') !~* 'lorem ipsum'
    )
  );
