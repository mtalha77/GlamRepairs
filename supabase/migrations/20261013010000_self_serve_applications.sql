-- Self-serve applications from /join — the redesign's "Apply in 5 minutes".
--
-- Anyone can now ask for an application link. The link is emailed, so the
-- address is proven before anything is stored, and it is the same
-- credential the studio's invites use: resume, upload, submit. Limits are
-- counted from this table: per address and per network, per day.

alter table public.practitioner_invites
  add column if not exists source text not null default 'studio',
  add column if not exists requested_ip_hash text;

alter table public.practitioner_invites
  add constraint practitioner_invites_source_check check (source in ('studio', 'self'));

create index if not exists practitioner_invites_email_recent_idx
  on public.practitioner_invites (lower(email), created_at desc);
create index if not exists practitioner_invites_ip_recent_idx
  on public.practitioner_invites (requested_ip_hash, created_at desc)
  where requested_ip_hash is not null;
