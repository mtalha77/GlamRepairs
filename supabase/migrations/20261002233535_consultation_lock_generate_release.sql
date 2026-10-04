-- HANDOVER-50: generate_slots and release_expired_holds are SECURITY DEFINER
-- maintenance functions; only the server's cron and booking code call them.
revoke all on function public.generate_slots(integer) from public, anon, authenticated;
grant execute on function public.generate_slots(integer) to service_role;
revoke all on function public.release_expired_holds() from public, anon, authenticated;
grant execute on function public.release_expired_holds() to service_role;
