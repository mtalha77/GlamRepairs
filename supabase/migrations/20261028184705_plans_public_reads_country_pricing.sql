-- HANDOVER-62 Part 0: one pricing system. plans_public used to join
-- plan_prices and pricing_regions, the old five-region tables that disagreed
-- with country_pricing (GB at 18 there, 20 here). It now reads
-- country_pricing, and only for countries open to clients: a price nobody
-- can pay is not shown (Part 1). region_code now carries the country code.
--
-- amount_minor and minor_units are added at the end, and the app formats
-- money from those with Intl.NumberFormat. `price` keeps its old
-- numeric(12,2) type because changing a view column's type means dropping
-- the view; it would round a 3-decimal currency (KWD, BHD, OMR), so nothing
-- may format money from it.
create or replace view public.plans_public as
select s.plan_key,
       s.label,
       s.tagline,
       s.sort_order,
       s.photos_required,
       s.photos_max,
       s.includes_video_call,
       s.video_minutes,
       s.includes_whatsapp,
       s.support_days,
       s.expert_review,
       s.available_until,
       s.available_until is null or s.available_until > now() as currently_offered,
       c.code as region_code,
       cp.currency,
       cp.symbol,
       (case when s.plan_key = 'free' then 0
             else cp.amount_minor / power(10, cp.minor_units)::numeric end)::numeric(12,2) as price,
       coalesce((select jsonb_agg(f.feature order by f.sort_order)
                   from public.plan_features f
                  where f.plan_key = s.plan_key and f.active), '[]'::jsonb) as features,
       case when s.plan_key = 'free' then 0 else cp.amount_minor end as amount_minor,
       cp.minor_units
  from public.plan_settings s
  cross join public.countries c
  join public.country_pricing cp
    on cp.country_code = c.code and cp.plan_key = 'transform' and cp.active
 where s.active
   and c.clients_enabled
   and (s.plan_key = 'free' or s.plan_key = cp.plan_key);
