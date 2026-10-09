-- HANDOVER-52 follow-up.
-- 1. The eight new tables shipped with RLS off and full anon grants, so the
--    public key could read every consultation note or rewrite a payout, and
--    settle_appointment was executable by anon (anyone could settle an
--    appointment and create earnings). Server only, plus super-admin reads
--    and a practitioner reading her own rows.
do $$
declare t text;
begin
  foreach t in array array['practitioner_rates','practitioner_earnings','practitioner_payouts',
    'practitioner_revision_requests','consultation_notes','consultation_transcripts',
    'consultation_access_log','consultation_feedback'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
    execute format('grant select on public.%I to authenticated', t);
    execute format('create policy "super admin reads %s" on public.%I for select to authenticated using (private.is_super_admin())', t, t);
  end loop;
end $$;

create policy "practitioner reads own notes" on public.consultation_notes for select to authenticated
  using (exists (select 1 from public.practitioner_profiles p where p.id = consultation_notes.practitioner_id and p.user_id = auth.uid()));
create policy "practitioner reads own earnings" on public.practitioner_earnings for select to authenticated
  using (exists (select 1 from public.practitioner_profiles p where p.id = practitioner_earnings.practitioner_id and p.user_id = auth.uid()));
create policy "practitioner reads own payouts" on public.practitioner_payouts for select to authenticated
  using (exists (select 1 from public.practitioner_profiles p where p.id = practitioner_payouts.practitioner_id and p.user_id = auth.uid()));
create policy "practitioner reads own rates" on public.practitioner_rates for select to authenticated
  using (exists (select 1 from public.practitioner_profiles p where p.id = practitioner_rates.practitioner_id and p.user_id = auth.uid()));
create policy "practitioner reads own revision requests" on public.practitioner_revision_requests for select to authenticated
  using (exists (select 1 from public.practitioner_profiles p where p.id = practitioner_revision_requests.practitioner_id and p.user_id = auth.uid()));

revoke all on function public.rate_for(uuid, timestamptz) from public, anon, authenticated;
revoke all on function public.settle_appointment(uuid, text, uuid, text) from public, anon, authenticated;
revoke all on function public.practitioner_has_verified_degree(uuid) from public, anon, authenticated;
revoke all on function public.mark_earnings_payable() from public, anon, authenticated;
revoke all on function public.guard_practitioner_approval() from public, anon, authenticated;
grant execute on function public.rate_for(uuid, timestamptz) to service_role;
grant execute on function public.settle_appointment(uuid, text, uuid, text) to service_role;
grant execute on function public.practitioner_has_verified_degree(uuid) to service_role;

-- 2. settle_appointment fixes:
--    a) status said 'completed' for every outcome, including cancellations
--       and no-shows. Now: attended -> completed, client_no_show -> no_show,
--       anything nobody is charged for -> cancelled.
--    b) releasing the slot left the appointment holding slot_id, and the
--       unique index on appointments(slot_id) then refused any rebooking of
--       the released time. The appointment and the slot are now detached.
--    c) an earning was always created 'pending', and only a note INSERTED
--       later made it payable, so a note written before settlement held the
--       money forever. If the note already exists the earning is payable.
create or replace function public.settle_appointment(
  p_appt uuid, p_outcome text, p_by uuid, p_note text default null
) returns uuid
language plpgsql security definer set search_path = public as $$
declare a record; s record; v_reason text; v_prac int; v_plat int; v_id uuid; v_hours numeric;
        v_status text; v_has_note boolean;
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

  v_status := case
    when p_outcome = 'attended' then 'completed'
    when p_outcome = 'client_no_show' then 'no_show'
    when v_reason is not null then 'completed'
    else 'cancelled' end;

  update public.appointments
     set outcome = p_outcome, outcome_at = now(), outcome_by = p_by,
         outcome_note = p_note, status = v_status, updated_at = now(),
         slot_id = case when v_reason is null then null else slot_id end
   where id = p_appt;

  -- Free the slot when nobody is being charged for it
  if v_reason is null and a.slot_id is not null then
    update public.availability_slots
       set status = case when starts_at > now() then 'open' else 'cancelled' end,
           lead_id = null, hold_token = null, held_until = null,
           appointment_id = null, updated_at = now()
     where id = a.slot_id;
  end if;

  if v_reason is null then return null; end if;

  select exists (select 1 from public.consultation_notes n where n.appointment_id = p_appt) into v_has_note;

  insert into public.practitioner_earnings
    (appointment_id, practitioner_id, earned_at, currency,
     gross_minor, practitioner_minor, platform_minor, reason, status, note)
  values
    (p_appt, a.practitioner_id, coalesce(a.ends_at, now()), coalesce(a.fee_currency,'PKR'),
     v_prac + v_plat, v_prac, v_plat, v_reason,
     case when v_has_note then 'payable' else 'pending' end, p_note)
  returning id into v_id;

  return v_id;
end $$;
revoke all on function public.settle_appointment(uuid, text, uuid, text) from public, anon, authenticated;
grant execute on function public.settle_appointment(uuid, text, uuid, text) to service_role;
