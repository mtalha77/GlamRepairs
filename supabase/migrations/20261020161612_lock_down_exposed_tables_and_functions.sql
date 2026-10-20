-- 20 October 2026 — close what the public (anon) key could reach.
--
-- Found while wiring up the screening assessment. Fourteen tables had row
-- level security off, so the anon key that ships in every browser bundle
-- could read AND write them: the assessment answer key, payments, the
-- email templates, plan prices. Six owner-rights views exposed admin data
-- the same way, and several SECURITY DEFINER functions were executable by
-- anyone, issue_gift_codes among them (mint any discount, from a browser).
--
-- Every app read and write of these goes through the service role, which
-- bypasses RLS, with one exception: plan_prices is read by the public
-- client for /pricing, so it keeps a read-only policy. check_gift_code's
-- three-argument overload stays callable: checkout uses it with the
-- visitor's own session and it rate-limits itself.

-- ── Tables: RLS on, writes revoked ─────────────────────────────────────
do $$
declare t text;
begin
  foreach t in array array[
    'air_quality_advice', 'air_quality_forecast', 'air_quality_readings',
    'area_pages', 'blog_link_parking', 'climate_zones',
    'email_settings', 'email_templates', 'gift_code_attempts',
    'payments', 'plan_prices',
    'assessment_questions', 'assessment_attempts', 'assessment_answers'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke insert, update, delete, truncate on public.%I from anon, authenticated', t);
  end loop;
end $$;

-- Nothing outside the server needs these at all.
revoke select on public.assessment_questions, public.assessment_attempts, public.assessment_answers,
  public.payments, public.email_settings, public.email_templates,
  public.gift_code_attempts, public.blog_link_parking
  from anon, authenticated;

-- /pricing reads prices with the public client.
create policy plan_prices_public_read on public.plan_prices
  for select to anon, authenticated using (true);

-- ── Views that run with the owner's rights: admin only ─────────────────
revoke all on public.abandon_queue, public.assessment_review,
  public.client_email_timeline, public.client_payment_timeline,
  public.gift_batches_admin, public.gift_codes_admin
  from anon, authenticated;

-- ── SECURITY DEFINER functions: service role only ──────────────────────
revoke execute on function public.issue_gift_codes(integer, text, text, numeric, text, integer, text, text, uuid) from public, anon, authenticated;
revoke execute on function public.deactivate_gift_batch(text) from public, anon, authenticated;
revoke execute on function public.log_abandon_email(uuid, text, text, text, text, text) from public, anon, authenticated;
revoke execute on function public.restore_blog_links() from public, anon, authenticated;
revoke execute on function public.start_assessment(uuid, integer, integer) from public, anon, authenticated;
revoke execute on function public.submit_assessment(uuid) from public, anon, authenticated;
-- The weak two-argument overload: no rate limit, no attempt log. Unused.
revoke execute on function public.check_gift_code(text, text) from public, anon, authenticated;

grant execute on function public.issue_gift_codes(integer, text, text, numeric, text, integer, text, text, uuid) to service_role;
grant execute on function public.deactivate_gift_batch(text) to service_role;
grant execute on function public.log_abandon_email(uuid, text, text, text, text, text) to service_role;
grant execute on function public.restore_blog_links() to service_role;
grant execute on function public.start_assessment(uuid, integer, integer) to service_role;
grant execute on function public.submit_assessment(uuid) to service_role;
grant execute on function public.check_gift_code(text, text) to service_role;

-- ── Assessment link: when it was last emailed ──────────────────────────
alter table public.practitioner_applications
  add column if not exists assessment_sent_at timestamptz;
