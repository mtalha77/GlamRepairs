-- Handover 67 Parts 4 and 6.
--
-- 1. The publication bar. Approval no longer publishes a skeleton: a
--    practitioner appears in practitioner_public (the directory, the
--    homepage, their profile page and the sitemap) only with a bio and at
--    least one focus area. Below it they stay approved and assignable; only
--    the public card waits. Both live practitioners clear it today.
-- 2. practitioner_public gains updated_at (appended), for sitemap lastmod.
-- 3. practitioner_readiness gains the bar, so the checklist can name what
--    is missing.
-- 4. practitioner_publication_events: when a profile went on or came off
--    the website, and whether the sitemap was resubmitted. Append only.

create or replace function public.profile_publishable(p_bio text, p_specialisms text[])
returns boolean language sql immutable as $$
  select nullif(trim(coalesce(p_bio, '')), '') is not null
     and coalesce(array_length(p_specialisms, 1), 0) >= 1
$$;

create or replace view public.practitioner_public with (security_invoker = true) as
 SELECT p.id,
    p.slug,
    p.full_name AS display_name,
        CASE p.track
            WHEN 'medical'::text THEN 'MBBS, PMDC registered'::text
            ELSE 'Certified Aesthetics Practitioner'::text
        END AS role_title,
    p.country_code,
    p.country_name,
    p.photo_url AS photo_path,
    upper("left"(split_part(p.full_name, ' '::text, 1), 1) || "left"(NULLIF(split_part(p.full_name, ' '::text, 2), ''::text), 1)) AS avatar_initials,
    p.years_experience::integer AS years_practising,
    ( SELECT
                CASE
                    WHEN count(*) >= 25 THEN count(*)::integer
                    ELSE NULL::integer
                END AS "case"
           FROM studio_reports sr
             JOIN leads l ON l.id = sr.lead_id
          WHERE sr.created_by = p.user_id AND sr.sent_at IS NOT NULL AND l.is_test = false AND l.deleted_at IS NULL) AS assessments_count,
        CASE
            WHEN r.n >= 10 THEN r.avg_rating
            ELSE NULL::numeric
        END AS rating,
    COALESCE(r.n, 0::bigint)::integer AS rating_count,
    COALESCE(p.specialisms[1:3], '{}'::text[]) AS focus_areas,
    p.practitioner_quote,
        CASE
            WHEN p.track <> 'medical'::text AND public.is_medical_credential(p.credentials) THEN NULL::text
            ELSE p.credentials
        END AS credential_title,
    p.credential_ref,
    p.languages,
    ( SELECT min(s.starts_at) AS min
           FROM availability_slots s
          WHERE s.practitioner_id = p.id AND s.status = 'open'::text AND s.starts_at > (now() + '24:00:00'::interval)) AS next_available_at,
    p.bio,
    p.profile_story,
    p.focus_notes,
    p.timezone,
    (EXISTS ( SELECT 1
           FROM practitioner_documents d
          WHERE d.practitioner_id = p.id AND d.kind = 'degree'::text AND d.verified AND d.deleted_at IS NULL)) AS degree_verified,
    p.updated_at
   FROM practitioner_profiles p
     LEFT JOIN LATERAL ( SELECT count(*) AS n,
            round(avg(f.rating), 1) AS avg_rating
           FROM consultation_feedback f
             JOIN appointments a ON a.id = f.appointment_id
             JOIN leads l ON l.id = a.lead_id
          WHERE a.practitioner_id = p.id AND f.rating IS NOT NULL AND l.is_test = false AND l.deleted_at IS NULL) r ON true
  WHERE p.status = 'approved'::text
    AND p.public_consent_at IS NOT NULL
    AND p.accepting_clients = true
    AND p.accepted_terms_at IS NOT NULL
    AND p.accepted_terms_version IS NOT NULL
    AND (p.track <> 'medical'::text OR p.pmdc_verified_at > (now() - '6 mons'::interval))
    AND public.profile_publishable(p.bio, p.specialisms);

create or replace view public.practitioner_readiness with (security_invoker = true) as
select p.id, p.slug, p.full_name, p.status, p.track,
  (p.status = 'approved')                                   as approved,
  (p.accepted_terms_at is not null
     and p.accepted_terms_version is not null)              as terms_signed,
  p.accepted_terms_version                                  as terms_version,
  p.accepted_terms_at                                       as terms_signed_at,
  (p.public_consent_at is not null)                         as consented,
  p.accepting_clients                                       as accepting,
  p.can_review                                              as can_review,
  coalesce(p.profile_photo_verified, false)                 as photo_verified,
  (p.photo_url is not null)                                 as has_photo,
  (coalesce(length(p.bio), 0) > 80)                         as bio_ok,
  (p.payout_method is not null)                             as payout_set,
  (p.user_id is not null)                                   as has_account,
  (p.track <> 'medical'
    or p.pmdc_verified_at > now() - interval '6 months')    as licence_ok,
  (exists (select 1 from public.practitioner_documents d
           where d.practitioner_id = p.id and d.kind = 'degree'
             and d.verified and d.deleted_at is null))      as degree_verified,
  (exists (select 1 from public.practitioner_public v where v.id = p.id)) as live,
  p.probation_reports_remaining,
  coalesce(p.probation_waived, false)                       as probation_waived,
  public.profile_publishable(p.bio, p.specialisms)          as profile_complete,
  (nullif(trim(coalesce(p.bio, '')), '') is not null)       as has_bio,
  (coalesce(array_length(p.specialisms, 1), 0) >= 1)        as has_focus
from public.practitioner_profiles p
where p.offboarded_at is null;

create table if not exists public.practitioner_publication_events (
  id uuid primary key default gen_random_uuid(),
  practitioner_id uuid not null references public.practitioner_profiles(id) on delete restrict,
  event text not null check (event in ('published', 'unpublished')),
  at timestamptz not null default now(),
  actor_id uuid references auth.users(id) on delete set null,
  sitemap_submitted boolean not null default false,
  detail text
);
create index if not exists practitioner_publication_events_idx
  on public.practitioner_publication_events (practitioner_id, at desc);
alter table public.practitioner_publication_events enable row level security;
revoke all on public.practitioner_publication_events from anon, authenticated;
grant select, insert on public.practitioner_publication_events to service_role;

create or replace function public.guard_publication_events_append_only()
returns trigger language plpgsql as $$
begin
  raise exception 'Publication events are append only.';
end $$;
drop trigger if exists trg_publication_events_append_only on public.practitioner_publication_events;
create trigger trg_publication_events_append_only
  before update or delete on public.practitioner_publication_events
  for each row execute function public.guard_publication_events_append_only();

revoke all on public.practitioner_readiness from anon, authenticated;
