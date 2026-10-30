-- Air quality pages for the cities outside Pakistan (Talha, 30 October 2026).
--
-- The thirteen draft rows were created with the country targeting work but
-- had no content, no climate zone and slugs of the form 'air-quality/x',
-- which would have served at /air-quality/air-quality/x. This gives them
-- the same shape as the Pakistani pages: a bare slug, a zone essay shared
-- by cities with the same climate, a city section of their own, and then
-- publishes them so the hourly refresh starts reading them.
--
-- Copy rules kept: PM2.5 is the only pollutant compared; no em dashes;
-- nobody is called a doctor or dermatologist. Figures are cited where a
-- number is given: Dhaka 78 µg/m³ and Riyadh 23.7 µg/m³ are IQAir's 2024
-- annual means; the WHO annual guideline is 5 µg/m³; generator share in
-- Lagos is the World Bank's (2020); water hardness from the utilities and
-- the Drinking Water Inspectorate scale.

-- ── The view: country, and a forecast cut at the city's own date ─────────
create or replace view public.area_page_data as
select a.slug,
    a.city,
    a.province,
    a.latitude,
    a.longitude,
    a.timezone,
    a.title,
    a.h1,
    a.meta_description,
    a.target_keyword,
    a.intro_markdown,
    a.city_markdown,
    a.seasonal_markdown,
    a.water_note,
    a.related_slugs,
    a.status,
    a.sort_order,
    a.covers,
    a.population_rank,
    z.slug as zone_slug,
    z.name as zone_name,
    z.summary as zone_summary,
    z.guidance_markdown as zone_guidance,
    z.dominant_factor,
    to_jsonb(l.*) - 'slug'::text as latest,
    coalesce((select jsonb_agg(to_jsonb(f.*) - 'slug'::text order by f.forecast_date)
           from air_quality_forecast f
          where f.slug = a.slug
            and f.forecast_date >= (now() at time zone coalesce(a.timezone, 'Asia/Karachi'))::date), '[]'::jsonb) as forecast,
    (select jsonb_build_object('headline', v.headline, 'advice', v.advice)
           from air_quality_advice v
          where v.band = coalesce(l.band, 'unknown'::text)) as advice,
    coalesce((select jsonb_agg(jsonb_build_object('slug', s.slug, 'city', s.city) order by s.sort_order)
           from area_pages s
          where s.zone_slug = a.zone_slug and s.slug <> a.slug and s.status = 'published'::text), '[]'::jsonb) as zone_siblings,
    a.created_at,
    a.updated_at,
    a.faqs,
    a.country_code,
    a.country_name
   from area_pages a
     left join climate_zones z on z.slug = a.zone_slug
     left join air_quality_latest l on l.slug = a.slug;

-- ── Bare slugs ───────────────────────────────────────────────────────────
update public.area_pages set slug = substr(slug, length('air-quality/') + 1)
 where slug like 'air-quality/%';

-- ── Climate zones ────────────────────────────────────────────────────────
insert into public.climate_zones (slug, name, summary, dominant_factor, sort_order, guidance_markdown) values
('uk-temperate-cities', 'UK cities',
 'Particulate levels are low by world standards, so the air is rarely the main problem. Water hardness, central heating and a short, weak summer decide most of what skin does here.',
 'water hardness and indoor heating', 30,
$md$
### What this climate does to skin

PM2.5 in British cities usually sits well inside the moderate band, and the worst days come from traffic corridors and the occasional spring episode when pollution drifts in from the continent. Particulates still matter on a busy road, but for most people they are not what changes their skin.

What changes it is the indoor half of the year. From October to April people live in heated rooms with dry air, take hotter showers and spend very little time in daylight. The barrier loses water faster than it can replace it, and skin that was calm in August is tight and reactive by December.

### The things that stack

**Water.** This varies more than people expect. London and much of the south east have hard water, while Manchester and Birmingham are soft. Hard water leaves a mineral film and makes cleansers more stripping; soft water rinses so easily that a rich cleanser can feel as if it never comes off.

**Heating.** Radiators and forced air pull humidity indoors well below what skin is comfortable with, and nobody notices because it is gradual.

**Low light, then sudden sun.** Long grey months mean sunscreen gets dropped, and then the first bright spring weeks undo a winter of progress on pigmentation.

### What actually helps

1. **Match the cleanser to the water.** Hard water: a gentle, non-foaming cleanser and a moisturiser straight after. Soft water: a lighter cleanser that rinses clean
2. **Lukewarm water.** Hot showers in a cold month are the most common reason for winter dryness
3. **Barrier support through winter.** Ceramides, glycerin and squalane, applied to slightly damp skin
4. **Sunscreen from March, not June.** UVA is present year round, and spring is when pigmentation returns
5. **Go easy on acids in winter.** The same exfoliant that suits skin in July can be too much in January

### Through the year

Expect skin to turn in October and recover in April. A simpler routine before the heating goes on works better than adding products once it has.
$md$),

