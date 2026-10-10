-- HANDOVER-52 §3.3, §3.4, §3.5, decided with Talha 10 October 2026.

-- Ayma's weekly pattern (15 calls a day, five days) is the minimum, not a
-- ceiling to cut: her caps are raised to fit it before caps are enforced.
update public.practitioner_profiles set max_per_day = 15, max_per_week = 75 where slug = 'ayma-arif';

-- 1. Slots only for practitioners who are approved and accepting clients,
--    and never more than their daily or weekly cap (§3.4: a client should
--    never see a time that cannot be taken). Counts every live slot (open,
--    held or booked) on that local day / ISO week.
create or replace function public.generate_slots(p_days integer default 28)
returns integer language plpgsql security definer set search_path to 'public' as $$
declare
  a record; d date; ts timestamptz; te timestamptz; made int := 0; tz text;
  day_count int; week_count int;
begin
  for a in
    select pa.*, pp.id pid, coalesce(pp.timezone,'Asia/Karachi') ptz, pp.max_per_day, pp.max_per_week
    from public.practitioner_availability pa
    join public.practitioner_profiles pp on pp.id = pa.practitioner_id
    where pa.active and pp.status = 'approved' and pp.accepting_clients
  loop
    tz := a.ptz;
    for i in 0..p_days loop
      d := (now() at time zone tz)::date + i;
      continue when extract(dow from d)::int <> a.weekday;
      ts := (d + a.starts_time) at time zone tz;
      while (ts + make_interval(mins => a.slot_minutes)) <= ((d + a.ends_time) at time zone tz) loop
        te := ts + make_interval(mins => a.slot_minutes);
        if ts > now()
           and not exists (select 1 from public.practitioner_blackouts b
                           where b.practitioner_id = a.pid
                             and tstzrange(b.starts_at,b.ends_at) && tstzrange(ts,te))
        then
          select count(*) into day_count from public.availability_slots s
           where s.practitioner_id = a.pid and s.status in ('open','held','booked')
             and (s.starts_at at time zone tz)::date = d;
          select count(*) into week_count from public.availability_slots s
           where s.practitioner_id = a.pid and s.status in ('open','held','booked')
             and date_trunc('week', s.starts_at at time zone tz) = date_trunc('week', d::timestamp);
          if day_count < a.max_per_day and week_count < a.max_per_week then
            begin
              insert into public.availability_slots (practitioner_id, starts_at, ends_at, status)
              values (a.pid, ts, te, 'open');
              made := made + 1;
            exception when exclusion_violation or unique_violation then null;
            end;
          end if;
        end if;
        ts := ts + make_interval(mins => a.stride_minutes);
      end loop;
    end loop;
  end loop;
  return made;
end $$;
revoke all on function public.generate_slots(integer) from public, anon, authenticated;
grant execute on function public.generate_slots(integer) to service_role;

-- 2. Move a booked consultation to another practitioner (§3.5). The target
--    must be approved and free: an open slot of hers at that time is
--    retired (she is now booked then); a held or booked one, or another
--    appointment, refuses. The fee is re-read for the practitioner doing
--    the work. The video room is not tied to a host, so the link stands.
create or replace function public.reassign_appointment(p_appt uuid, p_to uuid, p_by uuid)
returns void language plpgsql security definer set search_path = public as $$
declare a record; t record; r record;
begin
  select * into a from public.appointments where id = p_appt for update;
  if not found then raise exception 'appointment % not found', p_appt; end if;
  if a.status <> 'scheduled' or a.outcome is not null then raise exception 'appointment % is not scheduled', p_appt; end if;
  if a.practitioner_id = p_to then return; end if;

  select * into t from public.practitioner_profiles where id = p_to;
  if not found or t.status <> 'approved' then raise exception 'practitioner % cannot take consultations', p_to; end if;

  if exists (select 1 from public.availability_slots s
              where s.practitioner_id = p_to and s.status in ('held','booked')
                and tstzrange(s.starts_at, s.ends_at) && tstzrange(a.starts_at, a.ends_at)) then
    raise exception 'practitioner % is busy at that time', p_to;
  end if;

  update public.availability_slots
     set status = 'cancelled', updated_at = now()
   where practitioner_id = p_to and status = 'open'
     and tstzrange(starts_at, ends_at) && tstzrange(a.starts_at, a.ends_at);

  select * into r from public.rate_for(p_to, now());

  update public.appointments
     set practitioner_id = p_to,
         practitioner_fee_minor = r.practitioner_fee_minor,
         platform_fee_minor = r.platform_fee_minor,
         fee_currency = r.currency,
         rate_id = r.rate_id,
         outcome_note = coalesce(outcome_note || E'\n', '') || 'Reassigned ' || to_char(now(), 'YYYY-MM-DD HH24:MI') || ' UTC',
         updated_at = now()
   where id = p_appt;

  if a.slot_id is not null then
    update public.availability_slots set practitioner_id = p_to, updated_at = now() where id = a.slot_id;
  end if;
end $$;
revoke all on function public.reassign_appointment(uuid, uuid, uuid) from public, anon, authenticated;
grant execute on function public.reassign_appointment(uuid, uuid, uuid) to service_role;

-- 3. A practitioner leaving (§3.3, Talha: "all the bookings are given to
--    Ayma to attend or assign to someone else"). Closes her hours, takes
--    her open times off sale, releases unpaid holds (that client is asked
--    to choose again when they pay), and moves every booked consultation
--    to p_to. A clash with p_to's diary is left in place and reported, for
--    a super admin to assign by hand. Her notes and earnings stay hers.
create or replace function public.offboard_practitioner(p_profile uuid, p_to uuid, p_by uuid, p_reason text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare a record; moved int := 0; failed jsonb := '[]'::jsonb;
begin
  if p_profile = p_to then raise exception 'cannot hand bookings to the practitioner who is leaving'; end if;

  update public.practitioner_profiles
     set status = 'offboarded', offboarded_at = now(), accepting_clients = false, can_review = false,
         suspended_reason = coalesce(p_reason, suspended_reason), updated_at = now()
   where id = p_profile;
  if not found then raise exception 'practitioner % not found', p_profile; end if;

  update public.practitioner_availability set active = false where practitioner_id = p_profile;

  update public.availability_slots
     set status = 'cancelled', lead_id = null, hold_token = null, held_until = null, updated_at = now()
   where practitioner_id = p_profile and status in ('open','held') and starts_at > now();

  for a in
    select id, starts_at from public.appointments
     where practitioner_id = p_profile and status = 'scheduled' and outcome is null and starts_at > now()
     order by starts_at
  loop
    begin
      perform public.reassign_appointment(a.id, p_to, p_by);
      moved := moved + 1;
    exception when others then
      failed := failed || jsonb_build_object('appointment_id', a.id, 'starts_at', a.starts_at, 'reason', sqlerrm);
    end;
  end loop;

  return jsonb_build_object('moved', moved, 'failed', failed);
end $$;
revoke all on function public.offboard_practitioner(uuid, uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.offboard_practitioner(uuid, uuid, uuid, text) to service_role;
