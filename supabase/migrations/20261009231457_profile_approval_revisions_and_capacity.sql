-- 'changes_requested' so you can send it back instead of only yes or no.
-- 'suspended' and 'offboarded' because practitioners leave.
alter table public.practitioner_profiles drop constraint if exists practitioner_profiles_status_check;
alter table public.practitioner_profiles add constraint practitioner_profiles_status_check
  check (status in ('pending','under_review','changes_requested','approved','rejected','suspended','offboarded'));

alter table public.practitioner_profiles
  add column if not exists max_per_day smallint not null default 6,
  add column if not exists max_per_week smallint not null default 25,
  add column if not exists payout_method text,
  add column if not exists payout_detail_ref text,
  add column if not exists suspended_at timestamptz,
  add column if not exists suspended_reason text,
  add column if not exists offboarded_at timestamptz,
  add column if not exists profile_photo_verified boolean not null default false;

alter table public.practitioner_profiles drop constraint if exists practitioner_profiles_capacity_sane;
alter table public.practitioner_profiles add constraint practitioner_profiles_capacity_sane
  check (max_per_day between 1 and 20 and max_per_week >= max_per_day);

-- A suspended or offboarded practitioner cannot be taking clients
alter table public.practitioner_profiles drop constraint if exists practitioner_profiles_inactive_not_accepting;
alter table public.practitioner_profiles add constraint practitioner_profiles_inactive_not_accepting
  check (status not in ('suspended','offboarded','rejected') or (accepting_clients = false and can_review = false));

-- A degree is mandatory and must be verified before approval. HEC
-- attestation is not. Enforced here because the service role bypasses RLS.
create or replace function public.practitioner_has_verified_degree(p_profile uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.practitioner_documents d
     where d.practitioner_id = p_profile
       and d.kind = 'degree'
       and d.verified
       and d.deleted_at is null
  );
$$;

create or replace function public.guard_practitioner_approval()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'approved' and coalesce(old.status,'') <> 'approved' then
    if not public.practitioner_has_verified_degree(new.id) then
      raise exception 'cannot approve %: a verified degree document is required', new.full_name;
    end if;
    if new.profile_photo_verified is not true then
      raise exception 'cannot approve %: the profile photograph must be checked first', new.full_name;
    end if;
    if new.payout_method is null then
      raise exception 'cannot approve %: no payout method recorded', new.full_name;
    end if;
  end if;
  return new;
end $$;

drop trigger if exists practitioner_approval_guard on public.practitioner_profiles;
create trigger practitioner_approval_guard
  before insert or update on public.practitioner_profiles
  for each row execute function public.guard_practitioner_approval();

-- Revision requests: a record of what was asked and whether it was done.
create table if not exists public.practitioner_revision_requests (
  id              uuid primary key default gen_random_uuid(),
  practitioner_id uuid references public.practitioner_profiles(id) on delete cascade,
  application_id  uuid references public.practitioner_applications(id) on delete cascade,
  fields          text[] not null default '{}',
  message         text not null,
  requested_by    uuid references auth.users(id) on delete set null,
  requested_at    timestamptz not null default now(),
  resolved_at     timestamptz,
  resolution_note text,

  constraint practitioner_revision_one_owner
    check ((practitioner_id is not null) <> (application_id is not null)),
  constraint practitioner_revision_message_substantive
    check (length(trim(message)) >= 15)
);

create index if not exists practitioner_revision_open_idx
  on public.practitioner_revision_requests (requested_at desc) where resolved_at is null;

-- Client feedback after a consultation.
create table if not exists public.consultation_feedback (
  appointment_id uuid primary key references public.appointments(id) on delete cascade,
  rating         smallint not null,
  felt_heard     smallint,
  would_return   boolean,
  comment        text,
  publishable    boolean not null default false,
  created_at     timestamptz not null default now(),
  constraint consultation_feedback_rating_range check (rating between 1 and 5),
  constraint consultation_feedback_heard_range check (felt_heard is null or felt_heard between 1 and 5)
);