('gulf-coast', 'Gulf and Red Sea coast',
 'Dust, heat, humidity on the coast and air conditioning almost everywhere indoors. Skin moves between very humid outdoor air and very dry indoor air many times a day.',
 'dust and the indoor and outdoor humidity swing', 40,
$md$
### What this climate does to skin

The defining feature here is not a single pollutant but the swing. Outdoors on the coast, humidity is high for much of the year and the heat is intense. Indoors, air conditioning dries the air sharply. Skin crosses between the two many times a day, and it rarely gets the chance to settle into either.

Dust is the second factor. Shamal winds and storms carried from the desert lift particulate levels far above normal for a day or several, and fine dust sits on the skin and in pores. On those days PM2.5 can climb into the unhealthy bands even in cities that are usually moderate.

### The things that stack

**Heat and sweat.** Heavy sweating under sunscreen and makeup, then drying in cold air, is a common route to congestion and small bumps on the forehead.

**Air conditioning.** Office, car and home are all air conditioned, so skin can be dehydrated and oily at the same time. People often treat this as oily skin and make it worse.

**Water.** Tap water is largely desalinated and low in minerals, so hardness is rarely the issue. Chlorine and very hot showers are more often the problem.

**UV.** Strong all year, and the reflective sand and water add to it.

### What actually helps

1. **Cleanse every evening.** Sunscreen, sweat and dust together should not stay on overnight
2. **Hydrate rather than strip.** A light moisturiser with glycerin or hyaluronic acid works better than an oil control routine for skin that is dehydrated by air conditioning
3. **Daily broad spectrum sunscreen, reapplied if outdoors.** Pigmentation is the most common long term concern in this climate
4. **On dust days, keep it simple.** Gentle cleanser, moisturiser, no exfoliating acids until the air clears
5. **Lukewarm showers.** Hot water on dehydrated skin is what produces the tight, flaky patches

### Through the year

The summer months bring the heaviest heat and humidity on the coast, and dust episodes are most frequent from spring into summer. The cooler months are the time to start actives that need patience, such as anything for pigmentation.
$md$),

('arabian-interior', 'Arabian desert interior',
 'Very dry air, frequent dust and strong sun. Skin here loses water quickly all year, and dust storms add a particulate load that comes and goes in days.',
 'dryness and dust', 41,
$md$
### What this climate does to skin

Inland, the air is dry for most of the year, often with single figure humidity in summer. Skin loses water to the air continuously, which shows as tightness, flaking around the nose and mouth, and fine lines that look deeper than they are.

Dust is the other constant. Storms close roads and airports several times a year, and between them a background of fine dust keeps PM2.5 above clean air levels. Riyadh's annual mean PM2.5 in 2024 was 23.7 µg/m³, about four to five times the WHO annual guideline of 5.

### The things that stack

**Dryness indoors and out.** Air conditioning dries the air further, so there is no humid refuge the way there is on the coast.

**Dust on dry skin.** Fine particles on an already compromised barrier irritate more than they would on well hydrated skin.

**UV.** High throughout the year.

### What actually helps

1. **Moisturise to damp skin, twice a day.** A richer cream than people in humid climates need, with ceramides and occlusives such as squalane or petrolatum at night
2. **Cleanse gently in the evening.** A non-foaming cleanser removes dust without adding to the dryness
3. **Sunscreen every morning.** Strong UV and dry skin together are a fast route to uneven tone
4. **Hold back on strong actives.** Retinoids and acids need a slower start here, every third night at first
5. **A humidifier where you sleep** if your skin is reactive. It is the cheapest barrier treatment there is

### Through the year

Summer is the driest and hottest stretch, and dust episodes cluster in spring and summer. Winter is milder and the best time to begin anything that dries the skin.

### On a dust day

Keep windows closed and run air conditioning on recirculate where you can, because indoor air on a dust day is cleaner than the air outside even if it is dry. Cleanse when you come in rather than waiting for the evening, since dust mixed with sweat and sunscreen irritates more the longer it sits. Skip exfoliants, retinoids and anything new until the reading drops, and use a plain, fragrance free moisturiser. If the skin around the nose and mouth becomes sore, the barrier is asking for less, not more.
$md$),

