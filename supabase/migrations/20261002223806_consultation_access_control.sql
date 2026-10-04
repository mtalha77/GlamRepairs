-- HANDOVER-50, part 1 of 3: access.
-- consultation_settings, practitioner_availability and practitioner_blackouts
-- had RLS off with full anon grants, so anyone holding the public anon key
-- could rewrite Ayma's hours, blackouts or the guidelines text. Studio
-- members read; super admins write; the settings row is public to read
-- because the funnel shows the guidelines and the lead time.
alter table public.consultation_settings enable row level security;
alter table public.practitioner_availability enable row level security;
alter table public.practitioner_blackouts enable row level security;

revoke all on public.consultation_settings, public.practitioner_availability, public.practitioner_blackouts,
  public.availability_slots, public.appointments, public.practitioner_profiles from anon;
revoke truncate, references, trigger on public.consultation_settings, public.practitioner_availability,
  public.practitioner_blackouts, public.availability_slots, public.appointments, public.practitioner_profiles from authenticated;

grant select on public.consultation_settings, public.availability_slots, public.practitioner_profiles to anon;

create policy "anyone reads consultation settings" on public.consultation_settings
  for select to anon, authenticated using (true);
create policy "super admin writes consultation settings" on public.consultation_settings
  for all to authenticated using (private.is_super_admin()) with check (private.is_super_admin());
create policy "studio reads availability" on public.practitioner_availability
  for select to authenticated using (private.is_studio_member());
create policy "super admin writes availability" on public.practitioner_availability
  for all to authenticated using (private.is_super_admin()) with check (private.is_super_admin());
create policy "studio reads blackouts" on public.practitioner_blackouts
  for select to authenticated using (private.is_studio_member());
create policy "super admin writes blackouts" on public.practitioner_blackouts
  for all to authenticated using (private.is_super_admin()) with check (private.is_super_admin());

-- One appointment per slot: a double-clicked "verify" cannot book twice.
create unique index if not exists appointments_slot_id_key
  on public.appointments (slot_id) where slot_id is not null;

alter table public.studio_notifications drop constraint if exists studio_notifications_type_check;
alter table public.studio_notifications add constraint studio_notifications_type_check
  check (type = any (array['chat_message','review_submitted','payment_verified','customer_assigned','consultation_alert']));
