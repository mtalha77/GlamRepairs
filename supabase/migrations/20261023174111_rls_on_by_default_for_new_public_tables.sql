-- The root cause of three exposures on 23 October: in this project a new table
-- in public is granted to anon and authenticated by default, so a table
-- created without "enable row level security" is readable and writable with
-- the public key. This event trigger switches RLS on for every new public
-- table as it is created. With no policies that means service role only,
-- which fails closed: a table meant for the browser needs a policy, written
-- on purpose.
--
-- Views are not covered: a view still runs as its owner unless it is created
-- with security_invoker = on.
create or replace function private.enable_rls_on_new_public_tables()
returns event_trigger
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  obj record;
begin
  for obj in
    select * from pg_event_trigger_ddl_commands()
     where command_tag in ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
       and object_type = 'table'
       and schema_name = 'public'
  loop
    execute format('alter table %s enable row level security', obj.object_identity);
  end loop;
end $$;

revoke execute on function private.enable_rls_on_new_public_tables() from public, anon, authenticated;

create event trigger enable_rls_on_new_public_tables
  on ddl_command_end
  when tag in ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
  execute function private.enable_rls_on_new_public_tables();
