-- Five-step practitioner application — HANDOVER-52 §4.1.
--
-- The application is saved after every step, so a row now exists before
-- it is submitted. `submitted_at` marks the moment it reaches the studio;
-- until then it is a draft the queue does not show. Checks that only make
-- sense for a finished application wait for submission.

alter table public.practitioner_applications
  add column if not exists submitted_at timestamptz,
  add column if not exists current_step smallint not null default 1,
  add column if not exists qualification_year smallint,
  add column if not exists institution text,
  add column if not exists payout_bank text,
  add column if not exists payout_account_title text,
  add column if not exists payout_reference text;

alter table public.practitioner_applications
  alter column qualification set default '';

-- Anything that existed before steps was submitted in one go.
update public.practitioner_applications set submitted_at = created_at where submitted_at is null;

alter table public.practitioner_applications
  add constraint practitioner_applications_step_range check (current_step between 1 and 5),
  add constraint practitioner_applications_year_range check (qualification_year is null or qualification_year between 1960 and 2100),
  add constraint practitioner_applications_reviewed_after_submit check (status in ('new', 'withdrawn') or submitted_at is not null);

alter table public.practitioner_applications
  drop constraint practitioner_applications_doctor_needs_registration;
alter table public.practitioner_applications
  add constraint practitioner_applications_doctor_needs_registration
  check (kind <> 'doctor' or submitted_at is null or (reg_body is not null and reg_no is not null));

-- The headshot is uploaded with the documents, privately, and becomes the
-- public profile photograph only on approval.
alter table public.practitioner_documents
  drop constraint practitioner_documents_kind_check;
alter table public.practitioner_documents
  add constraint practitioner_documents_kind_check
  check (kind in ('degree', 'certificate', 'attestation', 'registration', 'id', 'photo', 'other'));

create or replace view public.practitioner_application_queue
with (security_invoker = true) as
select a.id,
  a.created_at,
  a.full_name,
  a.email,
  a.phone,
  a.city,
  a.kind,
  a.qualification,
  a.years_experience,
  a.status,
  a.source,
  a.reg_body,
  a.reg_no,
  a.profile_id,
  (select count(*) from public.practitioner_documents d where d.application_id = a.id and d.deleted_at is null) as document_count,
  (select count(*) from public.practitioner_documents d where d.application_id = a.id and d.deleted_at is null and d.verified) as verified_count,
  (round(extract(epoch from (now() - coalesce(a.submitted_at, a.created_at))) / 3600::numeric))::integer as hours_waiting
from public.practitioner_applications a
where a.deleted_at is null and a.is_test = false and a.submitted_at is not null
order by
  case a.status when 'new' then 0 when 'screening' then 1 when 'interview' then 2 when 'test_assessment' then 3 else 4 end,
  a.created_at;
