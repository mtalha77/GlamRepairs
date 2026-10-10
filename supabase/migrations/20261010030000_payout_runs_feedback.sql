-- Payout runs and the feedback request — HANDOVER-52 §2.7, §4.6, §3.6.
--
-- A run pays every earning that is payable (its note is written) and not
-- yet in a payout, up to the end of the period. Earnings still waiting on a
-- note stay held and are shown as held; when the note arrives they join the
-- next run, so nothing is lost by being late.

alter table public.practitioner_payouts
  add column if not exists approved_at timestamptz,
  add column if not exists approved_by uuid references auth.users(id) on delete set null;

alter table public.appointments
  add column if not exists feedback_requested_at timestamptz;

-- Period boundaries are Pakistan dates.
create or replace function public.create_payout_run(p_start date, p_end date, p_by uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_until timestamptz := ((p_end + 1)::timestamp at time zone 'Asia/Karachi');
  r record;
  v_id uuid;
  v_status text;
  v_total integer;
  n integer := 0;
begin
  if p_end < p_start then
    raise exception 'period_end_before_start';
  end if;

  for r in
    select e.practitioner_id
    from public.practitioner_earnings e
    where e.status = 'payable' and e.payout_id is null and e.earned_at < v_until
    group by e.practitioner_id
    having sum(e.practitioner_minor) > 0
  loop
    select p.id, p.status into v_id, v_status
    from public.practitioner_payouts p
    where p.practitioner_id = r.practitioner_id
      and p.period_start = p_start and p.period_end = p_end
      and p.status <> 'cancelled'
    limit 1;

    -- Already paid for this period: late earnings wait for the next one.
    if v_status = 'paid' then
      v_id := null;
      v_status := null;
      continue;
    end if;

    if v_id is null then
      insert into public.practitioner_payouts (practitioner_id, period_start, period_end, total_minor, status, approved_at, approved_by)
      values (r.practitioner_id, p_start, p_end, 0, 'approved', now(), p_by)
      returning id into v_id;
    end if;

    update public.practitioner_earnings
      set payout_id = v_id
      where practitioner_id = r.practitioner_id
        and status = 'payable' and payout_id is null and earned_at < v_until;

    select coalesce(sum(practitioner_minor), 0)::integer into v_total
      from public.practitioner_earnings where payout_id = v_id and status <> 'void';

    update public.practitioner_payouts
      set total_minor = v_total, status = 'approved', approved_at = now(), approved_by = p_by
      where id = v_id;

    n := n + 1;
    v_id := null;
    v_status := null;
  end loop;

  return n;
end;
$$;

create or replace function public.mark_payout_paid(p_payout uuid, p_reference text, p_by uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if coalesce(trim(p_reference), '') = '' then
    raise exception 'reference_required';
  end if;
  update public.practitioner_payouts
    set status = 'paid', paid_at = now(), paid_by = p_by, reference = trim(p_reference)
    where id = p_payout and status = 'approved';
  if not found then
    return false;
  end if;
  update public.practitioner_earnings
    set status = 'paid'
    where payout_id = p_payout and status = 'payable';
  return true;
end;
$$;

create or replace function public.cancel_payout(p_payout uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.practitioner_payouts set status = 'cancelled' where id = p_payout and status = 'approved';
  if not found then
    return false;
  end if;
  update public.practitioner_earnings set payout_id = null where payout_id = p_payout and status = 'payable';
  return true;
end;
$$;

revoke all on function public.create_payout_run(date, date, uuid) from public, anon, authenticated;
revoke all on function public.mark_payout_paid(uuid, text, uuid) from public, anon, authenticated;
revoke all on function public.cancel_payout(uuid) from public, anon, authenticated;
grant execute on function public.create_payout_run(date, date, uuid) to service_role;
grant execute on function public.mark_payout_paid(uuid, text, uuid) to service_role;
grant execute on function public.cancel_payout(uuid) to service_role;