('west-africa-coast', 'West African coast',
 'Year round humidity, heavy traffic and generator emissions, and a dry, dusty harmattan in the middle of the dry season. Pigmentation and congestion are the two concerns that dominate.',
 'humidity, combustion particulates and pigmentation', 50,
$md$
### What this climate does to skin

Coastal West Africa is humid for most of the year, and skin produces more oil and sweats more. Clogged pores, small bumps on the forehead and chest, and breakouts that do not respond to drying acne products are common.

The particulate load comes mainly from combustion. The World Bank found road traffic to be the largest source of air pollution in Lagos, followed by industry and generators, which meet around half of the city's energy demand. Combustion particles carry compounds that are linked to pigmentation, so dark marks after a breakout tend to last longer.

### The things that stack

**Harmattan.** Between roughly December and February the harmattan brings dry, dusty air from the Sahara. Humidity falls, skin that was oily becomes tight, and the dust adds to the particulate load.

**Pigmentation risk.** Deeper skin tones are more prone to marks after inflammation. Every breakout, scratch or harsh treatment can leave a mark that outlasts the cause.

**Heat and sweat** under sunscreen and makeup.

### What actually helps

1. **Treat breakouts gently.** Harsh scrubs and strong drying products cause the marks that bother people most
2. **Sunscreen every day.** It is the single most effective step for dark marks on any skin tone, and the one most often skipped
3. **Cleanse every evening.** Particulates, sweat and sunscreen should not stay on overnight
4. **Change the routine for harmattan.** A richer moisturiser and fewer actives for those weeks, then back again
5. **Ingredients that calm pigmentation slowly.** Niacinamide and azelaic acid are well tolerated and work over months, not weeks

### Through the year

The long rainy season is the most humid stretch and the hardest for congestion. Harmattan is the dry, dusty exception. Pigmentation work goes better when started outside harmattan, with sunscreen already a habit.

Dark marks fade slowly on deeper skin tones, often over three to six months even with the right routine. Holding steady with daily sunscreen is real progress, and stopping a treatment early is the most common reason it seems not to work.
$md$),

('north-america-northeast', 'North-eastern North America',
 'Generally clean air with summer smoke episodes, humid summers and very dry, heated winters. The winter barrier problem is the one most people here know.',
 'winter dryness and wildfire smoke', 60,
$md$
### What this climate does to skin

On most days PM2.5 here sits in the good or moderate band. The exceptions are summer wildfire smoke episodes, which in June 2023 pushed New York and Toronto into some of the worst air quality readings in the world for several days. Smoke particles are fine enough to reach skin and are oxidative, so those days deserve the same care as a smog day anywhere else.

The bigger, more predictable problem is winter. Cold outdoor air holds little moisture, indoor heating dries it further, and skin cracks, flakes and stings from November to March.

### The things that stack

**Cold and wind.** Chapping on the cheeks and around the mouth, especially with hot showers afterwards.

**Indoor heat.** Forced air heating can drop indoor humidity very low.

**Water.** New York's water is soft. Toronto's, from Lake Ontario, is moderately hard at around 115 to 122 mg/L as calcium carbonate.

**Humid summers** that bring congestion for skin that was dry all winter.

### What actually helps

1. **Two routines, not one.** A richer cream and fewer actives from November to March, a lighter gel cream in summer
2. **Lukewarm showers in winter**, and moisturiser within a few minutes of drying off
3. **On smoke days, cleanse in the evening without fail** and pause exfoliating acids
4. **Sunscreen year round.** Snow reflects UV, and winter sun still drives pigmentation
5. **A humidifier in the bedroom** through the heating season

### Through the year

Skin usually turns with the first heating weeks in late autumn and recovers in spring. Smoke episodes are unpredictable, so check the reading on hazy days rather than assuming.

### On a smoke day

Smoke particles are smaller than most city pollution and carry compounds that cause oxidative stress, so they behave like a bad smog day. Keep windows closed, cleanse gently as soon as you are home, and put actives such as retinoids and exfoliating acids aside until the reading is back in the good or moderate band. A plain moisturiser with ceramides and an antioxidant serum the next morning are enough. Skin that stings or flushes after a smoke episode usually settles within a week once the routine is kept simple.
$md$),

