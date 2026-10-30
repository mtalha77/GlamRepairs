-- Studio → Gift codes could not create a code (30 October 2026: production
-- logged "[issueCode] permission denied for schema private" twice).
--
-- The studio issues codes through the service role, which has no USAGE on
-- the private schema. gift_codes_guard ran as the caller and calls
-- private.gift_plan_is_offerable(), so every insert failed before the row
-- was written. It now runs as its owner, like the other trigger functions
-- that reach into private; nothing about what it allows changes.
create or replace function private.gift_codes_guard()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
begin
  if not private.gift_plan_is_offerable(new.grants_plan) then
    raise exception
      'gift code % grants plan "%", which is not currently offered. Use an active plan.',
      new.code, new.grants_plan
      using errcode = '23514';
  end if;
  return new;
end;
$function$;
