/*
 * Which posts must be published together with this one.
 *
 * The closure has to be TRANSITIVE. `smog` links to `barrier`, and
 * `barrier` links to `retinol`, so publishing the first two would still be
 * refused at commit. Walking one level deep would produce a studio that
 * offers a bundle and then fails on it, which is worse than the honest
 * refusal it replaced.
 *
 * Returns the post itself plus every unpublished post reachable from it
 * through markdown links, so the caller can show the real cost of
 * publishing ("this takes 3 posts live, not 1") before anything happens.
 *
 * `path` carries the walk so a cycle terminates: barrier and retinol link
 * to each other, which is the whole reason this exists.
 */
create or replace function public.blog_publish_set(p_slug text)
returns table (slug text, title text, status text, is_root boolean)
language sql
stable
as $$
  with recursive walk (slug, path) as (
    select p.slug, array[p.slug]
      from public.studio_blog_posts p
     where p.slug = p_slug

    union all

    select m[1], w.path || m[1]
      from walk w
      join public.studio_blog_posts p on p.slug = w.slug,
           lateral regexp_matches(p.body_markdown, '\]\(/blog/([a-z0-9-]+)\)', 'g') m
      join public.studio_blog_posts t on t.slug = m[1]
     where t.status <> 'published'
       and not (m[1] = any(w.path))     -- stop at a cycle
  )
  select distinct p.slug, p.title, p.status, (p.slug = p_slug) as is_root
    from walk w
    join public.studio_blog_posts p on p.slug = w.slug
   where p.status <> 'published' or p.slug = p_slug
   order by is_root desc, p.slug;
$$;

comment on function public.blog_publish_set(text) is
  'The post plus every unpublished post it transitively links to. What publish_blog_posts() must be given for the commit to validate.';

grant execute on function public.blog_publish_set(text) to authenticated, service_role;
