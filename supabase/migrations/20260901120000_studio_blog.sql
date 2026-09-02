-- Blog, as a studio-managed resource.
--
-- Named `studio_blog_posts` to sit alongside studio_reports / studio_reviews /
-- studio_notifications rather than inventing a parallel vocabulary.
--
-- ── Content-strategy note, encoded in the schema ─────────────────────────────
-- Volume is deliberately NOT the goal. Skincare is YMYL, and Google's core
-- updates have repeatedly demoted sites publishing large numbers of thin,
-- unattributed health pages. Every post here carries an author slug, and
-- publishing is gated on a reviewer being set. That constraint is the whole
-- point — it is what makes the content defensible.
create table if not exists public.studio_blog_posts (
  id               uuid primary key default gen_random_uuid(),
  slug             text unique not null,
  title            text not null,
  excerpt          text,
  body_markdown    text not null default '',
  -- SEO
  meta_title       text,
  meta_description text,
  target_keyword   text,
  cluster          text,   -- diagnostic | ingredient | routine | myth | pakistan
  hero_image_url   text,
  reading_minutes  integer,
  -- E-E-A-T. Slugs resolve against lib/seo/authors.ts, so credentials live in
  -- one place instead of being duplicated per row.
  author_slug      text not null default 'ayma-arif',
  reviewer_slug    text,
  reviewed_at      timestamptz,
  status           text not null default 'draft',  -- draft | published | archived
  published_at     timestamptz,
  created_by       uuid references auth.users(id) on delete set null,
  updated_by       uuid references auth.users(id) on delete set null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  constraint studio_blog_posts_status_check
    check (status in ('draft', 'published', 'archived')),
  -- Publishing without a reviewer is blocked at the database level, not just in
  -- the UI. A future script, a manual SQL edit, or a second admin panel cannot
  -- route around it.
  constraint studio_blog_posts_published_needs_reviewer
    check (status <> 'published' or (reviewer_slug is not null and published_at is not null))
);

create index if not exists studio_blog_posts_status_idx
  on public.studio_blog_posts (status);

create index if not exists studio_blog_posts_published_idx
  on public.studio_blog_posts (published_at desc)
  where status = 'published';

create index if not exists studio_blog_posts_cluster_idx
  on public.studio_blog_posts (cluster);

-- ── updated_at ──────────────────────────────────────────────────────────────
-- Uniquely named so it cannot collide with an existing trigger function.
create or replace function public.studio_blog_posts_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists studio_blog_posts_touch on public.studio_blog_posts;
create trigger studio_blog_posts_touch
  before update on public.studio_blog_posts
  for each row execute function public.studio_blog_posts_touch_updated_at();

-- ── RLS ─────────────────────────────────────────────────────────────────────
alter table public.studio_blog_posts enable row level security;

-- The public sees published posts only. Drafts are never exposed, so an
-- unfinished article cannot be found by guessing a slug.
drop policy if exists "public reads published blog posts" on public.studio_blog_posts;
create policy "public reads published blog posts" on public.studio_blog_posts
  for select to anon, authenticated
  using (status = 'published');

-- Any studio member sees everything, including drafts.
drop policy if exists "studio members read blog posts" on public.studio_blog_posts;
create policy "studio members read blog posts" on public.studio_blog_posts
  for select to authenticated
  using (
    exists (select 1 from public.studio_members m where m.user_id = auth.uid())
  );

drop policy if exists "studio members write blog posts" on public.studio_blog_posts;
create policy "studio members write blog posts" on public.studio_blog_posts
  for all to authenticated
  using (
    exists (select 1 from public.studio_members m where m.user_id = auth.uid())
  )
  with check (
    exists (select 1 from public.studio_members m where m.user_id = auth.uid())
  );
