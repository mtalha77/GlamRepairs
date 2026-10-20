-- 20 October 2026 — Ayma assigns. Talha: practitioners cannot choose
-- appointments; only Ayma, the MD, assigns, and she has the major super
-- admin features.
--
-- Ayma now signs in with her own account (staff role, super admin), and
-- the leads policies only let the owner see and assign every client. A
-- super admin manages clients too. Team management stays with the owner.

create or replace function private.can_manage_clients()
returns boolean
language sql
stable
security definer
set search_path to ''
as $$
  select exists (
    select 1 from public.studio_members
     where user_id = auth.uid()
       and (role = 'owner' or is_super_admin = true)
  );
$$;

revoke execute on function private.can_manage_clients() from public, anon;
grant execute on function private.can_manage_clients() to authenticated, service_role;

alter policy "studio members read leads" on public.leads
  using (private.can_manage_clients()
         or (private.is_studio_member() and ((assigned_to = auth.uid()) or (report_sender_id = auth.uid()))));

alter policy "studio members insert leads" on public.leads
  with check (private.is_studio_member() and (private.can_manage_clients() or (assigned_to is null)));

alter policy "studio members update leads" on public.leads
  using (private.can_manage_clients()
         or (private.is_studio_member() and ((assigned_to = auth.uid()) or (report_sender_id = auth.uid()))))
  with check (private.can_manage_clients()
         or (private.is_studio_member()
             and (not (assigned_to is distinct from private.lead_assigned_to(id)))
             and (not (report_sender_id is distinct from private.lead_report_sender(id)))
             and ((private.lead_assigned_to(id) = auth.uid()) or (private.lead_report_sender(id) = auth.uid()))));
