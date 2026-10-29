-- Talha's stated anchor prices, 28 Oct 2026. These are positioning prices chosen per
-- market, NOT FX conversions of a USD figure. They must never be recomputed from fx_rates.
-- (Applied to the database directly on 28 Oct; saved here so the repo matches.
-- Later price edits are made in Studio → Countries and logged in country_price_changes.)
update country_pricing set amount_minor =  700000, symbol = '₦',   symbol_before = true,
       note = 'Anchor price set by Talha 2026-10-28' where country_code = 'NG' and plan_key = 'transform';
update country_pricing set amount_minor =    7000, symbol = 'AED ', symbol_before = true,
       note = 'Anchor price set by Talha 2026-10-28' where country_code = 'AE' and plan_key = 'transform';
update country_pricing set amount_minor =    3000, symbol = '$',    symbol_before = true,
       note = 'Anchor price set by Talha 2026-10-28' where country_code = 'US' and plan_key = 'transform';
update country_pricing set amount_minor =    2000, symbol = '£',    symbol_before = true,
       note = 'Anchor price set by Talha 2026-10-28' where country_code = 'GB' and plan_key = 'transform';
update country_pricing set amount_minor =  300000, symbol = 'Rs ',  symbol_before = true,
       note = 'Anchor price set by Talha 2026-10-28' where country_code = 'PK' and plan_key = 'transform';

-- Correct symbols for the other majors so nothing ships reading "EUR 24".
update country_pricing set symbol = '€',  symbol_before = true where currency = 'EUR';
update country_pricing set symbol = 'C$', symbol_before = true where currency = 'CAD';
update country_pricing set symbol = 'A$', symbol_before = true where currency = 'AUD';
update country_pricing set symbol = '₹',  symbol_before = true where currency = 'INR';
update country_pricing set symbol = '৳',  symbol_before = true where currency = 'BDT';
update country_pricing set symbol = 'R',  symbol_before = true where currency = 'ZAR';
update country_pricing set symbol = 'KSh',symbol_before = true where currency = 'KES';