('australia-east-coast', 'Australian east coast',
 'Clean air most of the year, very high UV and occasional bushfire smoke. Sun damage, not pollution, is the main long term concern.',
 'UV and bushfire smoke', 70,
$md$
### What this climate does to skin

Air quality on the east coast is usually good. When it is not, the cause is almost always bushfire smoke or hazard reduction burning, and during the 2019 to 2020 fire season Sydney spent weeks under smoke at hazardous levels.

The constant factor is ultraviolet. UV in Sydney reaches extreme levels in summer and stays high for much of the year. It is the leading cause of pigmentation, uneven tone and early lines, and it is present on cool and cloudy days too.

### The things that stack

**UV.** High most of the year, extreme in summer.

**Humidity in summer**, which brings congestion and makes heavy creams feel unbearable.

**Water.** Sydney's water is soft, mostly from Warragamba Dam, so rinsing is easy and hardness is rarely a factor.

**Smoke seasons**, when fine particles add oxidative stress on top of sun exposure.

### What actually helps

1. **Sunscreen every morning, reapplied outdoors.** The most valuable single habit here, for every skin type
2. **An antioxidant serum in the morning.** Vitamin C or niacinamide works on the same damage pathway as UV and smoke
3. **Light textures in summer.** A gel moisturiser and a fluid sunscreen are easier to wear daily, which is what counts
4. **On smoke days, cleanse in the evening** and hold off on exfoliating acids
5. **Hats and shade** do as much as any product

### Through the year

Summer brings the highest UV and the humid months. Smoke risk follows the fire season and the burning programme. Winter is milder and a good time to start retinoids or pigmentation treatment.

### Reading the UV index

The UV index is a better guide than temperature or cloud. At 3 and above, sun protection matters, and in Sydney summer days commonly reach 11 or more, which is classed as extreme. Cool, windy days can still carry a high index, which is how many people burn in spring.

### On a smoke day

Smoke particles are fine and oxidative. Cleanse gently once you are indoors, keep windows closed, and pause exfoliating acids and retinoids until the reading is good again. An antioxidant serum the next morning and a plain moisturiser are enough.
$md$),

('bengal-delta', 'Bengal delta',
 'Among the highest particulate levels in the world in the dry season, a long humid monsoon, and heavy traffic and construction dust in between.',
 'particulates, humidity and pigmentation', 80,
$md$
### What this climate does to skin

Dhaka's air is among the most polluted of any major city. IQAir's 2024 annual mean PM2.5 for Dhaka was 78 µg/m³, more than fifteen times the WHO annual guideline. The worst months are the dry season, roughly November to March, when brick kilns around the city operate and there is no rain to clear the air.

Fine particulates of this kind generate oxidative stress in the skin, damage the barrier and activate pigmentation. People commonly notice dull, reactive skin and darker marks through the winter months without changing anything in their routine.

### The things that stack

**The dry season particulate load.** Weeks of unhealthy readings in a row.

**The monsoon.** From June to September humidity is very high, sweat and oil rise, and congestion replaces dryness as the main complaint.

**Construction and road dust** throughout the year.

**Pigmentation.** Pollution and UV together drive uneven tone, and marks after breakouts are slow to fade.

### What actually helps

1. **Cleanse every evening in the dry season.** Gentle, thorough, every night
2. **Antioxidants in the morning.** Niacinamide or vitamin C, because the damage is oxidative
3. **Barrier support.** Ceramides and glycerin through the winter months
4. **Sunscreen daily, even under haze.** Haze reduces visible light far more than it reduces UVA
5. **Lighter textures in the monsoon**, and no heavy occlusives on congested skin

### Through the year

Skin is hardest pressed from November to March by particulates, and from June to September by humidity. The transition months are the best time to start anything new.

### On the worst days

When readings are in the unhealthy or very unhealthy band for days in a row, the aim is to protect the barrier rather than to treat anything. Keep the routine to a gentle cleanser, a moisturiser with ceramides, an antioxidant in the morning and sunscreen. Stop exfoliating acids and retinoids until the air improves, and cleanse as soon as you come in rather than leaving it to bedtime. Skin that has been reactive through a bad week usually needs four to six weeks of this simple routine to settle fully.
$md$)
on conflict (slug) do update set name = excluded.name, summary = excluded.summary,
  dominant_factor = excluded.dominant_factor, sort_order = excluded.sort_order,
  guidance_markdown = excluded.guidance_markdown, updated_at = now();

