-- Fixes to 20261027182821, found before any client used it:
--
--   1. client_portal ran as its owner and was granted to anon: the public
--      key could read every client's email, name, payment and report status.
--      Now security_invoker and service role only; the app reads it scoped
--      to the signed-in account.
--   2. The practitioner join used practitioner_profiles.id, but
--      leads.assigned_to is a studio member's user id, so the practitioner
--      was always blank. Joined on user_id.
--   3. Every report was joined, drafts included, so a draft would show as
--      delivered and a second report would duplicate the row. Now the latest
--      SENT report only.
--   4. ensure_client_account and the trigger functions were callable with
--      the public key.
--   5. The account trigger sat on payments, which the app never writes
--      (0 rows): payment is verified on leads.payment_status. Added the
--      same trigger there. Neither may ever block a payment verification,
--      so a failure is a warning, not an error.
--   6. "studio reads client accounts" let any studio member, practitioners
--      included, read every client's contact details. Owner and super
--      admins only, via can_manage_clients().
-- Then backfills the one paying client who already existed.
create or replace view public.client_portal with (security_invoker = on) as
select a.id as account_id, a.user_id, a.email, a.full_name, a.country_code,
       a.locale, a.timezone, a.last_login_at,
       l.id as lead_id, l.status as assessment_status, l.payment_status,
       r.id as report_id, r.sent_at as report_delivered_at,
       (select count(*) from public.appointments ap
         where ap.lead_id = l.id and ap.status = 'scheduled'
           and ap.starts_at > now()) as upcoming_consultations,
       (select min(ap.starts_at) from public.appointments ap
         where ap.lead_id = l.id and ap.status = 'scheduled'
           and ap.starts_at > now()) as next_consultation_at,
       p.full_name as practitioner_name, p.slug as practitioner_slug,
       p.title as practitioner_title, p.photo_url as practitioner_photo,
       p.country_name as practitioner_country
  from public.client_accounts a
  left join public.leads l on l.id = a.lead_id and l.deleted_at is null
  left join lateral (
        select sr.id, sr.sent_at from public.studio_reports sr
         where sr.lead_id = l.id and sr.sent_at is not null
         order by sr.sent_at desc limit 1) r on true
  left join public.practitioner_profiles p on p.user_id = l.assigned_to
 where a.deleted_at is null;

revoke all on public.client_portal from anon, authenticated;
grant select on public.client_portal to service_role;
revoke all on public.client_accounts from anon;

revoke execute on function public.ensure_client_account(uuid) from public, anon, authenticated;
grant execute on function public.ensure_client_account(uuid) to service_role;
revoke execute on function public.create_account_on_payment() from public, anon, authenticated;

alter policy "studio reads client accounts" on public.client_accounts
  using (private.can_manage_clients());

create or replace function public.create_account_on_payment()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'verified' and coalesce(old.status,'') <> 'verified'
     and new.lead_id is not null and new.is_test = false then
    begin
      perform public.ensure_client_account(new.lead_id);
    exception when others then
      raise warning 'client account not created for lead %: %', new.lead_id, sqlerrm;
    end;
  end if;
  return new;
end $$;

create or replace function public.create_account_on_lead_payment()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.payment_status = 'verified' and coalesce(old.payment_status,'') <> 'verified'
     and coalesce(new.is_test, false) = false and new.deleted_at is null then
    begin
      perform public.ensure_client_account(new.id);
    exception when others then
      raise warning 'client account not created for lead %: %', new.id, sqlerrm;
    end;
  end if;
  return new;
end $$;
revoke execute on function public.create_account_on_lead_payment() from public, anon, authenticated;

create trigger lead_payment_creates_client_account
  after update of payment_status on public.leads
  for each row execute function public.create_account_on_lead_payment();

select public.ensure_client_account(l.id)
  from public.leads l
 where l.payment_status = 'verified' and l.is_test = false and l.deleted_at is null
   and coalesce(l.email, '') <> '';
