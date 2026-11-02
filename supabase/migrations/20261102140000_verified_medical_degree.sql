-- Handover 67 Part 1, resolved for one practitioner: a verified medical degree.
--
-- The studio has verified that an aesthetics-track practitioner holds the
-- medical degree her profile states (Talha, 2 November 2026). Holding the
-- degree is a fact worth publishing; practising medicine here is not what
-- she does, so her role stays Certified Aesthetics Practitioner.
--
-- Instead of removing the guard, verification is recorded on the profile
-- and the guard reads it:
--   credential_verified_at / _by   who verified the credential text, when
--   guard_medical_credential()     a medical credential on a non-medical
--                                  track needs that verification
--   any change to credentials      clears the verification, so changed
--                                  text is never published as verified
--   practitioner_public            publishes it only when verified

alter table public.practitioner_profiles
  add column if not exists credential_verified_at timestamptz,
  add column if not exists credential_verified_by uuid references auth.users(id) on delete set null;

comment on column public.practitioner_profiles.credential_verified_at is
  'When the studio verified the exact credentials text. Cleared whenever credentials changes.';

create or replace function public.guard_medical_credential()
returns trigger language plpgsql as $$
begin
  -- Changed credential text is unverified text, unless this same write is the verification.
  if tg_op = 'UPDATE'
     and new.credentials is distinct from old.credentials
     and new.credential_verified_at is not distinct from old.credential_verified_at then
    new.credential_verified_at := null;
    new.credential_verified_by := null;
  end if;

  if new.track <> 'medical'
     and public.is_medical_credential(new.credentials)
     and new.credential_verified_at is null
     and (tg_op = 'INSERT'
          or new.credentials is distinct from old.credentials
          or new.track is distinct from old.track) then
    raise exception 'medical_credential_needs_medical_track: "%" is a medical qualification; it can only be shown once the studio has verified it, or on a medical-track profile', new.credentials;
  end if;
  return new;
end $$;

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
            WHEN p.track <> 'medical'::text AND public.is_medical_credential(p.credentials) AND p.credential_verified_at IS NULL THEN NULL::text
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
