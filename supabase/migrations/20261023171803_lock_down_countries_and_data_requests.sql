-- countries and data_requests were created with RLS off, which in this
-- project means the public (anon) key could SELECT and UPDATE them. Anyone
-- could have set research_status = 'cleared' and clients_enabled = true on any
-- country, walking straight through countries_enable_needs_clearance, and
-- read every data subject request (emails, erasure requests).
--
-- Both are server-side reference and compliance tables: only the service
-- role reads or writes them. No policies are added on purpose.
alter table public.countries enable row level security;
alter table public.data_requests enable row level security;
revoke all on public.countries from anon, authenticated;
revoke all on public.data_requests from anon, authenticated;
grant all on public.countries, public.data_requests to service_role;
