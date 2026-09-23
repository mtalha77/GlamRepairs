-- A trace of every air-quality refresh invocation.
--
-- Why this exists: when readings stopped arriving there was no way to tell
-- whether the endpoint was being called and failing, or never called at
-- all. Vercel's runtime-log queries time out, and the job wrote nothing on
-- failure, so "did the cron fire" was unanswerable from anywhere reachable.
-- One row per invocation makes it a SELECT.
--
-- It earned itself within the hour: the first row proved the Vercel cron
-- had never run, and the second caught a unique-violation that was failing
-- all thirteen cities silently.
create table if not exists public.air_quality_cron_runs (
  id          bigint generated always as identity primary key,
  ran_at      timestamptz not null default now(),
  ok          boolean     not null,
  refreshed   integer     not null default 0,
  failed      integer     not null default 0,
  -- Per-city outcomes, exactly as the endpoint returns them.
  detail      jsonb       not null default '[]'::jsonb,
  -- Which proof admitted the run: 'vercel-cron', 'secret', or 'unknown'.
  trigger     text        not null default 'unknown'
);

create index if not exists air_quality_cron_runs_ran_at_idx
  on public.air_quality_cron_runs (ran_at desc);

-- Staff-only. The service role bypasses RLS and is what the cron writes
-- with; no anon or authenticated policy is granted, so this never reaches a
-- browser.
alter table public.air_quality_cron_runs enable row level security;

comment on table public.air_quality_cron_runs is
  'One row per /api/cron/air-quality invocation. Written by the service role; not readable by anon.';
