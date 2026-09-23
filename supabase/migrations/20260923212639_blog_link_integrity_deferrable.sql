-- The link-integrity guard becomes deferrable, and gains a way to publish a
-- mutually-linked cluster.
--
-- The guard was right about WHAT it forbids: a published post must never
-- link to an unpublished one, which is the crawl-error class HOTFIX-31 was
-- cleaning up. It was wrong about WHEN it checked. As a BEFORE ROW trigger
-- it evaluated one row at a time, so two posts that link to each other
-- could never both be published: each needed the other published first.
--
-- `damaged-skin-barrier-signs-repair` and `how-to-start-retinol-pakistan`
-- link to each other, and every other draft reaches one of them, so all six
-- remaining drafts were permanently unpublishable through the studio. Not a
-- single stuck post, a stuck pipeline.
--
-- A DEFERRABLE constraint trigger checks at COMMIT instead. Publishing a
-- pair in one transaction now succeeds, and publishing one alone whose
-- target is still a draft still fails with the same message. The guarantee
-- is unchanged: at commit, no published post links to an unpublished one.
-- Both properties were verified against production inside a rolled-back
-- transaction before this was applied.

drop trigger if exists blog_link_integrity_trg on public.studio_blog_posts;

create constraint trigger blog_link_integrity_trg
  after insert or update on public.studio_blog_posts
  deferrable initially deferred
  for each row execute function private.blog_link_integrity();

/*
 * Publish several posts as one transaction.
 *
 * The studio publishes a single row at a time, which is right for the
 * common case and cannot express "these two only make sense together".
 * This does, and it is the only supported way to publish a cycle.
 *
 * SECURITY INVOKER (the default) on purpose: it must not become a way to
 * publish that bypasses whatever policies apply to the caller. It changes
 * only when the check runs, never who may run it.
 */
create or replace function public.publish_blog_posts(p_slugs text[])
returns table (slug text, status text, published_at timestamptz)
language plpgsql
as $$
begin
  if p_slugs is null or array_length(p_slugs, 1) is null then
    raise exception 'publish_blog_posts: no slugs given';
  end if;

  set constraints blog_link_integrity_trg deferred;

  return query
  update public.studio_blog_posts p
     set status = 'published',
         published_at = coalesce(p.published_at, now())
   where p.slug = any(p_slugs)
  returning p.slug, p.status, p.published_at;
end;
$$;

comment on function public.publish_blog_posts(text[]) is
  'Publish several posts in one transaction, so mutually-linked posts can go live together. Link integrity is still enforced, at commit.';

grant execute on function public.publish_blog_posts(text[]) to authenticated, service_role;
