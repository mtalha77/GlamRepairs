-- Handover 63, with Handover 61 Part 1 underneath it: the practitioner card,
-- the directory that uses it, and the test portal.

-- ── 1. What the card needs that the profile did not have ─────────────────
-- years_experience, specialisms (focus areas), languages, country_code and
-- country_name already exist. These are the rest.
alter table public.practitioner_profiles
  add column if not exists assessments_count integer
    check (assessments_count is null or assessments_count >= 0),
  add column if not exists practitioner_quote text
    check (practitioner_quote is null or length(practitioner_quote) between 10 and 220),
  add column if not exists credential_ref text
    check (credential_ref is null or length(credential_ref) <= 200);

comment on column public.practitioner_profiles.assessments_count is
  'Skins read, as a stored and verified number. Printed as "N+". Never derived from a date or a guess.';
comment on column public.practitioner_profiles.credential_ref is
  'The attestation or membership reference already published for this person, printed on the card.';

-- Ayma, verbatim from the record Talha keeps (CLAUDE.md 2.2). Matched by slug,
-- never by a generated id.
update public.practitioner_profiles
   set years_experience  = 5,
       assessments_count = 600,
       specialisms       = array['Acne and acne marks','Pigmentation','Barrier repair'],
       practitioner_quote = 'Five years of faces in the same climate and the same hard water is what makes a photograph readable.',
       credential_ref    = 'Attested by the Higher Education Commission of Pakistan, Ref. HEC/A&A/DAS/2026/5290888',
       country_code      = coalesce(country_code, 'PK'),
       country_name      = coalesce(country_name, 'Pakistan')
 where slug = 'ayma-arif';

-- ── 2. practitioner_public: the only thing the card may read ─────────────
-- Country only, never city. No email, phone, notes or rate. The rating comes
-- from real consultation feedback on real (non-test) clients, and is null
-- until there are ten of them, so a 5.0 from two people never prints.
create or replace view public.practitioner_public
with (security_invoker = true) as
select
  p.id,
  p.slug,
  p.full_name                                   as display_name,
  coalesce(p.title, 'Certified Aesthetics Practitioner') as role_title,
  p.country_code,
  p.country_name,
  p.photo_url                                   as photo_path,
  upper(left(split_part(p.full_name, ' ', 1), 1) ||
        left(nullif(split_part(p.full_name, ' ', 2), ''), 1)) as avatar_initials,
  p.years_experience::integer                   as years_practising,
  p.assessments_count,
  case when r.n >= 10 then r.avg_rating end     as rating,
  coalesce(r.n, 0)::integer                     as rating_count,
  coalesce(p.specialisms[1:3], '{}')            as focus_areas,
  p.practitioner_quote,
  p.credentials                                 as credential_title,
  p.credential_ref,
  p.languages,
  (select min(s.starts_at) from public.availability_slots s
    where s.practitioner_id = p.id and s.status = 'open'
      and s.starts_at > now() + interval '24 hours') as next_available_at
from public.practitioner_profiles p
left join lateral (
  select count(*) as n, round(avg(f.rating)::numeric, 1) as avg_rating
    from public.consultation_feedback f
    join public.appointments a on a.id = f.appointment_id
    join public.leads l on l.id = a.lead_id
   where a.practitioner_id = p.id and f.rating is not null
     and l.is_test = false and l.deleted_at is null
) r on true
where p.status = 'approved'
  and p.public_consent_at is not null
  and p.accepting_clients = true;

revoke all on public.practitioner_public from anon, authenticated;
grant select on public.practitioner_public to service_role;

-- ── 3. Sample profiles, for the test portal only ─────────────────────────
-- Their own table, so a sample can never be assigned, paid, listed in the
-- studio or counted towards the three-practitioner gate. The public
-- directory never reads it. Every row is invented and every card says so.
create table if not exists public.practitioner_samples (
  slug               text primary key,
  display_name       text not null,
  role_title         text not null default 'Certified Aesthetics Practitioner'
                       check (role_title = 'Certified Aesthetics Practitioner'),
  country_code       text not null check (country_code ~ '^[A-Z]{2}$'),
  country_name       text not null,
  avatar             jsonb not null,
  years_practising   integer not null,
  assessments_count  integer not null,
  rating             numeric(2,1),
  rating_count       integer not null default 0,
  focus_areas        text[] not null,
  practitioner_quote text not null,
  credential_title   text not null,
  credential_ref     text not null,
  languages          text[] not null,
  next_in_days       integer not null default 1,
  sort_order         integer not null default 0
);
alter table public.practitioner_samples enable row level security;
revoke all on public.practitioner_samples from anon, authenticated;