-- ── Cities ───────────────────────────────────────────────────────────────
update public.area_pages set zone_slug = 'uk-temperate-cities',
  meta_description = 'Live PM2.5 readings for London, and what hard water, central heating and traffic pollution do to skin here, from a certified practitioner.',
  related_slugs = array['damaged-skin-barrier-signs-repair','melasma-acne-marks-sun-spots-difference','korean-skincare-dry-dehydrated-skin'],
  city_markdown = $md$
London's PM2.5 is usually moderate, with the highest readings along busy roads rather than across the city. People who commute on foot or by bike along main roads, or live beside one, are the group for whom the particulate side matters.

The bigger factor for most Londoners is the water. London's supply is hard, typically well above the 200 mg/L that counts as hard. Hard water leaves a mineral film, raises the skin's pH and makes cleansers more stripping than they are meant to be. It is why so many people who move to London find their skin tighter and more reactive within weeks, and why a cleanser that suited them elsewhere suddenly does not.

A gentle, non-foaming cleanser, a moisturiser straight after washing, and lukewarm rather than hot water make a noticeable difference here.
$md$
 where slug = 'london';

update public.area_pages set zone_slug = 'uk-temperate-cities',
  meta_description = 'Live PM2.5 readings for Manchester, and why soft water and damp, heated winters change which cleanser and moisturiser suit your skin.',
  related_slugs = array['damaged-skin-barrier-signs-repair','korean-skincare-dry-dehydrated-skin','acne-location-face-map'],
  city_markdown = $md$
Manchester's water is among the softest in the country. Soft water rinses easily and is kind to the barrier, which is good news, but it changes how products behave. Cream cleansers and oils can feel as if they have not rinsed off, and people respond by washing longer or switching to something foaming and harsh.

The air is usually in the good to moderate band, with traffic the main source of particulates. The weather does more: damp, grey months and heated homes mean skin is often dehydrated beneath a surface that feels clammy.

A light gel or lotion cleanser suits soft water well. Keep moisturiser and sunscreen as daily habits even through the grey months, because UVA comes through cloud.
$md$
 where slug = 'manchester';

update public.area_pages set zone_slug = 'uk-temperate-cities',
  meta_description = 'Live PM2.5 readings for Birmingham, and what soft water, ring road traffic and heated winters mean for a skincare routine here.',
  related_slugs = array['damaged-skin-barrier-signs-repair','melasma-acne-marks-sun-spots-difference','korean-skincare-dry-dehydrated-skin'],
  city_markdown = $md$
Much of Birmingham's water comes from the Elan Valley in Wales and is soft, so hardness is less of a concern here than in London. The local factor is traffic: the city's road network carries a lot of it close to where people live and work, and readings are highest near the ring roads and main routes.

As in the rest of the UK, the season matters more than the day. Skin usually turns tight and reactive once the heating goes on, and recovers in spring.

A gentle evening cleanse after a day near heavy traffic, a richer moisturiser through winter, and sunscreen from early spring cover most of what skin needs here.
$md$
 where slug = 'birmingham';

update public.area_pages set zone_slug = 'gulf-coast',
  related_slugs = array['melasma-acne-marks-sun-spots-difference','fungal-acne-vs-regular-acne-monsoon','damaged-skin-barrier-signs-repair'],
  city_markdown = $md$
Dubai's skin problem is the swing between outdoors and in. Outside, the air is hot and, for much of the year, humid; inside every office, car and mall it is cold and dry. Skin ends up oily on the surface and dehydrated underneath, and the usual response, stronger oil control, makes both worse.

