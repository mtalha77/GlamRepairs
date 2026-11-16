-- Handover 73 Part 1.1: a published post records when it was reviewed.
--
-- Backfill, 16 November 2026. Four published posts had no reviewed_at:
--   how-to-start-retinol-pakistan, damaged-skin-barrier-signs-repair,
--   lahore-aqi-pakistan-cities-comparison, smog-skin-problems-lahore.
-- Their true review dates were not recorded, so reviewed_at is set to
-- published_at: RECONSTRUCTED, not observed. Every other published post
-- already carried a reviewed_at written by the studio publish action.
update public.studio_blog_posts
   set reviewed_at = published_at
 where status = 'published' and reviewed_at is null and published_at is not null;

alter table public.studio_blog_posts
  add constraint published_needs_review check (status <> 'published' or reviewed_at is not null);
