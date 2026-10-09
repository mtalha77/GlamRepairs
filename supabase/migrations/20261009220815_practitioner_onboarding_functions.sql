-- Issue an invite. Returns the plaintext token exactly once; only the hash is stored.
create or replace function public.issue_practitioner_invite(
  p_email text,
  p_kind  text default 'practitioner',
  p_by    uuid default null,
  p_note  text default null,
  p_days  int  default 14
) returns table (invite_id uuid, token text)
language plpgsql security definer set search_path = public as $$
declare tok text; v_id uuid;
begin
  if p_kind not in ('practitioner','doctor') then
    raise exception 'unknown kind %', p_kind;
  end if;

  -- Revoke any earlier live invite for this address so the unique index holds
  update public.practitioner_invites
     set revoked_at = now(), revoked_by = p_by
   where lower(email) = lower(p_email)
     and accepted_at is null and revoked_at is null;

  tok := replace(gen_random_uuid()::text,'-','') || replace(gen_random_uuid()::text,'-','');

  insert into public.practitioner_invites (email, kind, token_hash, invited_by, note, expires_at)
  values (lower(p_email), p_kind, sha256(tok::bytea), p_by, p_note,
          now() + make_interval(days => p_days))
  returning id into v_id;

  return query select v_id, tok;
end $$;

-- Look up an invite from a presented token. Returns nothing when the token is
-- wrong, expired, revoked or already used, so the caller cannot tell which.
create or replace function public.lookup_practitioner_invite(p_token text)
returns table (invite_id uuid, email text, kind text)
language sql security definer set search_path = public as $$
  select id, email, kind
    from public.practitioner_invites
   where token_hash = sha256(p_token::bytea)
     and accepted_at is null
     and revoked_at is null
     and expires_at > now()
   limit 1;
$$;

-- Turn an approved application into a practitioner profile.
-- The profile starts at 'pending': the existing approved_needs_detail
-- constraint will not let it go live without a photograph and a real bio.
create or replace function public.approve_practitioner_application(
  p_app uuid,
  p_by  uuid,
  p_note text default null
) returns uuid
language plpgsql security definer set search_path = public as $$
declare a record; v_slug text; v_base text; v_n int := 1; v_profile uuid;
begin
  select * into a from public.practitioner_applications
   where id = p_app and deleted_at is null for update;
  if not found then raise exception 'application % not found', p_app; end if;
  if a.status = 'approved' then raise exception 'application % already approved', p_app; end if;
  if a.profile_id is not null then raise exception 'application % already has a profile', p_app; end if;

  v_base := regexp_replace(lower(trim(a.full_name)), '[^a-z0-9]+', '-', 'g');
  v_base := trim(both '-' from v_base);
  if v_base = '' then v_base := 'practitioner'; end if;
  v_slug := v_base;
  while exists (select 1 from public.practitioner_profiles where slug = v_slug) loop
    v_n := v_n + 1;
    v_slug := v_base || '-' || v_n;
  end loop;

  insert into public.practitioner_profiles
    (slug, full_name, title, credentials, kind, reg_body, reg_no,
     status, can_review, accepting_clients, accepted_terms_at, onboarded_from)
  values
    (v_slug, a.full_name,
     case when a.kind = 'doctor' then 'Doctor' else 'Aesthetics Practitioner' end,
     a.qualification, a.kind, a.reg_body, a.reg_no,
     'pending', false, false, a.agreed_at, a.id)
  returning id into v_profile;

  -- Carry the uploaded documents across to the profile
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
end $$;

-- Reject an application and schedule its documents for deletion.
-- Holding somebody's identity documents after turning them down is a
-- liability with no upside.
create or replace function public.reject_practitioner_application(
  p_app uuid,
  p_by  uuid,
  p_note text,
  p_keep_days int default 30
) returns void
language plpgsql security definer set search_path = public as $$
begin
  if p_note is null or length(trim(p_note)) <= 5 then
    raise exception 'a rejection needs a reason';
  end if;

  update public.practitioner_applications
     set status = 'rejected', reviewed_by = p_by, reviewed_at = now(),
         decision_note = p_note, updated_at = now()
   where id = p_app and deleted_at is null and status <> 'approved';

  if not found then raise exception 'application % not rejectable', p_app; end if;

  update public.practitioner_documents
     set purge_after = now() + make_interval(days => p_keep_days)
   where application_id = p_app and deleted_at is null;
end $$;

-- Triage view for the studio. Filters per CLAUDE.md 3.3.
create or replace view public.practitioner_application_queue as
select a.id, a.created_at, a.full_name, a.email, a.phone, a.city,
       a.kind, a.qualification, a.years_experience, a.status, a.source,
       a.reg_body, a.reg_no, a.profile_id,
       (select count(*) from public.practitioner_documents d
         where d.application_id = a.id and d.deleted_at is null) as document_count,
       (select count(*) from public.practitioner_documents d
         where d.application_id = a.id and d.deleted_at is null and d.verified) as verified_count,
       round(extract(epoch from (now() - a.created_at)) / 3600)::int as hours_waiting
  from public.practitioner_applications a
 where a.deleted_at is null and a.is_test = false
 order by case a.status when 'new' then 0 when 'screening' then 1
                        when 'interview' then 2 when 'test_assessment' then 3
                        else 4 end,
          a.created_at;
