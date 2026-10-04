-- HANDOVER-50: generate_slots was not idempotent. It swallowed
-- exclusion_violation for an existing slot, but the partial unique index
-- availability_no_overlap (practitioner_id, starts_at) fires first, raising
-- unique_violation, which was not caught: the second nightly run failed on
-- the first slot it had already made. Both mean "already there, fine".
create or replace function public.generate_slots(p_days integer default 28)
returns integer language plpgsql security definer set search_path to 'public' as $$
declare
  a record; d date; ts timestamptz; te timestamptz; made int := 0; tz text;
begin
  for a in
    select pa.*, pp.id pid, coalesce(pp.timezone,'Asia/Karachi') ptz
    from public.practitioner_availability pa
    join public.practitioner_profiles pp on pp.id = pa.practitioner_id
    where pa.active
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
          begin
            insert into public.availability_slots (practitioner_id, starts_at, ends_at, status)
            values (a.pid, ts, te, 'open');
            made := made + 1;
          exception when exclusion_violation or unique_violation then null;
          end;
        end if;
        ts := ts + make_interval(mins => a.stride_minutes);
      end loop;
    end loop;
  end loop;
  return made;
end $$;
revoke all on function public.generate_slots(integer) from public, anon, authenticated;
grant execute on function public.generate_slots(integer) to service_role;
