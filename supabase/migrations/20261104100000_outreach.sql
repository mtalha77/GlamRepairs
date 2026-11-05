-- Handovers 68 and 69: outreach campaigns.
--
-- Built in the order Handover 69 Part 4 gives: what stops a send (suppression,
-- guard rails, caps) exists before anything can send. Every table is service
-- role only; the studio's server actions are the only way in (CLAUDE.md 3.1).
--
-- Deviations from the handover text, deliberately:
--   * Settings live in a one-row outreach_settings table, not plan_settings:
--     plan_settings has one row per plan, so a cap there would exist three
--     times and disagree.
--   * outreach_steps.delay_days is the day offset from enrolment (Day 0,
--     Day 3, Day 7...), matching how both sequences are written.
--   * Sequences load inactive. A step still holding a [placeholder] cannot be
--     activated or sent (outreach_unresolved_placeholders), so the rate, the
--     closing day and the brand proposal have to be filled in by a person.

-- ── Settings ──────────────────────────────────────────────────────────────

create table if not exists public.outreach_settings (
  id                           boolean primary key default true check (id),
  daily_cap                    integer not null default 20 check (daily_cap between 0 and 2000),
  hourly_cap                   integer not null default 5 check (hourly_cap between 0 and 500),
  bounce_pause_pct             numeric not null default 2.0,
  complaint_pause_pct          numeric not null default 0.1,
  paused                       boolean not null default false,
  paused_reason                text,
  paused_at                    timestamptz,
  -- Handover 68 §6: non-Pakistan recipients wait for legal advice.
  non_pk_enabled               boolean not null default false,
  -- Every email carries a real business address (Handover 68 §6). Sending
  -- is refused while this is empty.
  business_address             text,
  business_hours_start         smallint not null default 9 check (business_hours_start between 0 and 23),
  business_hours_end           smallint not null default 18 check (business_hours_end between 1 and 24),
  -- Handover 69 §2.1: Apollo budget, checked before every search.
  discovery_credits_monthly    integer not null default 150,
  discovery_credits_used       integer not null default 0,
  discovery_reset_at           timestamptz,
  updated_at                   timestamptz not null default now(),
  updated_by                   uuid references auth.users(id)
);
insert into public.outreach_settings (id) values (true) on conflict do nothing;

-- ── Lists and contacts ────────────────────────────────────────────────────

create table if not exists public.outreach_lists (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  audience      text not null check (audience in ('practitioner','brand')),
  source_note   text,
  uploaded_by   uuid not null references auth.users(id),
  created_at    timestamptz not null default now()
);

create table if not exists public.outreach_contacts (
  id                   uuid primary key default gen_random_uuid(),
  list_id              uuid not null references public.outreach_lists(id) on delete restrict,
  email                text not null,
  first_name           text,
  company              text,
  role_title           text,
  country_code         text check (country_code is null or country_code ~ '^[A-Z]{2}$'),
  custom               jsonb not null default '{}',
  status               text not null default 'new'
                         check (status in ('new','queued','active','replied','bounced',
                                           'unsubscribed','suppressed','complete')),
  -- Handover 69 §2.4: the queue sends only to 'valid'.
  email_status         text not null default 'unknown' check (email_status in ('unknown','valid','risky','invalid')),
  email_status_set_by  uuid references auth.users(id),
  email_status_set_at  timestamptz,
  bounced_at           timestamptz,
  unsubscribed_at      timestamptz,
  replied_at           timestamptz,
  created_at           timestamptz not null default now(),
  constraint email_looks_real check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]{2,}$'),
  constraint email_lowercase check (email = lower(email)),
  constraint one_contact_per_email unique (email)
);
create index if not exists outreach_contacts_list_idx on public.outreach_contacts (list_id);

-- ── Sequences and steps ───────────────────────────────────────────────────

create table if not exists public.outreach_sequences (
  id          uuid primary key default gen_random_uuid(),
  code        text not null unique,
  audience    text not null check (audience in ('practitioner','brand')),
  name        text not null,
  active      boolean not null default false,
  created_at  timestamptz not null default now()
);

create table if not exists public.outreach_steps (
  id            uuid primary key default gen_random_uuid(),
  sequence_id   uuid not null references public.outreach_sequences(id) on delete cascade,
  step_no       smallint not null check (step_no >= 1),
  delay_days    smallint not null check (delay_days >= 0),
  subject       text not null,
  body_md       text not null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (sequence_id, step_no),
  -- CLAUDE.md 2.1 and 2.3, in the database rather than in review.
  constraint no_em_dash check (subject !~ '—' and body_md !~ '—'),
  constraint no_banned_words check (
    (subject || ' ' || body_md) !~* '\m(licensed|dermatologist|diagnose|prescribe|BSc)\M'
  )
);

