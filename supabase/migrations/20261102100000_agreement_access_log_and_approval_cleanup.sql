-- Handover 66 Parts 8 and 9.
--
-- 1. agreement_access_log. Every opening of a signed agreement PDF is
--    recorded (§9.3). consultation_access_log cannot hold these: its rows
--    require an appointment. Append only, service role only, like the
--    acceptances it audits.
--
-- 2. approve_practitioner_application() no longer names accepted_terms_at at
--    all (§8.2). It already wrote null; now the deprecated column is simply
--    left out. Acceptance is recorded only in practitioner_agreement_acceptances,
--    by the practitioner, in the studio.
--
--    Deliberately NOT done: inserting an 'imported' acceptance from the
--    application tickbox. acceptance_once is unique per (practitioner,
--    version), so an imported row for the version in force would make it
--    impossible for that practitioner ever to accept the same version by
--    clickwrap, which is the thing §4 asks for. And the tickbox it would
--    import was a document-retention consent ("GlamRepairs may keep these
--    documents to review my application"), not the agreement.

create table if not exists public.agreement_access_log (
  id uuid primary key default gen_random_uuid(),
  practitioner_id uuid not null references public.practitioner_profiles(id) on delete restrict,
  agreement_version text not null references public.practitioner_agreements(version) on delete restrict,
  viewer_id uuid references auth.users(id) on delete set null,
  viewer_is_owner boolean not null,
  action text not null check (action in ('download_signed')),
  at timestamptz not null default now()
);

create index if not exists agreement_access_log_practitioner_idx
  on public.agreement_access_log (practitioner_id, at desc);

alter table public.agreement_access_log enable row level security;
revoke all on public.agreement_access_log from anon, authenticated;
grant select, insert on public.agreement_access_log to service_role;

create or replace function public.guard_agreement_access_log_append_only()
returns trigger language plpgsql as $$
begin
  raise exception 'The agreement access log is append only.';
end $$;

drop trigger if exists trg_agreement_access_log_append_only on public.agreement_access_log;
create trigger trg_agreement_access_log_append_only
  before update or delete on public.agreement_access_log
  for each row execute function public.guard_agreement_access_log_append_only();

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

  -- Stage one only: the profile is created 'pending'. Going live is the
  -- separate "Make live" decision under Studio -> Practitioners.
  insert into public.practitioner_profiles
    (slug, full_name, title, credentials, kind, reg_body, reg_no, city,
     years_experience, status, can_review, accepting_clients,
     onboarded_from, edited_by)
  values
    (v_slug, a.full_name, 'Certified Aesthetics Practitioner',
     a.qualification, a.kind, a.reg_body, a.reg_no, a.city,
     a.years_experience, 'pending', false, false, a.id, p_by)
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