Dust episodes are the other recurring factor. When shamal winds or a storm from the region lift the dust, particulate readings rise sharply for a day or several, and fine dust settles on skin already coated in sunscreen and sweat.

An evening cleanse that removes all of that, a light hydrating moisturiser rather than a mattifying one, and daily sunscreen for pigmentation are the three habits that matter most here.
$md$
 where slug = 'dubai';

update public.area_pages set zone_slug = 'gulf-coast',
  related_slugs = array['melasma-acne-marks-sun-spots-difference','damaged-skin-barrier-signs-repair','does-brown-skin-need-sunscreen'],
  city_markdown = $md$
Abu Dhabi shares Dubai's climate, with the same heat, coastal humidity and near constant air conditioning, and the same pattern of dust storms. During severe episodes, particulate readings here have reached the hazardous range.

The most common concern from this city is pigmentation: uneven tone, melasma and marks that are slow to fade. Strong UV all year, heat and the occasional irritation from dust all feed into it.

Sunscreen every morning, reapplied when outside, does more for this than any treatment. Keep the routine simple on dust days, and start pigmentation actives in the cooler months when skin is calmer.
$md$
 where slug = 'abu-dhabi';

update public.area_pages set zone_slug = 'gulf-coast',
  related_slugs = array['melasma-acne-marks-sun-spots-difference','fungal-acne-vs-regular-acne-monsoon','damaged-skin-barrier-signs-repair'],
  city_markdown = $md$
Doha has the heat, coastal humidity and indoor air conditioning of the rest of the Gulf coast, and a large amount of construction that adds dust to the air between storms.

Skin here is often both congested and dehydrated. Heavy sweating under sunscreen leads to small bumps on the forehead and chin, while hours in air conditioned rooms leave the skin tight. Heavy creams make the congestion worse; drying products make the tightness worse.

A light, hydrating moisturiser, a thorough but gentle evening cleanse, and daily sunscreen are the balance that works for most people in Doha. Keep the routine simplest during dust episodes and in the hottest summer weeks.
$md$
 where slug = 'doha';

update public.area_pages set zone_slug = 'gulf-coast',
  related_slugs = array['fungal-acne-vs-regular-acne-monsoon','melasma-acne-marks-sun-spots-difference','damaged-skin-barrier-signs-repair'],
  city_markdown = $md$
Jeddah sits on the Red Sea coast and is far more humid than Riyadh, so it is a different skincare problem from the rest of the Kingdom. Oil, sweat and congestion are the common complaints rather than dryness.

The humidity also suits the yeast that causes small, uniform, itchy bumps on the forehead, chest and back, which are often treated as ordinary acne for months without improving. If breakouts here look all the same size and itch, that is worth mentioning when you describe them.

A lightweight moisturiser, an evening cleanse, sunscreen every day, and avoiding heavy oils on congested areas suit this climate best.
$md$
 where slug = 'jeddah';

update public.area_pages set zone_slug = 'arabian-interior',
  related_slugs = array['korean-skincare-dry-dehydrated-skin','damaged-skin-barrier-signs-repair','melasma-acne-marks-sun-spots-difference'],
  city_markdown = $md$
Riyadh is inland and dry. Humidity is low for most of the year and very low in summer, and the air pulls water from the skin constantly. Tightness, flaking around the nose and mouth, and lines that look deeper than they are, are the common signs.

Dust storms are frequent, and between them a background of fine dust keeps PM2.5 above clean air levels: the city's 2024 annual mean was 23.7 µg/m³ according to IQAir.

A richer moisturiser than you would use on the coast, applied to damp skin, a non-foaming evening cleanser, daily sunscreen and a slow start with any retinoid or acid suit this climate.
$md$
 where slug = 'riyadh';

update public.area_pages set zone_slug = 'west-africa-coast',
  related_slugs = array['melasma-acne-marks-sun-spots-difference','does-brown-skin-need-sunscreen','fungal-acne-vs-regular-acne-monsoon'],
  city_markdown = $md$
Lagos has heavy traffic, a large share of its electricity from diesel and petrol generators, and year round humidity. Road transport and generators are among the main sources of the city's particulate pollution, and combustion particles are linked to pigmentation, which is why marks after breakouts tend to last here.

