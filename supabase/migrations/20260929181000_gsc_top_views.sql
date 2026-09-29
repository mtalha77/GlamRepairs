-- HANDOVER-46: top queries and pages over the same 28 settled days as
-- gsc_summary_28d, aggregated in the database so the page never pulls
-- (and PostgREST never truncates) raw daily rows.
create or replace view public.gsc_top_queries_28d with (security_invoker = true) as
select query,
       sum(clicks) as clicks,
       sum(impressions) as impressions,
       round(case when sum(impressions) = 0 then 0::numeric
                  else sum(clicks)::numeric / sum(impressions)::numeric * 100 end, 2) as ctr_pct,
       round(sum(position * impressions) / nullif(sum(impressions), 0), 1) as avg_position
  from public.gsc_query_daily
 where date > current_date - 31
 group by query;

create or replace view public.gsc_top_pages_28d with (security_invoker = true) as
select page,
       sum(clicks) as clicks,
       sum(impressions) as impressions,
       round(case when sum(impressions) = 0 then 0::numeric
                  else sum(clicks)::numeric / sum(impressions)::numeric * 100 end, 2) as ctr_pct,
       round(sum(position * impressions) / nullif(sum(impressions), 0), 1) as avg_position
  from public.gsc_page_daily
 where date > current_date - 31
 group by page;

revoke all on public.gsc_top_queries_28d, public.gsc_top_pages_28d from anon;
revoke insert, update, delete, truncate, references, trigger
  on public.gsc_top_queries_28d, public.gsc_top_pages_28d from authenticated;
grant select on public.gsc_top_queries_28d, public.gsc_top_pages_28d to authenticated;
