-- Handover 65 Part 0: why a practitioner is not live, and the agreement gate.
--
-- 1. accepted_terms_version. accepted_terms_at on its own could not say WHAT
--    was accepted, and it turned out to matter: approve_practitioner_application()
--    copied practitioner_applications.agreed_at into it, and that timestamp is
--    the application's document-retention tick ("GlamRepairs may keep these
--    documents to review my application..."), not a practitioner agreement.
--    No agreement is shown or signed in the product; /join says a written one
--    is sent before the first client. So the copy stops, and an agreement only
--    counts once it is recorded with the version that was signed.
--
-- 2. The founder record is grandfathered visibly, the same way her public
--    consent already is ('founder-implied-2026-10'), instead of by accident.
--
-- 3. approved_requires_terms: no approved profile without a recorded agreement,
--    and practitioner_public says so too, so the rule cannot be bypassed by a
--    direct update.
--
-- 4. practitioner_readiness: every gate between a profile and the website,
--    one row per practitioner, for the studio checklist.

alter table public.practitioner_profiles
  add column if not exists accepted_terms_version text;

comment on column public.practitioner_profiles.accepted_terms_at is
  'When the practitioner agreement named in accepted_terms_version was signed. Counts only with a version.';
comment on column public.practitioner_profiles.accepted_terms_version is
  'Which practitioner agreement was signed. founder-implied-2026-10 marks the founder record.';

update public.practitioner_profiles
   set accepted_terms_at = coalesce(accepted_terms_at, approved_at, created_at),
       accepted_terms_version = 'founder-implied-2026-10',
       updated_at = now()
 where slug = 'ayma-arif'
   and accepted_terms_version is null;

alter table public.practitioner_profiles
  drop constraint if exists approved_requires_terms;
alter table public.practitioner_profiles
  add constraint approved_requires_terms check (
    status <> 'approved'
    or (accepted_terms_at is not null and accepted_terms_version is not null)
  );

-- The application tick is a data consent, not the agreement: stop carrying it over.
create or replace function public.approve_practitioner_application(p_app uuid, p_by uuid, p_note text default null::text)
 returns uuid
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare a record; v_slug text; v_base text; v_n int := 1; v_profile uuid;
begin
  select * into a from public.practitioner_applications
   where id = p_app and deleted_at is null for update;
  if not found then raise exception 'application % not found', p_app; end if;
  if a.status = 'approved' then raise exception 'application % already approved', p_app; end if;
  if a.profile_id is not null then raise exception 'application % already has a profile', p_app; end if;

  if not exists (select 1 from public.practitioner_documents d
                  where d.application_id = a.id and d.kind='degree'
                    and d.verified and d.deleted_at is null) then
    raise exception 'cannot approve %: the degree document has not been verified', a.full_name;
  end if;

  if not exists (select 1 from public.practitioner_documents d
                  where d.application_id = a.id and d.kind='photo'
                    and d.verified and d.deleted_at is null) then
    raise exception 'cannot approve %: the profile photograph has not been checked', a.full_name;
  end if;

  v_base := regexp_replace(lower(trim(a.full_name)), '[^a-z0-9]+', '-', 'g');
  v_base := trim(both '-' from v_base);
  if v_base = '' then v_base := 'practitioner'; end if;
  v_slug := v_base;
  while exists (select 1 from public.practitioner_profiles where slug = v_slug) loop
    v_n := v_n + 1;
    v_slug := v_base || '-' || v_n;
  end loop;

  insert into public.practitioner_profiles
    (slug, full_name, title, credentials, kind, reg_body, reg_no, city,
     years_experience, status, can_review, accepting_clients,
     accepted_terms_at, onboarded_from, edited_by)
  values
    (v_slug, a.full_name, 'Certified Aesthetics Practitioner',
     a.qualification, a.kind, a.reg_body, a.reg_no, a.city,
     a.years_experience, 'pending', false, false, null, a.id, p_by)
  returning id into v_profile;

  update public.practitioner_documents
     set practitioner_id = v_profile, application_id = null, purge_after = null
   where application_id = a.id and deleted_at is null;

  update public.practitioner_applications
     set status = 'approved', profile_id = v_profile,
         reviewed_by = p_by, reviewed_at = now(),
         decision_note = coalesce(p_note, decision_note, 'Approved'),
         updated_at = now()
   where id = a.id;

  if a.invite_id is not null then
    update public.practitioner_invites
       set accepted_at = coalesce(accepted_at, now()), application_id = a.id
     where id = a.invite_id;
  end if;

  return v_profile;
end $function$;

-- The go-live rule, with the agreement in it. Columns unchanged.
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
    p.credentials AS credential_title,
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
          WHERE d.practitioner_id = p.id AND d.kind = 'degree'::text AND d.verified AND d.deleted_at IS NULL)) AS degree_verified
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
    AND (p.track <> 'medical'::text OR p.pmdc_verified_at > (now() - '6 mons'::interval));

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
  coalesce(p.probation_waived, false)                       as probation_waived
from public.practitioner_profiles p
where p.offboarded_at is null;

revoke all on public.practitioner_readiness from anon, authenticated;
grant select on public.practitioner_readiness to service_role;
