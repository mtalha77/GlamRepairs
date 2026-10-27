-- upload_quarantine ran as its owner and was granted to anon, so the public
-- key could list every rejected upload with the uploader's name and email.
-- Both scan views now run as the caller and are service role only, the two
-- tables lose their default public grants (RLS was already on, from the
-- event trigger), and the SECURITY DEFINER rate check is server-side only.
alter view public.safe_uploads set (security_invoker = on);
alter view public.upload_quarantine set (security_invoker = on);
revoke all on public.safe_uploads, public.upload_quarantine from anon, authenticated;
revoke all on public.upload_scans, public.upload_attempts from anon, authenticated;
grant select on public.safe_uploads, public.upload_quarantine to service_role;
grant all on public.upload_scans, public.upload_attempts to service_role;
revoke execute on function public.upload_rate_exceeded(text, uuid, int, bigint) from public, anon, authenticated;
grant execute on function public.upload_rate_exceeded(text, uuid, int, bigint) to service_role;
