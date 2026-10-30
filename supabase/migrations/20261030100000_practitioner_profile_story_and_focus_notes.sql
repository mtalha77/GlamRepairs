-- The full profile page (/practitioners/[slug]): the practitioner's own
-- words, a sentence on how they approach each area they read most, and
-- whether their degree document was actually checked (the "verified" pill
-- shows only then). Applied to the database on 30 October 2026.
alter table public.practitioner_profiles
  add column if not exists profile_story text check (profile_story is null or length(profile_story) <= 3000),
  add column if not exists focus_notes jsonb not null default '{}'::jsonb;

update public.practitioner_profiles set
  profile_story = 'Before Glam Repairs, I spent five years in practice at aesthetic clinics in Lahore, assessing skin face to face. That is where the pattern recognition comes from. Several hundred faces a year, in the same climate and the same hard water, is what makes a photograph readable.' || chr(10) || chr(10) ||
    'Most people arrive having bought four or five things that did not work. Almost none of them need a sixth. What they need is for somebody to look at what they are already doing, in the order they are doing it, and say which part is causing the problem. That is usually the whole assessment.' || chr(10) || chr(10) ||
    'I do not recommend brands. I recommend ingredients and strengths, because the right ingredient at the wrong concentration is the most common reason a routine fails quietly for months.',
  focus_notes = jsonb_build_object(
    'Acne and acne marks', 'Usually a question of what to remove rather than what to add. Most routines that are not working contain two actives that cancel each other out.',
    'Pigmentation', 'Marks, melasma and sun damage behave differently and need different timelines. Telling them apart from a photograph is most of the work.',
    'Barrier repair', 'Hard water and over-exfoliation together. Common, slow to show, and faster to fix than people expect once the cause is named.')
where slug = 'ayma-arif' and profile_story is null;

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
  and p.accepting_clients = true;

revoke all on public.practitioner_public from anon, authenticated;
grant select on public.practitioner_public to service_role;
