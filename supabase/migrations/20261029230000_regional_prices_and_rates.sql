-- Talha, 29 October 2026: "currency is still not changed in the website for
-- practitioners and users out of pakistan ... Rate per consultation in
-- practitioner should be changed to region also."
--
-- 1. plans_public lists every country with a REAL anchor price (a price a
--    person chose for that market; placeholders excluded), not only the
--    countries switched on for clients. Payment from those countries is by
--    international bank transfer arranged on WhatsApp (Talha, 29 October).
--    `clients_enabled` keeps its meaning: the legal-clearance switch in
--    Studio → Countries. It is no longer what decides which currency shows.
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
    ((s.available_until is null) or (s.available_until > now())) as currently_offered,
    c.code as region_code,
    cp.currency,
    cp.symbol,
    (case when s.plan_key = 'free' then 0::numeric
          else (cp.amount_minor::numeric / power(10::double precision, cp.minor_units::double precision)::numeric) end)::numeric(12,2) as price,
    coalesce((select jsonb_agg(f.feature order by f.sort_order) from plan_features f
               where f.plan_key = s.plan_key and f.active), '[]'::jsonb) as features,
    case when s.plan_key = 'free' then 0 else cp.amount_minor end as amount_minor,
    cp.minor_units
from plan_settings s
cross join countries c
join country_pricing cp on cp.country_code = c.code and cp.plan_key = 'transform' and cp.active
where s.active
  and (c.clients_enabled or cp.note is null or cp.note not like 'Placeholder%')
  and (s.plan_key = 'free' or s.plan_key = cp.plan_key);

-- 2. A practitioner's default rate is the share of THEIR country's price, in
--    their currency (a Nigerian practitioner earns in naira from the naira
--    price). A country without a real price, or a practitioner with no
--    country, falls back to Pakistan. An explicit rate set in Studio still
--    wins, as before.
create or replace function public.rate_for(p_practitioner uuid, p_at timestamp with time zone default now())
returns table(practitioner_fee_minor integer, platform_fee_minor integer, currency text, rate_id uuid)
language plpgsql stable security definer set search_path to 'public' as $function$
declare v_price integer; v_currency text; v_pct smallint; v_prac integer; v_country text;
begin
  return query
    select r.practitioner_fee_minor, r.platform_fee_minor, r.currency, r.id
      from public.practitioner_rates r
     where r.practitioner_id = p_practitioner
       and r.effective_from <= p_at
       and (r.effective_to is null or r.effective_to > p_at)
     limit 1;
  if found then return; end if;

  select p.country_code into v_country from public.practitioner_profiles p where p.id = p_practitioner;

  select cp.amount_minor, cp.currency into v_price, v_currency
    from public.country_pricing cp
   where cp.country_code = v_country and cp.plan_key = 'transform' and cp.active
     and (cp.note is null or cp.note not like 'Placeholder%');

  if v_price is null then
    select cp.amount_minor, cp.currency into v_price, v_currency
      from public.country_pricing cp
     where cp.country_code = 'PK' and cp.plan_key = 'transform' and cp.active;
  end if;

  select s.practitioner_share_pct into v_pct from public.consultation_settings s limit 1;

  if v_price is not null and v_pct is not null then
    v_prac := round(v_price * v_pct / 100.0);
    return query select v_prac, v_price - v_prac, v_currency, null::uuid;
    return;
  end if;

  return query
    select s.default_practitioner_fee_minor, s.default_platform_fee_minor, s.currency, null::uuid
      from public.consultation_settings s limit 1;
end $function$;
