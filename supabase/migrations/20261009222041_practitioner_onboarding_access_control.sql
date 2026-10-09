-- HANDOVER-51 follow-up: the onboarding tables shipped with RLS off and
-- full anon grants, and the four SECURITY DEFINER functions were executable
-- by anon. With the public key anyone could read every applicant, approve
-- an application (creating a practitioner profile) or issue invites.
-- Applicant data is PII and the decisions are super-admin actions, so:
-- server (service role) only, plus super-admin reads through RLS.
alter table public.practitioner_applications enable row level security;
alter table public.practitioner_invites enable row level security;

revoke all on public.practitioner_applications, public.practitioner_invites,
  public.practitioner_application_queue from anon, authenticated;
revoke all on public.practitioner_documents from anon;
revoke truncate, references, trigger on public.practitioner_documents from authenticated;

create policy "super admin reads applications" on public.practitioner_applications
  for select to authenticated using (private.is_super_admin());
grant select on public.practitioner_applications to authenticated;

-- The queue view runs with the caller's rights, so the policy above applies.
alter view public.practitioner_application_queue set (security_invoker = true);
grant select on public.practitioner_application_queue to authenticated;

-- Invites hold token hashes; no client role ever needs them.

revoke all on function public.issue_practitioner_invite(text, text, uuid, text, integer) from public, anon, authenticated;
revoke all on function public.lookup_practitioner_invite(text) from public, anon, authenticated;
revoke all on function public.approve_practitioner_application(uuid, uuid, text) from public, anon, authenticated;
revoke all on function public.reject_practitioner_application(uuid, uuid, text, integer) from public, anon, authenticated;
grant execute on function public.issue_practitioner_invite(text, text, uuid, text, integer) to service_role;
grant execute on function public.lookup_practitioner_invite(text) to service_role;
grant execute on function public.approve_practitioner_application(uuid, uuid, text) to service_role;
grant execute on function public.reject_practitioner_application(uuid, uuid, text, integer) to service_role;
