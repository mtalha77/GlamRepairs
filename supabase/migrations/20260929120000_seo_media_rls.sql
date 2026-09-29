-- HANDOVER-45 — the four tables were created with RLS off and every
-- privilege granted to `anon`, so anyone holding the public anon key could
-- rewrite page titles, the organization settings, or the media library.
--
-- Reads stay public: this is exactly what the site renders into every page,
-- so there is nothing to hide. Writes are studio members only.
alter table public.page_seo          enable row level security;
alter table public.seo_settings      enable row level security;
alter table public.studio_media      enable row level security;
alter table public.studio_post_media enable row level security;

revoke insert, update, delete, truncate, references, trigger
  on public.page_seo, public.seo_settings, public.studio_media, public.studio_post_media
  from anon;
revoke truncate, references, trigger
  on public.page_seo, public.seo_settings, public.studio_media, public.studio_post_media
  from authenticated;

do $$
declare t text;
begin
  foreach t in array array['page_seo','seo_settings','studio_media','studio_post_media'] loop
    execute format('drop policy if exists "public reads %1$s" on public.%1$I', t);
    execute format('create policy "public reads %1$s" on public.%1$I for select to anon, authenticated using (true)', t);
    execute format('drop policy if exists "studio members write %1$s" on public.%1$I', t);
    execute format(
      'create policy "studio members write %1$s" on public.%1$I for all to authenticated '
      'using (private.is_studio_member()) with check (private.is_studio_member())', t);
  end loop;
end $$;

-- The site's Organization node lists these today, from code. Seed them so
-- moving the schema to read this row does not silently drop them.
update public.seo_settings
   set same_as = array[
     'https://www.instagram.com/glam.repairs/',
     'https://web.facebook.com/profile.php?id=61590698607527',
     'https://www.linkedin.com/company/glamrepairs/'
   ]
 where id = 1 and cardinality(same_as) = 0;
