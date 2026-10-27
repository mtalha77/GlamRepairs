-- find_near_duplicate is SECURITY DEFINER and returned storage paths for a
-- lead or application to anyone holding the public key. Server-side only.
revoke execute on function public.find_near_duplicate(text, uuid, uuid, int) from public, anon, authenticated;
grant execute on function public.find_near_duplicate(text, uuid, uuid, int) to service_role;