insert into public.practitioner_samples
  (slug, display_name, country_code, country_name, avatar, years_practising, assessments_count,
   rating, rating_count, focus_areas, practitioner_quote, credential_title, credential_ref,
   languages, next_in_days, sort_order)
values
  ('sample-sana-rahman', 'Sana Rahman', 'GB', 'United Kingdom',
   '{"skin":"#c98f69","hair":"#2d2117","cloth":"#f2f0f5","bg":"#ede4f6","shade":"#b07a56","feature":"#3a2c23","style":"bun"}',
   8, 1100, 4.8, 212, array['Rosacea and redness','Hard water damage','Winter dryness'],
   'Most people who move here blame the products. It is usually the water and the central heating.',
   'BSc Clinical Skincare Science', 'Sample record. Replace with the real qualification and reference number.',
   array['English','Bengali'], 2, 1),
  ('sample-fatima-al-mansoori', 'Fatima Al Mansoori', 'AE', 'United Arab Emirates',
   '{"skin":"#d8a77c","hair":"#241c16","cloth":"#eef1f6","bg":"#f6edda","shade":"#bd8c63","feature":"#3a2c23","style":"wrap"}',
   11, 1800, 4.9, 318, array['Melasma','Sun damage','Oily and combination skin'],
   'Sun outside, air conditioning all day inside. The routine has to answer both or it answers neither.',
   'BS Dermatological Sciences', 'Sample record. Replace with the real qualification and reference number.',
   array['Arabic','English'], 0, 2),
  ('sample-amara-okonkwo', 'Amara Okonkwo', 'NG', 'Nigeria',
   '{"skin":"#8a5a3b","hair":"#1b1310","cloth":"#f4eef8","bg":"#e7dcf2","shade":"#73482e","feature":"#2a1a12","style":"crop"}',
   7, 900, 4.9, 176, array['Deeper skin tones','Hyperpigmentation','Post-inflammatory marks'],
   'Darker skin marks more easily and fades more slowly. That changes the order you do things in, not just the ingredients.',
   'BS Cosmetic Science', 'Sample record. Replace with the real qualification and reference number.',
   array['English','Igbo'], 3, 3),
  ('sample-priya-nair', 'Priya Nair', 'IN', 'India',
   '{"skin":"#c08455","hair":"#201812","cloth":"#eff2f7","bg":"#f3e8f8","shade":"#a46b42","feature":"#3a2c23","style":"long"}',
   9, 1400, 4.8, 251, array['Pigmentation','Monsoon fungal acne','Oily skin'],
   'Three climates, three different sets of skin. What works in Delhi in January is wrong in Kochi in July.',
   'BS Cosmetology & Dermatology Science', 'Sample record. Replace with the real qualification and reference number.',
   array['English','Hindi','Malayalam'], 0, 4),
  ('sample-lian-chen', 'Lian Chen', 'CA', 'Canada',
   '{"skin":"#e0b48c","hair":"#171210","cloth":"#eceff5","bg":"#e9e1f4","shade":"#c4966f","feature":"#3a2c23","style":"long"}',
   6, 750, 4.7, 133, array['Sensitive skin','Barrier repair','Retinoid tolerance'],
   'Almost everyone who arrives with sensitive skin is using too much, not too little.',
   'BS Cosmetology & Dermatology Science', 'Sample record. Replace with the real qualification and reference number.',
   array['English','Mandarin'], 1, 5)
on conflict (slug) do nothing;

-- ── 4. Test portal access ────────────────────────────────────────────────
-- One row. The passphrase is stored as a salted scrypt hash, set and rotated
-- from the studio; rotating bumps `version`, which signs every open test
-- session out. Nothing here is an environment variable.
create table if not exists public.test_portal_settings (
  id              boolean primary key default true check (id),
  passphrase_hash text,
  version         integer not null default 1,
  rotated_at      timestamptz,
  rotated_by      uuid
);
alter table public.test_portal_settings enable row level security;
revoke all on public.test_portal_settings from anon, authenticated;
insert into public.test_portal_settings (id) values (true) on conflict do nothing;

