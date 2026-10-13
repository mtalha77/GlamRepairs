-- Public practitioner directory fields and consent.
--
-- Applied to production directly on 13 October 2026; recorded here so the
-- repository matches the database. A profile is shown publicly only once
-- the practitioner has agreed (public_consent_at), and an approved
-- practitioner cannot take clients without that agreement.

alter table public.practitioner_profiles
  add column if not exists city text,
  add column if not exists years_experience smallint,
  add column if not exists specialisms text[] not null default '{}',
  add column if not exists languages text[] not null default '{"English","Urdu"}',
  add column if not exists public_consent_at timestamptz,
  add column if not exists public_consent_version text;

update public.practitioner_profiles
   set public_consent_at = coalesce(public_consent_at, now()),
       public_consent_version = coalesce(public_consent_version, 'founder-implied-2026-10')
 where slug = 'ayma-arif' and public_consent_at is null;

alter table public.practitioner_profiles
  drop constraint if exists practitioner_profiles_public_needs_consent;
alter table public.practitioner_profiles
  add constraint practitioner_profiles_public_needs_consent
  check (status <> 'approved' or accepting_clients = false or public_consent_at is not null);

drop view if exists public.practitioners_public;
create view public.practitioners_public as
select p.id, p.slug, p.full_name, p.title, p.credentials, p.photo_url, p.bio,
       p.profiles, p.kind, p.city, p.years_experience, p.specialisms, p.languages,
       p.reg_body, p.reg_no, p.accepting_clients,
       (select min(s.starts_at) from public.availability_slots s
         where s.practitioner_id = p.id and s.status = 'open'
           and s.starts_at > now() + interval '24 hours') as next_available_at
  from public.practitioner_profiles p
 where p.status = 'approved'
   and p.public_consent_at is not null;