Harmattan changes the picture for a few weeks each dry season. Humidity drops, the dust rises, and skin that was oily all year can turn tight and flaky.

Gentle breakout care that does not leave marks, daily sunscreen, an evening cleanse, and a richer moisturiser just for harmattan are what make the most difference in Lagos.
$md$
 where slug = 'lagos';

update public.area_pages set zone_slug = 'north-america-northeast',
  meta_description = 'Live PM2.5 readings for New York, and what wildfire smoke, humid summers and dry heated winters do to skin across the year.',
  related_slugs = array['damaged-skin-barrier-signs-repair','korean-skincare-dry-dehydrated-skin','melasma-acne-marks-sun-spots-difference'],
  city_markdown = $md$
New York's air is usually in the good or moderate band. The exceptions are wildfire smoke episodes: in June 2023, smoke from Canadian fires gave the city some of the worst air quality readings in the world for several days.

The water is soft, drawn mostly from the Catskill and Delaware reservoirs, so hardness is rarely the issue. Winter is. Cold air outside, radiator heat inside and hot showers make December to March the hardest months for the skin barrier, with tightness, flaking and stinging that people often mistake for a new sensitivity.

A richer moisturiser and fewer actives in winter, a lighter routine in the humid summer, and a careful evening cleanse on smoke days cover most of what skin needs here.
$md$
 where slug = 'new-york';

update public.area_pages set zone_slug = 'north-america-northeast',
  meta_description = 'Live PM2.5 readings for Toronto, and what wildfire smoke, moderately hard water and long dry winters do to skin here.',
  related_slugs = array['damaged-skin-barrier-signs-repair','korean-skincare-dry-dehydrated-skin','melasma-acne-marks-sun-spots-difference'],
  city_markdown = $md$
Toronto's tap water comes from Lake Ontario and is moderately hard, at around 115 to 122 mg/L as calcium carbonate. That is enough to make some cleansers more stripping, especially combined with hot showers in winter.

Winters are long, cold and dry, and indoor heating dries the air further, so the barrier problem runs for months rather than weeks. Summer wildfire smoke is the other factor: in 2023 the city spent several days with very poor air quality.

A gentle, non-foaming cleanser, moisturiser on damp skin, a humidifier in the bedroom through winter, and an evening cleanse on smoke days are the habits that help most in Toronto.
$md$
 where slug = 'toronto';

update public.area_pages set zone_slug = 'australia-east-coast',
  related_slugs = array['melasma-acne-marks-sun-spots-difference','does-brown-skin-need-sunscreen','damaged-skin-barrier-signs-repair'],
  city_markdown = $md$
Sydney's air is clean on most days. The exceptions are bushfire smoke and hazard reduction burns, and during the 2019 to 2020 fire season the city spent weeks under smoke at hazardous levels.

The constant concern here is the sun. UV reaches extreme levels in summer and stays high much of the year, which makes it the leading cause of pigmentation and early lines. The water is soft, mostly from Warragamba Dam, so hardness is not a factor.

Daily sunscreen, reapplied outdoors, a morning antioxidant, light textures for the humid months, and an evening cleanse on smoke days are what count most in Sydney.
$md$
 where slug = 'sydney';

update public.area_pages set zone_slug = 'bengal-delta',
  related_slugs = array['damaged-skin-barrier-signs-repair','melasma-acne-marks-sun-spots-difference','fungal-acne-vs-regular-acne-monsoon'],
  city_markdown = $md$
Dhaka is one of the most polluted major cities in the world. IQAir's 2024 annual mean PM2.5 was 78 µg/m³, and the dry season months are far worse than that average, with brick kilns around the city, construction dust and traffic and no rain to clear the air.

Skin shows it as dullness, sensitivity and pigmentation that darkens through the winter. Then the monsoon arrives and the problem changes to oil, sweat and congestion.

An evening cleanse every night in the dry season, a morning antioxidant, barrier support and daily sunscreen through the haze, then lighter textures for the monsoon, are what work in Dhaka.
$md$
 where slug = 'dhaka';

update public.area_pages set status = 'published'
 where zone_slug in ('uk-temperate-cities','gulf-coast','arabian-interior','west-africa-coast','north-america-northeast','australia-east-coast','bengal-delta')
   and status = 'draft' and length(coalesce(city_markdown, '')) > 200;
