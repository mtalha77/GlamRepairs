-- Talha, 29 October 2026: "make sure the split is 50 for now". The default
-- was a fixed Rs 2,000 / Rs 1,000 (two thirds to the practitioner). It is
-- now a share of the live Pakistan price in country_pricing, so the split
-- stays 50/50 when the price changes. A per-practitioner override in
-- practitioner_rates still wins; bookings keep the fee they were made at.
alter table public.consultation_settings
  add column if not exists practitioner_share_pct smallint not null default 50;
alter table public.consultation_settings
  add constraint consultation_settings_share_range check (practitioner_share_pct between 0 and 100);
update public.consultation_settings
   set practitioner_share_pct = 50,
       default_practitioner_fee_minor = 150000,
       default_platform_fee_minor = 150000;

create or replace function public.rate_for(p_practitioner uuid, p_at timestamptz default now())
returns table(practitioner_fee_minor integer, platform_fee_minor integer, currency text, rate_id uuid)
language plpgsql stable security definer set search_path to 'public'
as $function$
declare v_price integer; v_currency text; v_pct smallint; v_prac integer;
begin
  return query
    select r.practitioner_fee_minor, r.platform_fee_minor, r.currency, r.id
      from public.practitioner_rates r
     where r.practitioner_id = p_practitioner
       and r.effective_from <= p_at
       and (r.effective_to is null or r.effective_to > p_at)
     limit 1;
  if found then return; end if;

  select cp.amount_minor, cp.currency into v_price, v_currency
    from public.country_pricing cp
   where cp.country_code = 'PK' and cp.plan_key = 'transform' and cp.active;
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
