-- Handover 73 Part 4: topic hubs live at /blog/<cluster>, the same route as
-- posts, so no post may take a cluster's slug. Keep in step with CLUSTERS in
-- lib/blog/clusters.ts.
alter table public.studio_blog_posts
  add constraint blog_slug_not_a_cluster check (
    slug not in ('korean-skincare', 'air-quality', 'diagnostic', 'ingredients', 'pakistan', 'practical')
  );
