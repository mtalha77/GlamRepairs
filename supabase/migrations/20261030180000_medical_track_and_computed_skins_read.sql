-- Handover 61, Parts 7 and 8.4 (30 October 2026).
--
-- 8.4: "600+ Skins read" was a typed number. One real report had been sent.
-- The card now counts reports actually sent by that practitioner to real,
-- live clients, and shows nothing below 25, so the stat comes back on its
-- own once it is worth showing. The typed value is cleared.
--
-- 7: the data layer for MBBS doctors, with the rule enforced in the schema
-- rather than in review. Nothing on the site says "doctor" yet; the copy
-- waits until a doctor's profile is live and verified (Part 7.7).
--   * practitioner_profiles.track: 'aesthetics' or 'medical'. Existing
--     kind = 'doctor' rows carry over.
--   * A medical profile cannot be approved without a PMDC registration
--     number that a super admin has verified.
--   * The role string is derived from the track in the public view; the
--     title column accepts only the line for its own track.
--   * PMDC verification lapses after six months: the public view drops a
--     medical profile whose check is older than that, until it is
--     re-verified. Registration expires; the page must not outlive it.
--   * countries.medical_track_enabled, default false. Outside Pakistan it
--     cannot be switched on without a recorded legal advice reference.

alter table public.practitioner_profiles
  add column if not exists track text not null default 'aesthetics'
    check (track in ('aesthetics', 'medical')),
  add column if not exists pmdc_registration_no text,
  add column if not exists pmdc_verified_at timestamptz,
  add column if not exists pmdc_verified_by uuid references auth.users(id);

update public.practitioner_profiles set track = 'medical' where kind = 'doctor' and track <> 'medical';

alter table public.practitioner_profiles
  drop constraint if exists medical_requires_verified_pmdc;
alter table public.practitioner_profiles
  add constraint medical_requires_verified_pmdc check (
    track <> 'medical' or status <> 'approved'
    or (pmdc_registration_no is not null and length(trim(pmdc_registration_no)) > 3 and pmdc_verified_at is not null)
  );

alter table public.practitioner_profiles drop constraint if exists practitioner_profiles_title_approved;
alter table public.practitioner_profiles
  add constraint practitioner_profiles_title_approved check (
    title is null
    or (track = 'aesthetics' and title = 'Certified Aesthetics Practitioner')
    or (track = 'medical' and title = 'MBBS, PMDC registered')
  );

update public.practitioner_profiles set assessments_count = null where assessments_count is not null;

create or replace view public.practitioner_public
with (security_invoker = true) as
select
  p.id,
  p.slug,
  p.full_name                                   as display_name,
  case p.track when 'medical' then 'MBBS, PMDC registered'
               else 'Certified Aesthetics Practitioner' end as role_title,
  p.country_code,
  p.country_name,
  p.photo_url                                   as photo_path,
  upper(left(split_part(p.full_name, ' ', 1), 1) ||
        left(nullif(split_part(p.full_name, ' ', 2), ''), 1)) as avatar_initials,
  p.years_experience::integer                   as years_practising,
  (select case when count(*) >= 25 then count(*)::integer end
     from public.studio_reports sr
     join public.leads l on l.id = sr.lead_id
    where sr.created_by = p.user_id and sr.sent_at is not null
      and l.is_test = false and l.deleted_at is null) as assessments_count,
  case when r.n >= 10 then r.avg_rating end     as rating,
  coalesce(r.n, 0)::integer                     as rating_count,
  coalesce(p.specialisms[1:3], '{}')            as focus_areas,
  p.practitioner_quote,
  p.credentials                                 as credential_title,
  p.credential_ref,
  p.languages,
  (select min(s.starts_at) from public.availability_slots s
    where s.practitioner_id = p.id and s.status = 'open'
      and s.starts_at > now() + interval '24 hours') as next_available_at,
  p.bio,
  p.profile_story,
  p.focus_notes,
  p.timezone,
  exists (select 1 from public.practitioner_documents d
           where d.practitioner_id = p.id and d.kind = 'degree' and d.verified and d.deleted_at is null) as degree_verified
from public.practitioner_profiles p
left join lateral (
  select count(*) as n, round(avg(f.rating)::numeric, 1) as avg_rating
    from public.consultation_feedback f
    join public.appointments a on a.id = f.appointment_id
    join public.leads l on l.id = a.lead_id
   where a.practitioner_id = p.id and f.rating is not null
     and l.is_test = false and l.deleted_at is null
) r on true
where p.status = 'approved'
  and p.public_consent_at is not null
  and p.accepting_clients = true
  and (p.track <> 'medical' or p.pmdc_verified_at > now() - interval '6 months');

revoke all on public.practitioner_public from anon, authenticated;
grant select on public.practitioner_public to service_role;

alter table public.countries
  add column if not exists medical_track_enabled boolean not null default false,
  add column if not exists medical_legal_advice_ref text;

comment on column public.countries.medical_track_enabled is
  'Default false. Only set true on written legal advice for that jurisdiction. Clients in this country cannot book the medical track while false.';

create or replace function public.guard_country_enable()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
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
    if new.payment_method is null then
      raise exception 'cannot enable %: no payment method. A price nobody can pay is not a real price.', new.name;
    end if;
  end if;

  -- Handover 61 Part 7.4: a PMDC registration does not authorise diagnosis
  -- of a patient in another country. Outside Pakistan the medical track
  -- needs a recorded reference to written legal advice for that country.
  if new.medical_track_enabled and not coalesce(old.medical_track_enabled, false)
     and new.code <> 'PK'
     and coalesce(trim(new.medical_legal_advice_ref), '') = '' then
    raise exception 'cannot enable the medical track in %: record the written legal advice for this country first (medical_legal_advice_ref).', new.name;
  end if;
  return new;
end $function$;
