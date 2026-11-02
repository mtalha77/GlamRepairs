-- Handover 67 Part 1: a medical credential on an aesthetics-track profile.
--
-- An aesthetics-track profile was publishing "MBBS" as a verified credential
-- with no medical registration behind it. Three layers, none of which
-- changes anyone's stored data:
--
-- 1. practitioner_public never publishes a medical credential string for a
--    profile that is not on the medical track. The card loses the claim at
--    once; the practitioner stays live.
-- 2. A trigger refuses to store one: on insert, and on any update that sets
--    credentials or track. Unrelated updates to an existing row (accepting
--    the agreement, editing a bio) still work, which a CHECK constraint would
--    not allow while the existing row still holds the value.
-- 3. Once that row is corrected, the trigger can be replaced by the CHECK
--    constraint the handover gives (medical_credential_needs_medical_track).
--
-- One pattern, in one function, read by both.

-- MD and DO are matched in capitals only, so the English word "do" in a
-- credential ("trained to do facials") is not mistaken for a medical degree.
-- Everything else in any case. "Dermatology" (as in Ayma's BS Cosmetology &
-- Dermatology Science) does not match: only the word "dermatologist" does.
create or replace function public.is_medical_credential(p text)
returns boolean language sql immutable as $$
  select coalesce(p, '') ~* '\m(MBBS|MBChB|BDS|FCPS|MRCP|FRCP|dermatologists?|physicians?|surgeons?)\M'
      or coalesce(p, '') ~ '\m(MD|DO)\M'
$$;

create or replace function public.guard_medical_credential()
returns trigger language plpgsql as $$
begin
  if new.track <> 'medical'
     and public.is_medical_credential(new.credentials)
     and (tg_op = 'INSERT'
          or new.credentials is distinct from old.credentials
          or new.track is distinct from old.track) then
    raise exception 'medical_credential_needs_medical_track: "%" is a medical qualification; it can only be shown on a verified medical-track profile', new.credentials;
  end if;
  return new;
end $$;

drop trigger if exists trg_medical_credential_guard on public.practitioner_profiles;
create trigger trg_medical_credential_guard
  before insert or update on public.practitioner_profiles
  for each row execute function public.guard_medical_credential();

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
