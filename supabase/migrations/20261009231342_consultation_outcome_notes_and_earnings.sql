-- The rate is snapshotted onto the appointment at booking, so changing a
-- practitioner's rate later never reprices work already agreed.
alter table public.appointments
  add column if not exists practitioner_fee_minor integer,
  add column if not exists platform_fee_minor integer,
  add column if not exists fee_currency text,
  add column if not exists rate_id uuid references public.practitioner_rates(id) on delete set null,
  add column if not exists outcome text,
  add column if not exists outcome_at timestamptz,
  add column if not exists outcome_by uuid references auth.users(id) on delete set null,
  add column if not exists outcome_note text,
  add column if not exists client_joined_at timestamptz,
  add column if not exists practitioner_joined_at timestamptz,
  add column if not exists recording_consent boolean,
  add column if not exists recording_consent_at timestamptz;

alter table public.appointments drop constraint if exists appointments_outcome_check;
alter table public.appointments add constraint appointments_outcome_check
  check (outcome is null or outcome in (
    'attended','client_no_show','practitioner_no_show',
    'cancelled_by_client','cancelled_by_practitioner','technical_failure'
  ));

alter table public.appointments drop constraint if exists appointments_outcome_needs_who;
alter table public.appointments add constraint appointments_outcome_needs_who
  check (outcome is null or (outcome_at is not null and outcome_by is not null));

-- The consultation note. This is the clinical record, not the transcript.
-- It is retained, not purged. Deleting the record of what was advised would be
-- the opposite of compliance.
create table if not exists public.consultation_notes (
  appointment_id   uuid primary key references public.appointments(id) on delete cascade,
  practitioner_id  uuid not null references public.practitioner_profiles(id) on delete restrict,
  lead_id          uuid,

  presenting       text not null,
  observed         text not null,
  guidance         text not null,
  products_discussed text,
  follow_up        text,

  -- Escalation. The business does not diagnose (CLAUDE.md Part 1), so the
  -- only honest answer to something concerning is to send them to a doctor.
  escalated        boolean not null default false,
  escalation_reason text,
  escalation_advice text,
  escalated_at     timestamptz,

  submitted_at     timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  locked_at        timestamptz,

  reviewed_by      uuid references auth.users(id) on delete set null,
  reviewed_at      timestamptz,
  review_rating    smallint,
  review_note      text,

  constraint consultation_notes_substantive
    check (length(trim(presenting)) >= 20
           and length(trim(observed)) >= 20
           and length(trim(guidance)) >= 40),
  constraint consultation_notes_escalation_detail
    check (escalated = false
           or (escalation_reason is not null and length(trim(escalation_reason)) > 10
               and escalated_at is not null)),
  constraint consultation_notes_rating_range
    check (review_rating is null or review_rating between 1 and 5)
);

create index if not exists consultation_notes_practitioner_idx
  on public.consultation_notes (practitioner_id, submitted_at desc);
create index if not exists consultation_notes_escalated_idx
  on public.consultation_notes (escalated_at desc) where escalated;
create index if not exists consultation_notes_unreviewed_idx
  on public.consultation_notes (submitted_at) where reviewed_at is null;

-- Transcripts. Raw media is the QA sample, and that is what expires.
create table if not exists public.consultation_transcripts (
  id              uuid primary key default gen_random_uuid(),
  appointment_id  uuid not null references public.appointments(id) on delete cascade,
  storage_path    text,
  body            text,
  words           integer,
  language        text default 'en',
  source          text not null default 'auto',
  created_at      timestamptz not null default now(),
  purge_after     timestamptz not null,
  deleted_at      timestamptz,
  constraint consultation_transcripts_source_check
    check (source in ('auto','manual','vendor')),
  constraint consultation_transcripts_has_content
    check (deleted_at is not null or storage_path is not null or body is not null)
);

create index if not exists consultation_transcripts_purge_idx
  on public.consultation_transcripts (purge_after) where deleted_at is null;
create unique index if not exists consultation_transcripts_one_live
  on public.consultation_transcripts (appointment_id) where deleted_at is null;

-- Who opened a transcript. If you hold a record of somebody's consultation you
-- must be able to answer "who read this", and the service role bypasses RLS.
create table if not exists public.consultation_access_log (
  id             uuid primary key default gen_random_uuid(),
  appointment_id uuid not null references public.appointments(id) on delete cascade,
  user_id        uuid references auth.users(id) on delete set null,
  action         text not null,
  at             timestamptz not null default now(),
  constraint consultation_access_log_action_check
    check (action in ('view_transcript','download_transcript','view_note','edit_note','purge'))
);

create index if not exists consultation_access_log_appt_idx
  on public.consultation_access_log (appointment_id, at desc);
