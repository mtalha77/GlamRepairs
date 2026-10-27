-- Same hole as 20261023171803: country_pricing and fx_rates were created with
-- RLS off and the public key could UPDATE them. Anyone could have rewritten a
-- price, or cleared its "Placeholder" note and walked through the pricing gate.
-- The two views ran as their owner, so admin_country_panel also published
-- per-country client counts. All four are service role only now.
alter table public.country_pricing enable row level security;
alter table public.fx_rates enable row level security;
revoke all on public.country_pricing, public.fx_rates from anon, authenticated;
grant all on public.country_pricing, public.fx_rates to service_role;

alter view public.pricing_for_country set (security_invoker = on);
alter view public.admin_country_panel set (security_invoker = on);
revoke all on public.pricing_for_country, public.admin_country_panel from anon, authenticated;
grant select on public.pricing_for_country, public.admin_country_panel to service_role;

revoke execute on function public.guard_country_enable() from public, anon, authenticated;
