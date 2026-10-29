-- HANDOVER-62, approved by Talha on 29 October 2026. Nothing reads these:
-- plans_public reads country_pricing, leads.pricing_region references
-- countries, and resolve_pricing_region had no callers.
drop function if exists public.resolve_pricing_region(text);
drop table if exists public.plan_prices;
drop table if exists public.pricing_regions;
