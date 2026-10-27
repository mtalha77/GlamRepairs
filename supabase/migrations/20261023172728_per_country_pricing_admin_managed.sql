-- Per country pricing, in minor units, managed from the studio.
-- pricing_regions held 5 hand-maintained rows in numeric. This replaces it for
-- new work: one row per country per plan, integers, with an audit trail.
create table if not exists public.country_pricing (
  country_code   text not null references public.countries(code) on delete cascade,
  plan_key       text not null,
  amount_minor   integer not null,
  currency       text not null,
  minor_units    smallint not null default 2,
  symbol         text not null default '',
  symbol_before  boolean not null default true,
  active         boolean not null default true,
  updated_at     timestamptz not null default now(),
  updated_by     uuid references auth.users(id) on delete set null,
  note           text,
  primary key (country_code, plan_key),

  constraint country_pricing_amount_nonneg check (amount_minor >= 0),
  constraint country_pricing_minor_units check (minor_units in (0,2,3)),
  constraint country_pricing_currency_fmt check (currency ~ '^[A-Z]{3}$')
);

-- A practitioner is paid in their own currency while the client pays in theirs.
-- Without a recorded rate the split cannot be computed, so it is stored per
-- payout rather than fetched live. A stale live rate is worse than a recorded one.
create table if not exists public.fx_rates (
  base        text not null,
  quote       text not null,
  rate        numeric(18,8) not null,
  as_of       date not null,
  source      text not null default 'manual',
  entered_by  uuid references auth.users(id) on delete set null,
  created_at  timestamptz not null default now(),
  primary key (base, quote, as_of),
  constraint fx_rates_positive check (rate > 0),
  constraint fx_rates_base_fmt check (base ~ '^[A-Z]{3}$'),
  constraint fx_rates_quote_fmt check (quote ~ '^[A-Z]{3}$'),
  constraint fx_rates_not_self check (base <> quote)
);

-- Seed from the countries table at a placeholder price so nothing is missing.
-- 🔴 These are NOT researched prices. Talha sets them in the studio.
insert into public.country_pricing (country_code, plan_key, amount_minor, currency, minor_units, symbol, note)
select c.code, 'transform',
       case c.currency
         when 'PKR' then 300000 when 'USD' then 2500 when 'GBP' then 2000
         when 'EUR' then 2400 when 'AED' then 9000 when 'SAR' then 9500
         when 'QAR' then 9000 when 'KWD' then 7500 when 'BHD' then 940
         when 'OMR' then 960 when 'INR' then 210000 when 'BDT' then 300000
         when 'NGN' then 4000000 when 'KES' then 320000 when 'ZAR' then 45000
         else 2500
       end,
       c.currency,
       case when c.currency in ('KWD','BHD','OMR') then 3
            when c.currency in ('JPY','KRW') then 0 else 2 end,
       case c.currency when 'PKR' then 'Rs ' when 'USD' then '$' when 'GBP' then 'GBP '
            when 'EUR' then 'EUR ' when 'INR' then 'Rs ' else c.currency || ' ' end,
       'Placeholder. Set a real price in the studio before enabling this country.'
  from public.countries c
on conflict (country_code, plan_key) do nothing;

-- What the app reads. Only enabled countries, never a placeholder by accident.
create or replace view public.pricing_for_country as
select c.code, c.name, c.currency, c.clients_enabled, c.gdpr,
       p.plan_key, p.amount_minor, p.minor_units, p.symbol, p.symbol_before,
       p.active as price_active,
       (p.note is not null and p.note like 'Placeholder%') as is_placeholder,
       round(p.amount_minor / power(10, p.minor_units)::numeric, p.minor_units) as amount_display
  from public.countries c
  join public.country_pricing p on p.country_code = c.code
 where p.active;

-- Studio control panel: one row per country, everything an admin needs.
create or replace view public.admin_country_panel as
select c.code, c.name, c.currency, c.index_standard, c.gdpr,
       c.research_status, c.researched_at, c.diaspora_priority,
       c.clients_enabled, c.practitioners_enabled,
       c.data_law, c.regulator_note,
       p.amount_minor, p.minor_units, p.symbol,
       round(p.amount_minor / power(10, p.minor_units)::numeric, p.minor_units) as price_display,
       (p.note is not null and p.note like 'Placeholder%') as price_is_placeholder,
       (select count(*) from public.practitioner_profiles pr
         where pr.country_code = c.code and pr.status = 'approved') as live_practitioners,
       (select count(*) from public.leads l
         where l.country_code = c.code and l.deleted_at is null and l.is_test = false) as clients,
       (select count(*) from public.area_pages a
         where a.country_code = c.code and a.status = 'published') as city_pages
  from public.countries c
  left join public.country_pricing p
         on p.country_code = c.code and p.plan_key = 'transform'
 order by c.diaspora_priority desc, c.sort_order;

-- 🔴 A country cannot be opened to clients while its price is still the
-- placeholder. This is the mistake that would otherwise charge a Nigerian
-- client the wrong amount on day one.
create or replace function public.guard_country_enable()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_placeholder boolean;
begin
  if new.clients_enabled and not coalesce(old.clients_enabled,false) then
    select (p.note is not null and p.note like 'Placeholder%')
      into v_placeholder
      from public.country_pricing p
     where p.country_code = new.code and p.plan_key = 'transform';

    if v_placeholder is null then
      raise exception 'cannot enable %: no price is set', new.name;
    end if;
    if v_placeholder then
      raise exception 'cannot enable %: the price is still a placeholder. Set it in the studio first.', new.name;
    end if;
  end if;
  return new;
end $$;

drop trigger if exists country_enable_guard on public.countries;
create trigger country_enable_guard
  before update on public.countries
  for each row execute function public.guard_country_enable();

-- Pakistan is live, so its price is real.
update public.country_pricing
   set note = 'Live. Rs 3,000.'
 where country_code = 'PK' and plan_key = 'transform';
