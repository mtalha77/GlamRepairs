-- Money is stored in minor units (paisa) as integers, never numeric or float.
-- Rs 2,000 is 200000. Rounding a revenue split in floating point produces
-- payouts that do not reconcile.

alter table public.consultation_settings
  add column if not exists default_practitioner_fee_minor integer not null default 200000,
  add column if not exists default_platform_fee_minor integer not null default 100000,
  add column if not exists currency text not null default 'PKR',
  add column if not exists cancellation_hours smallint not null default 12,
  add column if not exists note_due_hours smallint not null default 24,
  add column if not exists transcript_keep_days smallint not null default 30,
  add column if not exists payout_day smallint not null default 5;

create table if not exists public.practitioner_rates (
  id                     uuid primary key default gen_random_uuid(),
  practitioner_id        uuid not null references public.practitioner_profiles(id) on delete cascade,
  practitioner_fee_minor integer not null,
  platform_fee_minor     integer not null,
  currency               text not null default 'PKR',
  effective_from         timestamptz not null default now(),
  effective_to           timestamptz,
  note                   text,
  set_by                 uuid references auth.users(id) on delete set null,
  created_at             timestamptz not null default now(),

  constraint practitioner_rates_positive
    check (practitioner_fee_minor >= 0 and platform_fee_minor >= 0),
  constraint practitioner_rates_not_both_zero
    check (practitioner_fee_minor + platform_fee_minor > 0),
  constraint practitioner_rates_window
    check (effective_to is null or effective_to > effective_from),
  constraint practitioner_rates_currency
    check (currency in ('PKR','USD','GBP','AED'))
);

create extension if not exists btree_gist;

-- One rate per practitioner at any instant. An ambiguous fee is a dispute.
alter table public.practitioner_rates
  drop constraint if exists practitioner_rates_no_overlap;
alter table public.practitioner_rates
  add constraint practitioner_rates_no_overlap
  exclude using gist (
    practitioner_id with =,
    tstzrange(effective_from, effective_to) with &&
  );

create index if not exists practitioner_rates_lookup_idx
  on public.practitioner_rates (practitioner_id, effective_from desc);

-- The rate in force at a moment, falling back to the platform default.
create or replace function public.rate_for(p_practitioner uuid, p_at timestamptz default now())
returns table (practitioner_fee_minor integer, platform_fee_minor integer, currency text, rate_id uuid)
language plpgsql stable security definer set search_path = public as $$
begin
  return query
    select r.practitioner_fee_minor, r.platform_fee_minor, r.currency, r.id
      from public.practitioner_rates r
     where r.practitioner_id = p_practitioner
       and r.effective_from <= p_at
       and (r.effective_to is null or r.effective_to > p_at)
     limit 1;

  if found then return; end if;

  return query
    select s.default_practitioner_fee_minor, s.default_platform_fee_minor,
           s.currency, null::uuid
      from public.consultation_settings s
     limit 1;
end $$;
