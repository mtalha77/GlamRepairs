-- Welcome links for the studio (Anthonia's case, 30 October 2026).
--
-- Supabase sign-in tokens work once and expire within the hour, so a link
-- emailed to someone in another timezone, or forwarded on WhatsApp, is
-- often dead by the time it is tapped, and once tapped it is dead for any
-- second attempt. These links last seven days and are spent only when the
-- person presses Accept (a scanner opening the page spends nothing). The
-- server then mints a fresh sign-in token and uses it on the spot.
--
-- Only a hash of the token is stored. Service role only: no policies.
create table if not exists public.studio_welcome_links (
  id uuid primary key default gen_random_uuid(),
  token_hash text not null unique,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '7 days',
  used_at timestamptz
);

create index if not exists studio_welcome_links_user_idx on public.studio_welcome_links (user_id);

alter table public.studio_welcome_links enable row level security;
revoke all on public.studio_welcome_links from anon, authenticated;
