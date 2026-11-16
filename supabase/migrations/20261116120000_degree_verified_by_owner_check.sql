-- 16 November 2026. Talha has checked Ayma Arif's degree himself and holds
-- it; there is no file in practitioner_documents (she joined as the owner,
-- never through /join, which is the only upload route). Her verification is
-- recorded the way Usifo's MBBS was: credential_verified_at and _by on the
-- profile, stamped with who checked it and when.
--
-- practitioner_public.degree_verified now counts either evidence: a verified
-- degree document, or a credential an admin has recorded as verified.
-- Everything public reads this one column (the About badge, hasCredential).

update public.practitioner_profiles
   set credential_verified_at = now(),
       credential_verified_by = '70e95c8e-c54f-434c-b2dd-2ac13fd95b0b'
 where id = 'c97630b7-bdc3-4691-9e9c-35b15ef536df'
   and credential_verified_at is null;

do $$
declare v_def text; v_old text; v_new text;
begin
  v_def := pg_get_viewdef('public.practitioner_public'::regclass, true);
  v_old := '(EXISTS ( SELECT 1
           FROM practitioner_documents d
          WHERE d.practitioner_id = p.id AND d.kind = ''degree''::text AND d.verified AND d.deleted_at IS NULL)) AS degree_verified';
  v_new := '((EXISTS ( SELECT 1
           FROM practitioner_documents d
          WHERE d.practitioner_id = p.id AND d.kind = ''degree''::text AND d.verified AND d.deleted_at IS NULL)) OR p.credential_verified_at IS NOT NULL) AS degree_verified';
  if position(v_old in v_def) = 0 then
    raise exception 'practitioner_public definition changed; degree_verified expression not found';
  end if;
  execute 'create or replace view public.practitioner_public with (security_invoker = true) as ' || replace(v_def, v_old, v_new);
end $$;
