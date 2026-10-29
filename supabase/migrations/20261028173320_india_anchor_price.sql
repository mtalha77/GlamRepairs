-- India. Was ₹2,100, which sits above almost the whole Apollo 24|7 range and is 3x
-- Practo's ₹699 entry point for an online dermatology consult. Set to ₹1,200: a defensible
-- premium for a written assessment plus video plus 30 days of follow-up, still below most
-- Apollo Delhi listings. Proposal, not a decision. Change it in one admin field.
-- (Applied to the database directly on 28 Oct; saved here so the repo matches.)
update country_pricing
set amount_minor = 120000, symbol = '₹', symbol_before = true,
    note = 'Anchor ₹1,200 proposed 2026-10-28. Benchmarks: Practo online derm from ₹699; Apollo 24|7 ₹300-2,500, typically ₹660-950.'
where country_code = 'IN' and plan_key = 'transform';

update countries
set diaspora_priority = greatest(coalesce(diaspora_priority,0), 3)
where code = 'IN';
