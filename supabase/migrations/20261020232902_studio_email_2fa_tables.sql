-- 20 October 2026 — Talha: "superadmin and other logins should have email
-- 2FA first time logging in or after a long time".
--
-- Step one of two: the records. A sign-in session counts as verified once
-- its owner has typed a code emailed to them (or came in through an emailed
-- invite link, which proves the same thing). A verification lasts 30 days;
-- a device that verified recently skips the code for its next sign-in.
--
-- Step two (a later migration, once the app that writes these is live)
-- makes the studio membership checks in RLS require a verified session, so
-- a password alone cannot read anything even through the API directly.

create table if not exists public.studio_verified_sessions (
  session_id  uuid primary key,
  user_id     uuid not null references auth.users(id) on delete cascade,
  method      text not null check (method in ('code', 'trusted_device', 'invite')),
  verified_at timestamptz not null default now(),
  expires_at  timestamptz not null
);
create index if not exists studio_verified_sessions_user_idx on public.studio_verified_sessions (user_id, expires_at desc);
alter table public.studio_verified_sessions enable row level security;
revoke all on public.studio_verified_sessions from anon, authenticated;

create table if not exists public.studio_login_codes (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  session_id  uuid not null,
  code_hash   text not null,
  attempts    smallint not null default 0,
  expires_at  timestamptz not null,
  used_at     timestamptz,
  created_at  timestamptz not null default now()
);
create index if not exists studio_login_codes_user_idx on public.studio_login_codes (user_id, created_at desc);
alter table public.studio_login_codes enable row level security;
revoke all on public.studio_login_codes from anon, authenticated;

-- True when the caller's current session has been verified and not expired.
create or replace function private.session_verified()
returns boolean
language sql
stable
security definer
set search_path to ''
as $$
  select exists (
    select 1 from public.studio_verified_sessions v
     where v.session_id = nullif(auth.jwt() ->> 'session_id', '')::uuid
       and v.user_id = auth.uid()
       and v.expires_at > now()
  );
$$;
revoke execute on function private.session_verified() from public, anon;
grant execute on function private.session_verified() to authenticated, service_role;
