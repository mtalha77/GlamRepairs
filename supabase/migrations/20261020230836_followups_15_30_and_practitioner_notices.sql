-- 20 October 2026 — Talha: clients get a follow-up 15 and 30 days after
-- their report, by email and WhatsApp, so they can contact us if needed.
-- Practitioners get an email when a consultation is booked, reminders
-- before it, and are chased for the note afterwards.

-- ── Follow-ups: 15 and 30 days, every plan ─────────────────────────────
alter table public.client_followups
  add column if not exists email_sent_at timestamptz,
  add column if not exists whatsapp_sent_at timestamptz,
  add column if not exists whatsapp_sent_by uuid references auth.users(id) on delete set null;

create or replace function private.on_report_sent_schedule_followups()
returns trigger language plpgsql security definer set search_path to ''
as $$
begin
  if NEW.sent_at is null or (TG_OP = 'UPDATE' and OLD.sent_at is not null) then
    return NEW;
  end if;
  insert into public.client_followups (lead_id, sequence, due_at)
  values (NEW.lead_id, 1, NEW.sent_at + interval '15 days'),
         (NEW.lead_id, 2, NEW.sent_at + interval '30 days')
  on conflict (lead_id, sequence) do nothing;
  return NEW;
end;
$$;

-- Existing clients: the same schedule from their first report. Anything
-- already past is shown in the studio queue; the email job only sends
-- follow-ups that fell due in the last week, so nobody is surprised.
with first_report as (
  select lead_id, min(sent_at) as sent_at
    from public.studio_reports where sent_at is not null group by lead_id
)
insert into public.client_followups (lead_id, sequence, due_at)
select r.lead_id, s.seq, r.sent_at + make_interval(days => s.days)
  from first_report r
  cross join (values (1, 15), (2, 30)) as s(seq, days)
  join public.leads l on l.id = r.lead_id and l.deleted_at is null and l.is_test = false
on conflict (lead_id, sequence) do update
  set due_at = excluded.due_at
  where public.client_followups.status = 'pending';

insert into public.email_templates (key, label, subject, body_markdown, active) values
('followup_15', 'Fifteen days after the report',
 'How is your skin doing, {{first_name}}?',
 E'Hi {{first_name}},\n\nIt has been about two weeks since your assessment arrived, which is usually when people start to notice whether a routine suits them.\n\n**How is it going?** If something stings, feels too heavy, or you are not sure you are using a step correctly, tell us. Small adjustments now save weeks of guessing.\n\nJust reply to this email, or message us on WhatsApp {{whatsapp}}. Ayma reads every message herself.',
 true),
('followup_30', 'Thirty days after the report',
 'One month on, {{first_name}}',
 E'Hi {{first_name}},\n\nIt has been a month since your assessment. By now the routine has had time to show what it can do.\n\nIf you are seeing progress, carry on. If you are not, or your skin has changed with the weather, we would like to hear about it and help you adjust.\n\nReply to this email or message us on WhatsApp {{whatsapp}}. We are here if you need us.',
 true)
on conflict (key) do nothing;

-- ── Practitioner notices ───────────────────────────────────────────────
alter table public.appointments
  add column if not exists practitioner_notified_at timestamptz,
  add column if not exists practitioner_reminder_24h_at timestamptz,
  add column if not exists practitioner_reminder_1h_at timestamptz,
  add column if not exists note_reminder_count smallint not null default 0,
  add column if not exists note_reminder_at timestamptz;

-- Appointments already in the diary have been seen; do not announce them.
update public.appointments set practitioner_notified_at = now() where practitioner_notified_at is null;
