-- A practitioner's own link (/with/[slug]): their clients sign up through
-- it and the lead records who sent them. Resolved the same way as the
-- preferred practitioner: the funnel stores a slug as an answer, the
-- database turns it into an id only for an approved practitioner, and
-- ignores anything else. Unlike the preference it does not need public
-- consent: a practitioner who is not in the directory can still bring their
-- own clients. Test leads never point at a practitioner.
alter table public.leads
  add column if not exists referred_by_practitioner_id uuid
    references public.practitioner_profiles(id) on delete set null;

create index if not exists leads_referred_by_practitioner_idx
  on public.leads (referred_by_practitioner_id) where referred_by_practitioner_id is not null;

create or replace function private.on_lead_preferred_practitioner()
returns trigger language plpgsql security definer set search_path to '' as $$
declare
  v_slug text := NEW.answers ->> 'onboarding.preferredPractitioner';
  v_ref text := NEW.answers ->> 'onboarding.referredBy';
begin
  if coalesce(NEW.is_test, false) then
    NEW.preferred_practitioner_id := null;
    NEW.referred_by_practitioner_id := null;
    return NEW;
  end if;

  NEW.preferred_practitioner_id := null;
  if v_slug is not null then
    select p.id into NEW.preferred_practitioner_id
      from public.practitioner_profiles p
     where p.slug = v_slug and p.status = 'approved' and p.public_consent_at is not null;
  end if;

  -- Set once: the first practitioner whose link brought the client keeps it.
  if NEW.referred_by_practitioner_id is null and v_ref is not null then
    select p.id into NEW.referred_by_practitioner_id
      from public.practitioner_profiles p
     where p.slug = v_ref and p.status = 'approved';
  end if;
  return NEW;
end $$;
