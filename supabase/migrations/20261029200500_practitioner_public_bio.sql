-- The profile page needs the published bio; it is already public on
-- /authors through practitioners_public. Added at the end of the view.
create or replace view public.practitioner_public
with (security_invoker = true) as
select
  p.id,
  p.slug,
  p.full_name                                   as display_name,
  coalesce(p.title, 'Certified Aesthetics Practitioner') as role_title,
  p.country_code,
  p.country_name,
  p.photo_url                                   as photo_path,
  upper(left(split_part(p.full_name, ' ', 1), 1) ||
        left(nullif(split_part(p.full_name, ' ', 2), ''), 1)) as avatar_initials,
  p.years_experience::integer                   as years_practising,
  p.assessments_count,
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
  p.bio
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
  and p.accepting_clients = true;

revoke all on public.practitioner_public from anon, authenticated;
grant select on public.practitioner_public to service_role;
