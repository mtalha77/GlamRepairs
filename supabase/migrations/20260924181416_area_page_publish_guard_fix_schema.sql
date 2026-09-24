-- HOTFIX-40 §3. The publish guard ended with an unconditional
-- `new.updated_at := now()`, so every update — publishing, reordering,
-- re-zoning — reset the column the page now reports as dateModified and
-- "Last reviewed". area_pages_touch_on_copy_change_trg owns it now. Every
-- check below is unchanged; only that one line is gone.
--
-- Applied remotely as 20260924181245 (which mistakenly created a copy in
-- `public`) followed by this one; the drop removes that stray copy.
drop function if exists public.area_page_publish_guard();

create or replace function private.area_page_publish_guard()
returns trigger
language plpgsql
as $$
declare zone_len int;
begin
  if new.status = 'published' then
    if new.zone_slug is null then
      raise exception 'Area page "%" has no climate zone assigned.', new.slug using errcode='23514';
    end if;

    select length(coalesce(guidance_markdown,'')) into zone_len
      from public.climate_zones where slug = new.zone_slug;

    if coalesce(zone_len,0) < 2000 then
      raise exception
        'Cannot publish "%": its climate zone "%" has only % characters of guidance. Minimum 2000. The zone carries the substantive advice.',
        new.slug, new.zone_slug, coalesce(zone_len,0) using errcode='23514';
    end if;

    if length(coalesce(new.city_markdown,'')) < 600 then
      raise exception
        'Cannot publish "%": only % characters of city-specific content. Minimum 600 on top of the zone guidance, or it is a doorway page.',
        new.slug, length(coalesce(new.city_markdown,'')) using errcode='23514';
    end if;

    if coalesce(new.meta_description,'') = '' then
      raise exception 'Area page "%" has no meta description.', new.slug using errcode='23514';
    end if;
  end if;
  -- `updated_at` is no longer set here; area_pages_touch_on_copy_change_trg
  -- owns it and moves it only for reader-facing copy (HOTFIX-40 §3).
  return new;
end;
$$;
