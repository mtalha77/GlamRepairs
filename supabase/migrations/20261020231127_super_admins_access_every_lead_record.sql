-- 20 October 2026 — follows 20261020192302. can_access_studio_lead() gates
-- a lead's emails, reports and reviews, and only the owner passed it for
-- clients not assigned to them. A super admin (Ayma) manages every client,
-- so she reads every client's record too.
create or replace function private.can_access_studio_lead(p_lead_id uuid)
returns boolean
language sql
stable
security definer
set search_path to ''
as $$
  select
    private.can_manage_clients()
    or exists (
      select 1 from public.leads
       where id = p_lead_id
         and (assigned_to = auth.uid() or report_sender_id = auth.uid())
    );
$$;
