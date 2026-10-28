-- HANDOVER-61/62. Four guards, each enforced in the database rather than in
-- someone's memory.

-- 1. The public role string is one approved value. Nothing that reads as a
--    medical title can be typed into an admin field and published.
alter table public.practitioner_profiles
  add constraint practitioner_profiles_title_approved
  check (title is null or title in ('Certified Aesthetics Practitioner')) not valid;
alter table public.practitioner_profiles validate constraint practitioner_profiles_title_approved;

create or replace function public.approve_practitioner_application(p_app uuid, p_by uuid, p_note text default null)
 returns uuid
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare a record; v_slug text; v_base text; v_n int := 1; v_profile uuid;
begin
  select * into a from public.practitioner_applications
   where id = p_app and deleted_at is null for update;
  if not found then raise exception 'application % not found', p_app; end if;
  if a.status = 'approved' then raise exception 'application % already approved', p_app; end if;
  if a.profile_id is not null then raise exception 'application % already has a profile', p_app; end if;

  if not exists (select 1 from public.practitioner_documents d
                  where d.application_id = a.id and d.kind='degree'
                    and d.verified and d.deleted_at is null) then
    raise exception 'cannot approve %: the degree document has not been verified', a.full_name;
  end if;

  if not exists (select 1 from public.practitioner_documents d
                  where d.application_id = a.id and d.kind='photo'
                    and d.verified and d.deleted_at is null) then
    raise exception 'cannot approve %: the profile photograph has not been checked', a.full_name;
  end if;

  v_base := regexp_replace(lower(trim(a.full_name)), '[^a-z0-9]+', '-', 'g');
  v_base := trim(both '-' from v_base);
  if v_base = '' then v_base := 'practitioner'; end if;
  v_slug := v_base;
  while exists (select 1 from public.practitioner_profiles where slug = v_slug) loop
    v_n := v_n + 1;
    v_slug := v_base || '-' || v_n;
  end loop;

  insert into public.practitioner_profiles
    (slug, full_name, title, credentials, kind, reg_body, reg_no, city,
     years_experience, status, can_review, accepting_clients,
     accepted_terms_at, onboarded_from, edited_by)
  values
    (v_slug, a.full_name, 'Certified Aesthetics Practitioner',
     a.qualification, a.kind, a.reg_body, a.reg_no, a.city,
     a.years_experience, 'pending', false, false, a.agreed_at, a.id, p_by)
  returning id into v_profile;

  update public.practitioner_documents
     set practitioner_id = v_profile, application_id = null, purge_after = null
   where application_id = a.id and deleted_at is null;

  update public.practitioner_applications
     set status = 'approved', profile_id = v_profile,
         reviewed_by = p_by, reviewed_at = now(),
         decision_note = coalesce(p_note, decision_note, 'Approved'),
         updated_at = now()
   where id = a.id;

  if a.invite_id is not null then
    update public.practitioner_invites
       set accepted_at = coalesce(accepted_at, now()), application_id = a.id
     where id = a.invite_id;
  end if;

  return v_profile;
end $function$;

-- 2. A country cannot open to clients without a way to take their money.
alter table public.countries add column if not exists payment_method text;
alter table public.countries add constraint countries_payment_method_check
  check (payment_method is null or payment_method in
         ('bank_transfer_pk','merchant_of_record','wise','payoneer'));
update public.countries set payment_method = 'bank_transfer_pk' where code = 'PK';

create or replace function public.guard_country_enable()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_placeholder boolean;
begin
  if new.clients_enabled and not coalesce(old.clients_enabled,false) then
    select (p.note is not null and p.note like 'Placeholder%')
      into v_placeholder
      from public.country_pricing p
     where p.country_code = new.code and p.plan_key = 'transform';

    if v_placeholder is null then
      raise exception 'cannot enable %: no price is set', new.name;
    end if;
    if v_placeholder then
      raise exception 'cannot enable %: the price is still a placeholder. Set it in the studio first.', new.name;
    end if;
    if new.payment_method is null then
      raise exception 'cannot enable %: no payment method. A price nobody can pay is not a real price.', new.name;
    end if;
  end if;
  return new;
end $$;

-- 3. Every price change, kept: "what was the UK price in January".
create table if not exists public.country_price_changes (
  id            bigserial primary key,
  country_code  text not null,
  plan_key      text not null,
  currency      text not null,
  minor_units   smallint not null,
  old_amount_minor integer,
  new_amount_minor integer not null,
  old_note      text,
  new_note      text,
  changed_by    uuid references auth.users(id) on delete set null,
  changed_at    timestamptz not null default now()
);
alter table public.country_price_changes enable row level security;
revoke all on public.country_price_changes from anon, authenticated;
grant all on public.country_price_changes to service_role;
create index if not exists country_price_changes_country_idx
  on public.country_price_changes (country_code, changed_at desc);

create or replace function public.log_country_price_change()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' or new.amount_minor is distinct from old.amount_minor
     or new.note is distinct from old.note then
    insert into public.country_price_changes
      (country_code, plan_key, currency, minor_units, old_amount_minor,
       new_amount_minor, old_note, new_note, changed_by)
    values
      (new.country_code, new.plan_key, new.currency, new.minor_units,
       case when tg_op = 'UPDATE' then old.amount_minor end, new.amount_minor,
       case when tg_op = 'UPDATE' then old.note end, new.note,
       coalesce(auth.uid(), new.updated_by));
  end if;
  return new;
end $$;
revoke execute on function public.log_country_price_change() from public, anon, authenticated;
create trigger country_price_change_log
  after insert or update on public.country_pricing
  for each row execute function public.log_country_price_change();

-- 4. Who changed what on a practitioner's public profile, and when.
alter table public.practitioner_profiles add column if not exists edited_by uuid references auth.users(id) on delete set null;

create table if not exists public.practitioner_profile_changes (
  id          bigserial primary key,
  profile_id  uuid not null references public.practitioner_profiles(id) on delete cascade,
  field       text not null,
  old_value   text,
  new_value   text,
  changed_by  uuid references auth.users(id) on delete set null,
  changed_at  timestamptz not null default now()
);
alter table public.practitioner_profile_changes enable row level security;
revoke all on public.practitioner_profile_changes from anon, authenticated;
grant all on public.practitioner_profile_changes to service_role;
create index if not exists practitioner_profile_changes_profile_idx
  on public.practitioner_profile_changes (profile_id, changed_at desc);

create or replace function public.log_practitioner_profile_change()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  f text;
  o jsonb := to_jsonb(old);
  n jsonb := to_jsonb(new);
  v_by uuid := coalesce(auth.uid(), new.edited_by);
begin
  foreach f in array array['full_name','title','credentials','reg_body','reg_no','photo_url',
    'bio','city','years_experience','specialisms','languages','country_code','country_name',
    'status','licence_no','regulator','profile_photo_verified','accepting_clients','public_consent_at']
  loop
    if (o -> f) is distinct from (n -> f) then
      insert into public.practitioner_profile_changes (profile_id, field, old_value, new_value, changed_by)
      values (new.id, f, o ->> f, n ->> f, v_by);
    end if;
  end loop;
  return new;
end $$;
revoke execute on function public.log_practitioner_profile_change() from public, anon, authenticated;
create trigger practitioner_profile_change_log
  after update on public.practitioner_profiles
  for each row execute function public.log_practitioner_profile_change();
