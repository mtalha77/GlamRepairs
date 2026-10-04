-- HANDOVER-50: changing the weekly pattern or adding a blackout left the
-- old open slots in place, and the no-overlap constraint then made
-- generate_slots skip the new pattern silently. This retires future
-- unclaimed slots (status 'cancelled', which the constraint ignores) and
-- regenerates. Held and booked slots are never touched, and nothing is
-- removed, so what was on offer stays auditable.
create or replace function public.refresh_open_slots(p_days integer default 28)
returns integer language plpgsql security definer set search_path to 'public' as $$
begin
  perform public.release_expired_holds();
  update public.availability_slots
     set status = 'cancelled', updated_at = now()
   where status = 'open' and lead_id is null and appointment_id is null
     and starts_at > now();
  return public.generate_slots(p_days);
end $$;
revoke all on function public.refresh_open_slots(integer) from public, anon, authenticated;
grant execute on function public.refresh_open_slots(integer) to service_role;
