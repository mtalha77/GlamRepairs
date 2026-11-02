-- Handover 66 follow-up (already applied to production on 31 October).
--
-- The agreement objects were created with Supabase's default grants (anon
-- and authenticated: ALL). The two tables have RLS on with no policies, so
-- nothing leaked through them, but practitioner_agreement_status was created
-- without security_invoker, so it ran as its owner, skipped RLS, and the
-- public anon key could read every practitioner's name, slug and acceptance
-- dates through PostgREST.
--
-- Same treatment as practitioner_public and practitioner_readiness: the view
-- runs as the caller, and only the service role (the server) can read any
-- of it. Every read and write goes through server code.

alter view public.practitioner_agreement_status set (security_invoker = true);

revoke all on public.practitioner_agreements from anon, authenticated;
revoke all on public.practitioner_agreement_acceptances from anon, authenticated;
revoke all on public.practitioner_agreement_status from anon, authenticated;

grant select, insert, update on public.practitioner_agreements to service_role;
grant select, insert on public.practitioner_agreement_acceptances to service_role;
grant select on public.practitioner_agreement_status to service_role;

-- Handover 66 §6: superseded by practitioner_agreement_acceptances.
comment on column public.practitioner_profiles.accepted_terms_at is
  'DEPRECATED (Handover 66). Kept in step with practitioner_agreement_acceptances for the approved_requires_terms constraint; remove once nothing reads it. Evidence lives in practitioner_agreement_acceptances.';
comment on column public.practitioner_profiles.accepted_terms_version is
  'DEPRECATED (Handover 66). Mirrors the latest accepted agreement version; the record is practitioner_agreement_acceptances.';
