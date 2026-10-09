create table if not exists public.practitioner_payouts (
  id              uuid primary key default gen_random_uuid(),
  practitioner_id uuid not null references public.practitioner_profiles(id) on delete restrict,
  period_start    date not null,
  period_end      date not null,
  currency        text not null default 'PKR',
  total_minor     integer not null default 0,
  status          text not null default 'draft',
  reference       text,
  paid_at         timestamptz,
  paid_by         uuid references auth.users(id) on delete set null,
  note            text,
  created_at      timestamptz not null default now(),

  constraint practitioner_payouts_status_check
    check (status in ('draft','approved','paid','cancelled')),
  constraint practitioner_payouts_period
    check (period_end >= period_start),
  constraint practitioner_payouts_paid_needs_detail
    check (status <> 'paid' or (paid_at is not null and reference is not null and paid_by is not null)),
  constraint practitioner_payouts_total_nonneg
    check (total_minor >= 0)
);

create unique index if not exists practitioner_payouts_one_per_period
  on public.practitioner_payouts (practitioner_id, period_start, period_end)
  where status <> 'cancelled';

-- One ledger line per consultation. The amounts are copied from the
-- appointment snapshot, never recomputed from the current rate.
create table if not exists public.practitioner_earnings (
  id                uuid primary key default gen_random_uuid(),
  appointment_id    uuid not null references public.appointments(id) on delete restrict,
  practitioner_id   uuid not null references public.practitioner_profiles(id) on delete restrict,
  earned_at         timestamptz not null,
  currency          text not null default 'PKR',
  gross_minor       integer not null,
  practitioner_minor integer not null,
  platform_minor    integer not null,
  reason            text not null,
  status            text not null default 'pending',
  payout_id         uuid references public.practitioner_payouts(id) on delete set null,
  note              text,
  created_at        timestamptz not null default now(),

  constraint practitioner_earnings_status_check
    check (status in ('pending','payable','paid','void')),
  constraint practitioner_earnings_reason_check
    check (reason in ('attended','client_no_show','cancelled_late','adjustment','reversal')),
  constraint practitioner_earnings_splits_add_up
    check (practitioner_minor + platform_minor = gross_minor),
  constraint practitioner_earnings_paid_needs_payout
    check (status <> 'paid' or payout_id is not null)
);

-- One live ledger line per appointment. A reversal is a second line, never an
-- edit of the first, so the history stays auditable.
create unique index if not exists practitioner_earnings_one_live_per_appt
  on public.practitioner_earnings (appointment_id)
  where status <> 'void' and reason <> 'reversal';

create index if not exists practitioner_earnings_payable_idx
  on public.practitioner_earnings (practitioner_id, status, earned_at)
  where status in ('pending','payable');

-- settle_appointment is defined here as handed over; it is replaced by
-- 20261009232329_marketplace_access_control_and_settle_fix.sql.
create or replace function public.settle_appointment(
  p_appt uuid, p_outcome text, p_by uuid, p_note text default null
) returns uuid
language plpgsql security definer set search_path = public as $$
declare a record; s record; v_reason text; v_prac int; v_plat int; v_id uuid; v_hours numeric;
begin
  select * into a from public.appointments where id = p_appt for update;
  if not found then raise exception 'appointment % not found', p_appt; end if;
  if a.outcome is not null then raise exception 'appointment % already settled as %', p_appt, a.outcome; end if;
  if a.practitioner_fee_minor is null then
    raise exception 'appointment % has no fee snapshot, it was booked incorrectly', p_appt;
  end if;

  select * into s from public.consultation_settings limit 1;
  v_hours := extract(epoch from (a.starts_at - now())) / 3600.0;

  if p_outcome = 'attended' then
    v_reason := 'attended'; v_prac := a.practitioner_fee_minor; v_plat := a.platform_fee_minor;
  elsif p_outcome = 'client_no_show' then
    v_reason := 'client_no_show'; v_prac := a.practitioner_fee_minor; v_plat := a.platform_fee_minor;
  elsif p_outcome = 'cancelled_by_client' then
    if v_hours < s.cancellation_hours then
      v_reason := 'cancelled_late'; v_prac := a.practitioner_fee_minor; v_plat := a.platform_fee_minor;
    else
      v_reason := null;
    end if;
  elsif p_outcome in ('practitioner_no_show','cancelled_by_practitioner','technical_failure') then
    v_reason := null;
  else
    raise exception 'unknown outcome %', p_outcome;
  end if;

  update public.appointments
     set outcome = p_outcome, outcome_at = now(), outcome_by = p_by,
         outcome_note = p_note, status = 'completed', updated_at = now()
   where id = p_appt;

  if v_reason is null and a.slot_id is not null then
    update public.availability_slots
       set status = 'open', lead_id = null, hold_token = null,
           held_until = null, updated_at = now()
     where id = a.slot_id and starts_at > now();
  end if;

  if v_reason is null then return null; end if;

  insert into public.practitioner_earnings
    (appointment_id, practitioner_id, earned_at, currency,
     gross_minor, practitioner_minor, platform_minor, reason, status, note)
  values
    (p_appt, a.practitioner_id, coalesce(a.ends_at, now()), coalesce(a.fee_currency,'PKR'),
     v_prac + v_plat, v_prac, v_plat, v_reason, 'pending', p_note)
  returning id into v_id;

  return v_id;
end $$;

-- A note that is submitted makes the earning payable. No note, no payout.
create or replace function public.mark_earnings_payable()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.practitioner_earnings
     set status = 'payable'
   where appointment_id = new.appointment_id and status = 'pending';
  return new;
end $$;

drop trigger if exists consultation_note_releases_earning on public.consultation_notes;
create trigger consultation_note_releases_earning
  after insert on public.consultation_notes
  for each row execute function public.mark_earnings_payable();
