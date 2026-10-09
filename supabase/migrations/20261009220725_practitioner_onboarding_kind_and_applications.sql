-- 1. Practitioner kind, so a doctor tier can be switched on later without a rebuild
alter table public.practitioner_profiles
  add column if not exists kind text not null default 'practitioner',
  add column if not exists reg_body text,
  add column if not exists accepted_terms_at timestamptz,
  add column if not exists onboarded_from uuid;

alter table public.practitioner_profiles
  drop constraint if exists practitioner_profiles_kind_check;
alter table public.practitioner_profiles
  add constraint practitioner_profiles_kind_check
  check (kind in ('practitioner','doctor'));

-- A doctor cannot be approved without a registration body and number.
-- This is the guardrail that stops a medical claim existing without evidence behind it.
alter table public.practitioner_profiles
  drop constraint if exists practitioner_profiles_doctor_needs_registration;
alter table public.practitioner_profiles
  add constraint practitioner_profiles_doctor_needs_registration
  check (
    kind <> 'doctor'
    or status <> 'approved'
    or (reg_body is not null and reg_no is not null and length(trim(reg_no)) > 3)
  );

-- 2. Applications. One row per person who wants to join, however they arrived.
create table if not exists public.practitioner_applications (
  id              uuid primary key default gen_random_uuid(),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  full_name       text not null,
  email           text not null,
  phone           text,
  city            text,

  kind            text not null default 'practitioner',
  qualification   text not null,
  years_experience int,
  clinics         text,
  about           text not null default '',
  portfolio_url   text,

  reg_body        text,
  reg_no          text,

  source          text not null default 'apply_page',
  invite_id       uuid,

  status          text not null default 'new',
  reviewed_by     uuid references auth.users(id) on delete set null,
  reviewed_at     timestamptz,
  decision_note   text,

  profile_id      uuid references public.practitioner_profiles(id) on delete set null,

  agreed_to_terms boolean not null default false,
  agreed_at       timestamptz,

  is_test         boolean not null default false,
  deleted_at      timestamptz,

  constraint practitioner_applications_kind_check
    check (kind in ('practitioner','doctor')),
  constraint practitioner_applications_status_check
    check (status in ('new','screening','interview','test_assessment','approved','rejected','withdrawn')),
  constraint practitioner_applications_source_check
    check (source in ('apply_page','invite','manual')),
  constraint practitioner_applications_email_shape
    check (position('@' in email) > 1 and position('.' in split_part(email,'@',2)) > 1),
  constraint practitioner_applications_terms_required
    check (agreed_to_terms = false or agreed_at is not null),
  -- A decision must say who made it and when
  constraint practitioner_applications_decision_needs_reviewer
    check (status not in ('approved','rejected') or (reviewed_by is not null and reviewed_at is not null)),
  -- A rejection must carry a reason, so the rejection email is never blank
  constraint practitioner_applications_rejection_needs_note
    check (status <> 'rejected' or (decision_note is not null and length(trim(decision_note)) > 5)),
  -- An approval must point at the profile it created
  constraint practitioner_applications_approval_needs_profile
    check (status <> 'approved' or profile_id is not null),
  -- A doctor application must state its registration up front
  constraint practitioner_applications_doctor_needs_registration
    check (kind <> 'doctor' or (reg_body is not null and reg_no is not null))
);

-- One open application per email. Prevents a refresh or an impatient
-- applicant creating a dozen rows you then have to triage by hand.
create unique index if not exists practitioner_applications_one_open_per_email
  on public.practitioner_applications (lower(email))
  where deleted_at is null and status in ('new','screening','interview','test_assessment');

create index if not exists practitioner_applications_triage_idx
  on public.practitioner_applications (status, created_at desc)
  where deleted_at is null and is_test = false;

create index if not exists practitioner_applications_email_idx
  on public.practitioner_applications (lower(email));
