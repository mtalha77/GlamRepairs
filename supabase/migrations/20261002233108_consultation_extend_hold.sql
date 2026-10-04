-- HANDOVER-50: the hold starts when a time is picked, mid-funnel; the
-- payment window should run from when the client is shown the bank
-- details, so lead submission re-arms it. A hold that has already lapsed
-- is not revived: that slot may be someone else's by now.
create or replace function public.extend_hold(p_lead uuid, p_minutes integer)
returns timestamptz language plpgsql security definer set search_path to 'public' as $$
declare until timestamptz;
begin
  update public.availability_slots
     set held_until = now() + make_interval(mins => p_minutes), updated_at = now()
   where lead_id = p_lead and status = 'held' and held_until > now()
  returning held_until into until;
  return until;
end $$;
revoke all on function public.extend_hold(uuid, integer) from public, anon, authenticated;
grant execute on function public.extend_hold(uuid, integer) to service_role;
