-- HOTFIX-40 §3 and §4.4.
--
-- 1. FAQs live on the city row, as data. A block is only ever rendered, and
--    only ever marked up as FAQPage, when this is non-empty — so the
--    markup can never describe questions that are not on the page.
alter table public.area_pages
  add column if not exists faqs jsonb not null default '[]'::jsonb;

alter table public.area_pages
  drop constraint if exists area_pages_faqs_is_array;
alter table public.area_pages
  add constraint area_pages_faqs_is_array check (jsonb_typeof(faqs) = 'array');

-- 2. `updated_at` means "someone changed the copy", and nothing else.
--
-- It is what the page now reports as dateModified and "Last reviewed".
-- There was no touch trigger, so it only moved when an editor remembered
-- to set it by hand. This moves it when — and only when — a reader-facing
-- field changes. Publishing, reordering or re-zoning a city is not a copy
-- change and does not count; the hourly sensor reading lives in other
-- tables entirely and cannot reach it.
create or replace function private.area_pages_touch_on_copy_change()
returns trigger
language plpgsql
as $$
begin
  if (new.title, new.h1, new.meta_description, new.intro_markdown,
      new.city_markdown, new.seasonal_markdown, new.water_note, new.faqs)
     is distinct from
     (old.title, old.h1, old.meta_description, old.intro_markdown,
      old.city_markdown, old.seasonal_markdown, old.water_note, old.faqs)
  then
    new.updated_at := now();
  end if;
  return new;
end;
$$;

drop trigger if exists area_pages_touch_on_copy_change_trg on public.area_pages;
create trigger area_pages_touch_on_copy_change_trg
  before update on public.area_pages
  for each row execute function private.area_pages_touch_on_copy_change();

-- 3. The page read everything through this view, which never selected the
--    two date columns at all. Appended at the end, which is the only place
--    CREATE OR REPLACE VIEW allows new columns.
create or replace view public.area_page_data as
 SELECT a.slug,
    a.city,
    a.province,
    a.latitude,
    a.longitude,
    a.timezone,
    a.title,
    a.h1,
    a.meta_description,
    a.target_keyword,
    a.intro_markdown,
    a.city_markdown,
    a.seasonal_markdown,
    a.water_note,
    a.related_slugs,
    a.status,
    a.sort_order,
    a.covers,
    a.population_rank,
    z.slug AS zone_slug,
    z.name AS zone_name,
    z.summary AS zone_summary,
    z.guidance_markdown AS zone_guidance,
    z.dominant_factor,
    to_jsonb(l.*) - 'slug'::text AS latest,
    COALESCE(( SELECT jsonb_agg(to_jsonb(f.*) - 'slug'::text ORDER BY f.forecast_date) AS jsonb_agg
           FROM air_quality_forecast f
          WHERE f.slug = a.slug AND f.forecast_date >= CURRENT_DATE), '[]'::jsonb) AS forecast,
    ( SELECT jsonb_build_object('headline', v.headline, 'advice', v.advice) AS jsonb_build_object
           FROM air_quality_advice v
          WHERE v.band = COALESCE(l.band, 'unknown'::text)) AS advice,
    COALESCE(( SELECT jsonb_agg(jsonb_build_object('slug', s.slug, 'city', s.city) ORDER BY s.sort_order) AS jsonb_agg
           FROM area_pages s
          WHERE s.zone_slug = a.zone_slug AND s.slug <> a.slug AND s.status = 'published'::text), '[]'::jsonb) AS zone_siblings,
    a.created_at,
    a.updated_at,
    a.faqs
   FROM area_pages a
     LEFT JOIN climate_zones z ON z.slug = a.zone_slug
     LEFT JOIN air_quality_latest l ON l.slug = a.slug;
