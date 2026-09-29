-- HANDOVER-46. Two changes.
--
-- 1. Access. The five gsc_* tables were created with RLS off and every
--    privilege (TRUNCATE included) granted to anon: anyone holding the
--    public anon key could read the site's search data or erase the stored
--    history this whole feature exists to keep. Search data is not public.
--    Studio members read; only the sync job (service role, which bypasses
--    RLS) writes. The views become security_invoker so they cannot be used
--    to read around the table policies.
--
-- 2. Position is impression-weighted. The views averaged daily positions
--    evenly, so a day with 2 impressions counted as much as a day with 200.
--    Search Console weights by impressions; unweighted numbers disagree
--    with Google's own UI and can put the wrong queries in striking
--    distance. Column names and meanings are unchanged.

do $$
declare t text;
begin
  foreach t in array array['gsc_daily','gsc_query_daily','gsc_page_daily','gsc_index_status','gsc_sync_log'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon', t);
    execute format('revoke insert, update, delete, truncate, references, trigger on public.%I from authenticated', t);
    execute format('drop policy if exists "studio members read %1$s" on public.%1$I', t);
    execute format('create policy "studio members read %1$s" on public.%1$I for select to authenticated using (private.is_studio_member())', t);
  end loop;
end $$;
revoke all on sequence public.gsc_sync_log_id_seq from anon, authenticated;

create or replace view public.gsc_summary_28d with (security_invoker = true) as
with cur as (
  select coalesce(sum(clicks), 0)::bigint as c,
         coalesce(sum(impressions), 0)::bigint as i,
         coalesce(sum(position * impressions) / nullif(sum(impressions), 0), 0)::numeric as p
    from public.gsc_daily
   where date > current_date - 31 and date <= current_date - 3
), prev as (
  select coalesce(sum(clicks), 0)::bigint as c,
         coalesce(sum(impressions), 0)::bigint as i,
         coalesce(sum(position * impressions) / nullif(sum(impressions), 0), 0)::numeric as p
    from public.gsc_daily
   where date > current_date - 59 and date <= current_date - 31
)
select cur.c as clicks,
       cur.i as impressions,
       round(case when cur.i = 0 then 0::numeric else cur.c::numeric / cur.i::numeric * 100 end, 2) as ctr_pct,
       round(cur.p, 1) as avg_position,
       cur.c - prev.c as clicks_delta,
       cur.i - prev.i as impressions_delta,
       -- Positive = better (the number fell). Null when there is no prior period to compare.
       case when prev.p = 0 or cur.p = 0 then null else round(prev.p - cur.p, 1) end as position_delta
  from cur, prev;

create or replace view public.gsc_striking_distance with (security_invoker = true) as
select query,
       sum(impressions) as impressions,
       sum(clicks) as clicks,
       round(sum(position * impressions) / nullif(sum(impressions), 0), 1) as avg_position
  from public.gsc_query_daily
 where date > current_date - 31
 group by query
having sum(impressions) >= 5
   and sum(position * impressions) / nullif(sum(impressions), 0) between 8 and 25
 order by sum(impressions) desc;

create or replace view public.gsc_low_ctr_pages with (security_invoker = true) as
select page,
       sum(impressions) as impressions,
       sum(clicks) as clicks,
       round(case when sum(impressions) = 0 then 0::numeric
                  else sum(clicks)::numeric / sum(impressions)::numeric * 100 end, 2) as ctr_pct,
       round(sum(position * impressions) / nullif(sum(impressions), 0), 1) as avg_position
  from public.gsc_page_daily
 where date > current_date - 31
 group by page
having sum(impressions) >= 20
   and sum(position * impressions) / nullif(sum(impressions), 0) <= 20
   and sum(clicks)::numeric / nullif(sum(impressions), 0)::numeric < 0.02
 order by sum(impressions) desc;

create or replace view public.gsc_new_queries with (security_invoker = true) as
select query,
       sum(impressions) as impressions,
       sum(clicks) as clicks,
       round(sum(position * impressions) / nullif(sum(impressions), 0), 1) as avg_position,
       min(date) as first_seen
  from public.gsc_query_daily q
 where date > current_date - 31
   and not exists (select 1 from public.gsc_query_daily o where o.query = q.query and o.date <= current_date - 31)
 group by query
 order by sum(impressions) desc;

revoke all on public.gsc_summary_28d, public.gsc_striking_distance, public.gsc_low_ctr_pages, public.gsc_new_queries from anon;
revoke insert, update, delete, truncate, references, trigger
  on public.gsc_summary_28d, public.gsc_striking_distance, public.gsc_low_ctr_pages, public.gsc_new_queries from authenticated;
