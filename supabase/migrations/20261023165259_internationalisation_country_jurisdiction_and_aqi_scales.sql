-- ============ 1. Area pages become international ============
-- province alone cannot carry "Greater London" and "Punjab" and "California".
alter table public.area_pages
  add column if not exists country_code text,
  add column if not exists country_name text,
  add column if not exists index_standard text;

update public.area_pages
   set country_code = coalesce(country_code,'PK'),
       country_name = coalesce(country_name,'Pakistan'),
       index_standard = coalesce(index_standard,'US_AQI')
 where country_code is null;

alter table public.area_pages
  drop constraint if exists area_pages_country_code_fmt;
alter table public.area_pages
  add constraint area_pages_country_code_fmt
  check (country_code ~ '^[A-Z]{2}$');

-- Which national index the page should display as its headline number.
alter table public.area_pages
  drop constraint if exists area_pages_index_standard_check;
alter table public.area_pages
  add constraint area_pages_index_standard_check
  check (index_standard in ('US_AQI','UK_DAQI','EU_AQI','AU_AQI','CA_AQHI','IN_AQI','WHO_PM25'));

create index if not exists area_pages_country_idx
  on public.area_pages (country_code, sort_order);

-- ============ 2. Air quality: PM2.5 is the only comparable number ============
-- 🔴 US AQI, UK DAQI (1 to 10), EU AQI, Canadian AQHI (1 to 10+) and Australian
-- AQI are DIFFERENT, NONLINEAR scales. They cannot be compared, plotted
-- together, ranked against each other, or averaged.
-- PM2.5 in ug/m3 is the one measurement that means the same thing everywhere.
-- So PM2.5 is the canonical value and the local index is presentation only.
alter table public.air_quality_readings
  add column if not exists local_index_standard text,
  add column if not exists local_index_value numeric,
  add column if not exists local_index_band text;

comment on column public.air_quality_readings.local_index_value is
  'Presentation only. NEVER compare across standards. Use pm2_5 for any comparison, ranking, chart axis or average.';

alter table public.air_quality_readings
  drop constraint if exists air_quality_readings_local_standard_check;
alter table public.air_quality_readings
  add constraint air_quality_readings_local_standard_check
  check (local_index_standard is null or
         local_index_standard in ('US_AQI','UK_DAQI','EU_AQI','AU_AQI','CA_AQHI','IN_AQI'));

-- A local index value is meaningless without saying which scale it is on.
alter table public.air_quality_readings
  drop constraint if exists air_quality_readings_local_needs_standard;
alter table public.air_quality_readings
  add constraint air_quality_readings_local_needs_standard
  check (local_index_value is null or local_index_standard is not null);

-- ============ 3. Practitioners: country, jurisdiction, who they can serve ============
alter table public.practitioner_profiles
  add column if not exists country_code text,
  add column if not exists country_name text,
  add column if not exists regulator text,
  add column if not exists licence_no text,
  add column if not exists licence_verified_at timestamptz,
  add column if not exists serves_countries text[] not null default '{}',
  add column if not exists excluded_countries text[] not null default '{}';

update public.practitioner_profiles
   set country_code = coalesce(country_code,'PK'),
       country_name = coalesce(country_name,'Pakistan')
 where country_code is null;

alter table public.practitioner_profiles
  drop constraint if exists practitioner_profiles_country_fmt;
alter table public.practitioner_profiles
  add constraint practitioner_profiles_country_fmt
  check (country_code is null or country_code ~ '^[A-Z]{2}$');

-- 🔴 Where a practitioner practises in a regulated jurisdiction, they cannot go
-- live without the regulator and the licence number recorded and checked.
-- Pakistan has no licensing body for aestheticians; many other countries do.
alter table public.practitioner_profiles
  drop constraint if exists practitioner_profiles_regulated_needs_licence;
alter table public.practitioner_profiles
  add constraint practitioner_profiles_regulated_needs_licence
  check (
    status <> 'approved'
    or regulator is null
    or (licence_no is not null and licence_verified_at is not null)
  );

-- ============ 4. Clients: country drives compliance, not just currency ============
alter table public.leads
  add column if not exists country_code text,
  add column if not exists client_timezone text,
  add column if not exists gdpr_region boolean not null default false,
  add column if not exists consent_version text,
  add column if not exists consent_at timestamptz,
  add column if not exists erasure_requested_at timestamptz,
  add column if not exists erasure_completed_at timestamptz;

alter table public.leads drop constraint if exists leads_country_fmt;
alter table public.leads add constraint leads_country_fmt
  check (country_code is null or country_code ~ '^[A-Z]{2}$');

create index if not exists leads_erasure_due_idx
  on public.leads (erasure_requested_at)
  where erasure_requested_at is not null and erasure_completed_at is null;

-- ============ 5. Country reference, editable without a deploy ============
create table if not exists public.countries (
  code             text primary key,
  name             text not null,
  currency         text not null,
  index_standard   text not null default 'US_AQI',
  gdpr             boolean not null default false,
  clients_enabled  boolean not null default false,
  practitioners_enabled boolean not null default false,
  regulator_note   text,
  sort_order       smallint not null default 100,
  constraint countries_code_fmt check (code ~ '^[A-Z]{2}$'),
  constraint countries_index_check
    check (index_standard in ('US_AQI','UK_DAQI','EU_AQI','AU_AQI','CA_AQHI','IN_AQI','WHO_PM25'))
);

insert into public.countries (code,name,currency,index_standard,gdpr,clients_enabled,practitioners_enabled,regulator_note,sort_order) values
 ('PK','Pakistan','PKR','US_AQI',false,true,true,'No licensing body for aestheticians. Credential verification is our own.',1),
 ('GB','United Kingdom','GBP','UK_DAQI',true,false,false,'No single aesthetician licence. UK GDPR applies. ASA rules govern advertising claims.',2),
 ('US','United States','USD','US_AQI',false,false,false,'Esthetician licensing is state by state. Confirm before taking clients or practitioners.',3),
 ('CA','Canada','CAD','CA_AQHI',false,false,false,'Provincial regulation. PIPEDA applies to personal data.',4),
 ('AU','Australia','AUD','AU_AQI',false,false,false,'State regulation. TGA rules govern therapeutic claims.',5),
 ('AE','United Arab Emirates','AED','US_AQI',false,false,false,'DHA and DOH licensing. Confirm before operating.',6),
 ('IN','India','INR','IN_AQI',false,false,false,'Large market, different AQI scale.',7),
 ('SA','Saudi Arabia','SAR','US_AQI',false,false,false,'Confirm licensing before operating.',8),
 ('DE','Germany','EUR','EU_AQI',true,false,false,'GDPR. Health data is special category under Article 9.',9),
 ('ZA','South Africa','ZAR','US_AQI',false,false,false,'POPIA applies to personal data.',10)
on conflict (code) do nothing;

-- ============ 6. Data subject requests ============
create table if not exists public.data_requests (
  id            uuid primary key default gen_random_uuid(),
  lead_id       uuid references public.leads(id) on delete set null,
  email         text not null,
  country_code  text,
  kind          text not null,
  received_at   timestamptz not null default now(),
  due_at        timestamptz not null,
  completed_at  timestamptz,
  completed_by  uuid references auth.users(id) on delete set null,
  note          text,
  constraint data_requests_kind_check
    check (kind in ('access','erasure','rectification','portability','objection','restriction')),
  constraint data_requests_due_after_received check (due_at > received_at)
);

create index if not exists data_requests_open_idx
  on public.data_requests (due_at) where completed_at is null;
