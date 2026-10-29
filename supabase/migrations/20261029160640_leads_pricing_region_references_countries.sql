-- HANDOVER-62: a lead's pricing_region is now a country code. The old key
-- pointed at pricing_regions (PK, GB, US, EU, DEFAULT), so the first lead
-- from any other opened country would have failed to save.
alter table public.leads
  add constraint leads_pricing_region_country_fkey
  foreign key (pricing_region) references public.countries(code) not valid;
alter table public.leads validate constraint leads_pricing_region_country_fkey;
alter table public.leads drop constraint leads_pricing_region_fkey;
