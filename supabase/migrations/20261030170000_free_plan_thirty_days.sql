-- Skin Starter, the free plan, is offered again for 30 days (Talha, 30
-- October 2026). It had lapsed on 30 September. A certified practitioner
-- now writes the report; there is no video consultation, no photographs,
-- and no practitioner choice (we assign). The pricing card and the plan
-- step count down to available_until.
update public.plan_settings
   set available_until = '2026-11-29 18:59:59+00',   -- 23:59:59 PKT, 29 November
       expert_review = true, includes_video_call = false, video_minutes = null, active = true
 where plan_key = 'free';

update public.plan_features set active = false where plan_key = 'free' and sort_order < 100;
insert into public.plan_features (plan_key, sort_order, active, feature)
select * from (values
  ('free', 110, true, 'Skin concern quiz covering skin type, lifestyle and concerns'),
  ('free', 120, true, 'Written skin report sent by a certified aesthetics practitioner'),
  ('free', 130, true, 'Your practitioner is chosen for you'),
  ('free', 140, true, 'No photographs and no video consultation'),
  ('free', 150, true, 'Free for a limited time only')
) v(plan_key, sort_order, active, feature)
where not exists (select 1 from public.plan_features f where f.plan_key = 'free' and f.sort_order = v.sort_order);
