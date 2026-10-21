-- 20 October 2026 — email 2FA, step two of two (see 20261020232902).
--
-- Every studio membership check used by RLS now also requires the caller's
-- session to have passed email 2FA within 30 days. Without this, a stolen
-- password could still read studio data by calling the API directly with
-- the session token, skipping the app's verify page entirely.
--
-- Applied after the app that records verified sessions was live, so nobody
-- was locked out. The service role (crons, server-side admin reads) has no
-- auth.uid() and never passed these checks anyway, so it is unaffected.

create or replace function private.is_studio_member()
returns boolean language sql stable security definer set search_path to ''
as $$
  select private.session_verified() and exists (
    select 1 from public.studio_members
     where user_id = auth.uid() and member_kind is distinct from 'practitioner'
  );
$$;

create or replace function private.has_studio_seat()
returns boolean language sql stable security definer set search_path to ''
as $$
  select private.session_verified() and exists (select 1 from public.studio_members where user_id = auth.uid());
$$;

create or replace function private.is_studio_owner()
returns boolean language sql stable security definer set search_path to ''
as $$
  select private.session_verified() and exists (
    select 1 from public.studio_members where user_id = auth.uid() and role = 'owner'
  );
$$;

create or replace function private.is_super_admin()
returns boolean language sql stable security definer set search_path to ''
as $$
  select private.session_verified() and exists (
    select 1 from public.studio_members where user_id = auth.uid() and is_super_admin = true
  );
$$;

create or replace function private.can_manage_clients()
returns boolean language sql stable security definer set search_path to ''
as $$
  select private.session_verified() and exists (
    select 1 from public.studio_members
     where user_id = auth.uid() and (role = 'owner' or is_super_admin = true)
  );
$$;

create or replace function private.member_can_send_report()
returns boolean language sql stable security definer set search_path to ''
as $$
  select private.session_verified() and (
    private.is_studio_owner()
    or exists (select 1 from public.studio_members where user_id = auth.uid() and can_send_report = true)
  );
$$;

create or replace function private.member_can_verify_payment()
returns boolean language sql stable security definer set search_path to ''
as $$
  select private.session_verified() and exists (
    select 1 from public.studio_members
     where user_id = auth.uid() and is_super_admin = true and can_verify_payment = true
  );
$$;

create or replace function private.can_access_studio_lead(p_lead_id uuid)
returns boolean language sql stable security definer set search_path to ''
as $$
  select private.session_verified() and (
    private.can_manage_clients()
    or exists (
      select 1 from public.leads
       where id = p_lead_id and (assigned_to = auth.uid() or report_sender_id = auth.uid())
    )
  );
$$;