-- ── 5. Test leads: marked, contained, purgeable ──────────────────────────
-- `test_session` is the portal session that wrote the row. It is how a
-- sign-out purges only its own demo, and how the nightly purge knows a row
-- came from the portal rather than from a member of staff testing by hand.
alter table public.leads add column if not exists test_session text;
alter table public.leads drop constraint if exists leads_test_session_is_test;
alter table public.leads add constraint leads_test_session_is_test
  check (test_session is null or is_test = true);
create index if not exists leads_test_session_idx on public.leads (test_session)
  where test_session is not null;

-- A portal lead never reaches a practitioner and never uses a real gift code,
-- whatever the application does.
create or replace function private.on_test_lead_contained()
returns trigger language plpgsql security definer set search_path to '' as $$
begin
  if NEW.test_session is not null then
    NEW.is_test := true;
    NEW.assigned_to := null;
    NEW.gift_code_used := null;
  end if;
  return NEW;
end $$;
drop trigger if exists lead_a_test_contained on public.leads;
-- Named to sort before lead_zz_gift_redeem, so the gift code is gone first.
create trigger lead_a_test_contained before insert or update on public.leads
  for each row execute function private.on_test_lead_contained();

-- No studio notification for a test client being marked paid or assigned.
create or replace function private.on_studio_lead_notified()
returns trigger language plpgsql security definer set search_path to '' as $function$
declare
  owner_row record;
  customer_name text;
begin
  if coalesce(NEW.is_test, false) then
    return NEW;
  end if;

  customer_name := coalesce(nullif(NEW.full_name, ''), nullif(NEW.email, ''), 'a customer');

  if NEW.payment_status is distinct from OLD.payment_status
     and NEW.payment_status = 'verified' then
    for owner_row in
      select user_id
      from public.studio_members
      where role = 'owner'
        and user_id is distinct from auth.uid()
    loop
      perform private.insert_studio_notification(
        owner_row.user_id,
        auth.uid(),
        'payment_verified',
        'Payment verified',
        customer_name || ' is now marked as paid.',
        '/studio/customers/' || NEW.id::text,
        NEW.id
      );
    end loop;
  end if;

  if NEW.assigned_to is distinct from OLD.assigned_to
     and NEW.assigned_to is not null then
    perform private.insert_studio_notification(
      NEW.assigned_to,
      auth.uid(),
      'customer_assigned',
      'Customer assigned to you',
      customer_name || ' was assigned to you.',
      '/studio/customers/' || NEW.id::text,
      NEW.id
    );
  end if;

  return NEW;
end;
$function$;

-- A suppressed send is still logged, so a demo can show the email that
-- would have gone.
alter table public.studio_emails drop constraint if exists studio_emails_status_check;
alter table public.studio_emails add constraint studio_emails_status_check
  check (status = any (array['queued','sent','delivered','opened','bounced','complained','failed','suppressed']));

-- The purge. Rows only: photographs are deleted first, through the one
-- deletion path in lib/leads, and this refuses any lead whose photographs
-- are still in Storage. Only portal leads (test_session set) are eligible.
create or replace function public.purge_test_portal_leads(p_session text default null, p_idle interval default interval '0')
returns integer language plpgsql security definer set search_path to '' as $$
declare
  v_ids uuid[];
begin
  select coalesce(array_agg(id), '{}') into v_ids
    from public.leads
   where test_session is not null and is_test = true
     and (p_session is null or test_session = p_session)
     and (coalesce(cardinality(photo_paths), 0) = 0 or photos_deleted_at is not null)
     and coalesce(last_seen_at, updated_at, created_at) < now() - p_idle;

  if cardinality(v_ids) = 0 then
    return 0;
  end if;

  update public.availability_slots set lead_id = null where lead_id = any (v_ids);
  update public.leads set duplicate_of = null where duplicate_of = any (v_ids);
  delete from public.upload_attempts where lead_id = any (v_ids);
  delete from public.leads where id = any (v_ids);
  return cardinality(v_ids);
end $$;
revoke all on function public.purge_test_portal_leads(text, interval) from public, anon, authenticated;
grant execute on function public.purge_test_portal_leads(text, interval) to service_role;
