-- HANDOVER-50: confirm_slot booked an open slot (the expired-hold recovery
-- path) without writing lead_id, so the booking belonged to nobody, and it
-- accepted slots in the past. It now records the lead, refuses past slots,
-- and releases any other hold the same lead still has.
create or replace function public.confirm_slot(p_slot uuid, p_lead uuid)
returns boolean language plpgsql security definer set search_path to 'public' as $$
begin
  update public.availability_slots
     set status='booked', lead_id=p_lead, held_until=null, hold_token=null, updated_at=now()
   where id=p_slot
     and starts_at > now()
     and (status='open' or (status='held' and lead_id=p_lead));
  if not found then return false; end if;
  update public.availability_slots
     set status='open', held_until=null, hold_token=null, lead_id=null, updated_at=now()
   where lead_id=p_lead and status='held' and id <> p_slot;
  return true;
end $$;
revoke all on function public.confirm_slot(uuid, uuid) from public, anon, authenticated;
grant execute on function public.confirm_slot(uuid, uuid) to service_role;