-- A [square-bracket placeholder] that is not a markdown link is an unfilled
-- blank. The sequence cannot be activated, and no step sends, while one remains.
create or replace function public.outreach_unresolved_placeholders(p_text text)
returns text[] language sql immutable as $$
  select coalesce(array_agg(m[1]), '{}')
  from regexp_matches(coalesce(p_text, ''), '(\[[^\]\n]{1,120}\])(?!\()', 'g') as m
$$;

create or replace function public.guard_outreach_sequence_activation()
returns trigger language plpgsql as $$
declare v_blanks text[];
begin
  if new.active and not coalesce(old.active, false) then
    if not exists (select 1 from public.outreach_steps s where s.sequence_id = new.id) then
      raise exception 'sequence_has_no_steps: % has no steps', new.code;
    end if;
    select array_agg(b) into v_blanks
      from public.outreach_steps s,
           unnest(public.outreach_unresolved_placeholders(s.subject || ' ' || s.body_md)) b
     where s.sequence_id = new.id;
    if v_blanks is not null then
      raise exception 'sequence_has_placeholders: % still has % to fill in', new.code, array_to_string(v_blanks, ', ');
    end if;
  end if;
  return new;
end $$;
drop trigger if exists trg_outreach_sequence_activation on public.outreach_sequences;
create trigger trg_outreach_sequence_activation
  before insert or update on public.outreach_sequences
  for each row execute function public.guard_outreach_sequence_activation();

-- ── Enrolments, sends, events ─────────────────────────────────────────────

create table if not exists public.outreach_enrolments (
  id             uuid primary key default gen_random_uuid(),
  contact_id     uuid not null references public.outreach_contacts(id) on delete restrict,
  sequence_id    uuid not null references public.outreach_sequences(id),
  status         text not null default 'active' check (status in ('active','paused','complete','exited')),
  current_step   smallint not null default 0,
  next_send_at   timestamptz,
  exit_reason    text,
  enrolled_by    uuid not null references auth.users(id),
  created_at     timestamptz not null default now(),
  unique (contact_id, sequence_id)
);
create index if not exists outreach_enrolments_due_idx on public.outreach_enrolments (next_send_at) where status = 'active';

create table if not exists public.outreach_sends (
  id             uuid primary key default gen_random_uuid(),
  enrolment_id   uuid not null references public.outreach_enrolments(id),
  contact_id     uuid not null references public.outreach_contacts(id),
  step_no        smallint not null,
  to_email       text not null,
  provider_id    text unique,
  subject        text not null,
  sent_at        timestamptz not null default now(),
  delivered_at   timestamptz,
  opened_at      timestamptz,
  clicked_at     timestamptz,
  bounced_at     timestamptz,
  complained_at  timestamptz,
  -- The guarantee nobody gets the same email twice.
  unique (enrolment_id, step_no)
);
create index if not exists outreach_sends_sent_idx on public.outreach_sends (sent_at desc);

-- Handover 69 §3.1: raw provider events are the source of truth; the
-- unique key absorbs webhook retries.
create table if not exists public.outreach_events (
  id           uuid primary key default gen_random_uuid(),
  send_id      uuid references public.outreach_sends(id),
  provider_id  text,
  type         text not null check (type in
                 ('sent','delivered','delivery_delayed','opened','clicked',
                  'bounced','complained','unsubscribed','replied')),
  occurred_at  timestamptz not null,
  payload      jsonb,
  created_at   timestamptz not null default now(),
  unique (provider_id, type, occurred_at)
);
create index if not exists outreach_events_send_idx on public.outreach_events (send_id, type);

-- ── Suppression ───────────────────────────────────────────────────────────

-- Global: an address here never receives outreach from any sequence.
create table if not exists public.outreach_suppressions (
  email       text primary key check (email = lower(email)),
  reason      text not null check (reason in ('unsubscribed','bounced','complained','replied','manual')),
  note        text,
  created_at  timestamptz not null default now(),
  created_by  uuid references auth.users(id)
);

/**
 * Why an address may not be sent outreach, or null if it may.
 * p_new_enrolment adds the 90-day rule (Handover 68 §5.4), which applies to
 * starting a sequence, not to the next step of one already running.
 */
