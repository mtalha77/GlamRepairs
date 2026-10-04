-- HANDOVER-50: hold_slot let one lead hold several slots at once. Picking
-- again now releases the earlier hold, and only after the new hold is in
-- place, so a failed pick never leaves the client with nothing. It also
-- refuses slots inside the lead time: the picker hides them, but the
-- function is the rule.
create or replace function public.hold_slot(p_slot uuid, p_lead uuid, p_minutes integer default 120)
returns text language plpgsql security definer set search_path to 'public' as $$
declare tok text; lead_hours int;
begin
  perform public.release_expired_holds();
  select lead_time_hours into lead_hours from public.consultation_settings where id = 1;
  tok := replace(gen_random_uuid()::text,'-','') || replace(gen_random_uuid()::text,'-','');
  update public.availability_slots
     set status='held', lead_id=p_lead, hold_token=tok,
         held_until = now() + make_interval(mins => p_minutes), updated_at=now()
   where id=p_slot and status='open'
     and starts_at >= now() + make_interval(hours => coalesce(lead_hours, 24));
  if not found then return null; end if;
  update public.availability_slots
     set status='open', held_until=null, hold_token=null, lead_id=null, updated_at=now()
   where lead_id=p_lead and status='held' and id <> p_slot;
  return tok;
end $$;
revoke all on function public.hold_slot(uuid, uuid, integer) from public, anon, authenticated;
grant execute on function public.hold_slot(uuid, uuid, integer) to service_role;
