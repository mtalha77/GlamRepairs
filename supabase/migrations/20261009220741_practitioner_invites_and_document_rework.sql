-- 3. Invites. The token is stored only as a hash, so a database read
-- cannot be replayed into an account. The service role bypasses RLS
-- (CLAUDE.md 3.1), so the plaintext must never be at rest.
create table if not exists public.practitioner_invites (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz not null default now(),
  email         text not null,
  kind          text not null default 'practitioner',
  token_hash    bytea not null unique,
  invited_by    uuid references auth.users(id) on delete set null,
  note          text,
  expires_at    timestamptz not null default now() + interval '14 days',
  accepted_at   timestamptz,
  application_id uuid references public.practitioner_applications(id) on delete set null,
  revoked_at    timestamptz,
  revoked_by    uuid references auth.users(id) on delete set null,
  is_test       boolean not null default false,

  constraint practitioner_invites_kind_check check (kind in ('practitioner','doctor')),
  constraint practitioner_invites_email_shape
    check (position('@' in email) > 1 and position('.' in split_part(email,'@',2)) > 1)
);

create unique index if not exists practitioner_invites_one_live_per_email
  on public.practitioner_invites (lower(email))
  where accepted_at is null and revoked_at is null;

alter table public.practitioner_applications
  drop constraint if exists practitioner_applications_invite_id_fkey;
alter table public.practitioner_applications
  add constraint practitioner_applications_invite_id_fkey
  foreign key (invite_id) references public.practitioner_invites(id) on delete set null;

-- 4. Documents can now belong to an application, because they are uploaded
-- before any profile exists.
alter table public.practitioner_documents
  alter column practitioner_id drop not null;

alter table public.practitioner_documents
  add column if not exists application_id uuid references public.practitioner_applications(id) on delete cascade,
  add column if not exists bytes bigint,
  add column if not exists mime text,
  add column if not exists purge_after timestamptz,
  add column if not exists deleted_at timestamptz;

alter table public.practitioner_documents
  drop constraint if exists practitioner_documents_one_owner;
alter table public.practitioner_documents
  add constraint practitioner_documents_one_owner
  check ((practitioner_id is not null) <> (application_id is not null));

alter table public.practitioner_documents
  drop constraint if exists practitioner_documents_kind_check;
alter table public.practitioner_documents
  add constraint practitioner_documents_kind_check
  check (kind in ('degree','certificate','attestation','registration','id','other'));

create index if not exists practitioner_documents_application_idx
  on public.practitioner_documents (application_id) where deleted_at is null;

create index if not exists practitioner_documents_purge_idx
  on public.practitioner_documents (purge_after)
  where deleted_at is null and purge_after is not null;
