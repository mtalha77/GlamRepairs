alter table public.client_accounts
  add column if not exists lead_id uuid references public.leads(id) on delete set null,
  add column if not exists country_code text,
  add column if not exists locale text not null default 'en',
  add column if not exists timezone text,
  add column if not exists created_reason text not null default 'payment_verified',
  add column if not exists last_login_at timestamptz,
  add column if not exists login_count integer not null default 0,
  add column if not exists marketing_opt_in boolean not null default false,
  add column if not exists deleted_at timestamptz;

alter table public.client_accounts drop constraint if exists client_accounts_country_fmt;
alter table public.client_accounts add constraint client_accounts_country_fmt
  check (country_code is null or country_code ~ '^[A-Z]{2}$');

alter table public.client_accounts drop constraint if exists client_accounts_reason_check;
alter table public.client_accounts add constraint client_accounts_reason_check
  check (created_reason in ('payment_verified','manual','import','self_signup'));

create unique index if not exists client_accounts_email_live
  on public.client_accounts (lower(email)) where deleted_at is null;

-- What the client sees when they sign in.
create or replace view public.client_portal as
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
  left join public.studio_reports r on r.lead_id = l.id
  left join public.practitioner_profiles p on p.id = l.assigned_to
 where a.deleted_at is null;

create or replace function public.ensure_client_account(p_lead uuid)
returns uuid
language plpgsql security definer set search_path = public as $$
declare l record; v_id uuid;
begin
  select * into l from public.leads where id = p_lead and deleted_at is null;
  if not found then raise exception 'lead % not found', p_lead; end if;
  if coalesce(l.email,'') = '' then
    raise exception 'lead % has no email, cannot create an account', p_lead;
  end if;

  select id into v_id from public.client_accounts
   where lower(email) = lower(l.email) and deleted_at is null;

  if v_id is not null then
    update public.client_accounts
       set lead_id = coalesce(lead_id, p_lead),
           country_code = coalesce(country_code, l.country_code),
           timezone = coalesce(timezone, l.client_timezone),
           updated_at = now()
     where id = v_id;
    return v_id;
  end if;

  insert into public.client_accounts
    (lead_id, email, full_name, phone, country_code, timezone, created_reason)
  values (p_lead, l.email, l.full_name, l.phone, l.country_code, l.client_timezone,
          'payment_verified')
  returning id into v_id;

  return v_id;
end $$;

-- 🔴 Fires when payment is verified, so the account exists before the
-- confirmation email is sent and that email can carry the sign-in link.
create or replace function public.create_account_on_payment()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'verified' and coalesce(old.status,'') <> 'verified'
     and new.lead_id is not null and new.is_test = false then
    perform public.ensure_client_account(new.lead_id);
  end if;
  return new;
end $$;

drop trigger if exists payment_creates_client_account on public.payments;
create trigger payment_creates_client_account
  after insert or update on public.payments
  for each row execute function public.create_account_on_payment();
