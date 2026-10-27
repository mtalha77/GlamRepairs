-- user_id was NOT NULL, which forces the Supabase auth user to be created
-- BEFORE the account row. That is the same ordering that produced orphaned
-- auth users in the practitioner invite bug (HANDOVER 51).
--
-- Correct order: payment verified -> account row -> magic link -> auth user
-- created on first sign-in -> user_id filled in. So the account must be able
-- to exist without one.
alter table public.client_accounts alter column user_id drop not null;

-- But an activated account must have one, or the sign-in is not real.
alter table public.client_accounts drop constraint if exists client_accounts_activated_has_user;
alter table public.client_accounts add constraint client_accounts_activated_has_user
  check (activated_at is null or user_id is not null);

-- And a login count or timestamp implies activation.
alter table public.client_accounts drop constraint if exists client_accounts_login_implies_user;
alter table public.client_accounts add constraint client_accounts_login_implies_user
  check (last_login_at is null or user_id is not null);

create index if not exists client_accounts_awaiting_activation_idx
  on public.client_accounts (created_at)
  where user_id is null and deleted_at is null;