create or replace function public.outreach_block_reason(p_email text, p_new_enrolment boolean default true)
returns text language sql stable security definer set search_path = public as $$
  select coalesce(
    (select 'suppressed: ' || s.reason from outreach_suppressions s where s.email = lower(p_email)),
    (select 'practitioner' from practitioner_profiles p join auth.users u on u.id = p.user_id
       where lower(u.email) = lower(p_email) limit 1),
    (select 'studio member' from studio_members m join auth.users u on u.id = m.user_id
       where lower(u.email) = lower(p_email) limit 1),
    (select 'applicant' from practitioner_applications a
       where lower(a.email) = lower(p_email) and a.deleted_at is null and a.submitted_at is not null limit 1),
    (select 'client' from leads l
       where lower(l.email) = lower(p_email) and l.deleted_at is null and l.is_test = false limit 1),
    case when p_new_enrolment then
      (select 'contacted in the last 90 days' from outreach_sends x
         where x.to_email = lower(p_email) and x.sent_at > now() - interval '90 days' limit 1)
    end
  )
$$;

-- ── Guard rails ───────────────────────────────────────────────────────────

/**
 * Handover 69 §3.4: bounces over the threshold, or complaints over theirs,
 * across the last 100 sends pause everything. Clearing it is a person's
 * decision (outreach_settings.paused back to false), never automatic.
 */
create or replace function public.outreach_guard_check()
returns text language plpgsql security definer set search_path = public as $$
declare v_n int; v_b int; v_c int; s outreach_settings; v_reason text;
begin
  select * into s from outreach_settings where id;
  if s.paused then return s.paused_reason; end if;
  select count(*), count(bounced_at), count(complained_at) into v_n, v_b, v_c
    from (select bounced_at, complained_at from outreach_sends order by sent_at desc limit 100) r;
  if v_n = 0 then return null; end if;
  if v_c > 0 and (v_c::numeric * 100 / v_n) > s.complaint_pause_pct then
    v_reason := format('Complaint rate %s%% over the last %s sends (limit %s%%).', round(v_c::numeric * 100 / v_n, 2), v_n, s.complaint_pause_pct);
  elsif v_b > 0 and (v_b::numeric * 100 / v_n) > s.bounce_pause_pct then
    v_reason := format('Bounce rate %s%% over the last %s sends (limit %s%%).', round(v_b::numeric * 100 / v_n, 2), v_n, s.bounce_pause_pct);
  end if;
  if v_reason is not null then
    update outreach_settings set paused = true, paused_reason = v_reason, paused_at = now(), updated_at = now() where id;
  end if;
  return v_reason;
end $$;

-- ── Discovery (Handover 69 Part 2; used once a pipeline exists) ───────────

create table if not exists public.discovery_searches (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  audience      text not null default 'brand' check (audience = 'brand'),
  filters       jsonb not null,
  last_run_at   timestamptz,
  created_by    uuid not null references auth.users(id),
  created_at    timestamptz not null default now()
);

create table if not exists public.discovery_results (
  id             uuid primary key default gen_random_uuid(),
  search_id      uuid not null references public.discovery_searches(id) on delete cascade,
  provider       text not null default 'apollo',
  provider_ref   text,
  company        text,
  person_name    text,
  role_title     text,
  country_code   text,
  email          text,
  email_status   text check (email_status in ('unknown','valid','risky','invalid')),
  credits_spent  smallint not null default 0,
  decision       text not null default 'pending' check (decision in ('pending','approved','rejected','imported')),
  decided_by     uuid references auth.users(id),
  decided_at     timestamptz,
  contact_id     uuid references public.outreach_contacts(id),
  raw            jsonb,
  created_at     timestamptz not null default now(),
  unique (provider, provider_ref)
);

-- ── Access: service role only ─────────────────────────────────────────────

do $$
declare t text;
begin
  foreach t in array array['outreach_settings','outreach_lists','outreach_contacts','outreach_sequences','outreach_steps',
                           'outreach_enrolments','outreach_sends','outreach_events','outreach_suppressions',
                           'discovery_searches','discovery_results'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
    execute format('grant select, insert, update, delete on public.%I to service_role', t);
  end loop;
end $$;

revoke all on function public.outreach_block_reason(text, boolean) from public, anon, authenticated;
grant execute on function public.outreach_block_reason(text, boolean) to service_role;
revoke all on function public.outreach_guard_check() from public, anon, authenticated;
grant execute on function public.outreach_guard_check() to service_role;
