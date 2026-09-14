-- HANDOVER-22 §8 — editor-chosen related posts.
--
-- Slugs rather than ids on purpose: the studio editor picks posts by slug,
-- the public page resolves by slug, and a text[] of slugs survives a row
-- being deleted and recreated. A FK array would not, and there is no join
-- worth the extra table for a capped list of three.
--
-- No FK constraint and no uniqueness constraint: a slug pointing at an
-- unpublished or deleted post must be tolerated, because the reading side
-- filters to published posts anyway. A constraint here would turn
-- unpublishing one post into a failed save on another.
alter table public.studio_blog_posts
  add column if not exists related_slugs text[] not null default '{}';

comment on column public.studio_blog_posts.related_slugs is
  'HANDOVER-22 §8. Up to 3 slugs chosen in the studio. Empty means the public page falls back to same-cluster posts. Not FK-constrained on purpose — the reading side filters to published posts.';
