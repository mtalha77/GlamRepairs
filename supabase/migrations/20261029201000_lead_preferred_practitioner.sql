-- Handover 61 Part 1: "Choose [name]" records a preferred practitioner on
-- the lead. The funnel sends a slug as an answer; this resolves it to an
-- approved, public practitioner and ignores anything else. Test leads never
-- point at a practitioner (Handover 63: a test session must not reach one).
alter table public.leads
  add column if not exists preferred_practitioner_id uuid
    references public.practitioner_profiles(id) on delete set null;

create or replace function private.on_lead_preferred_practitioner()
returns trigger language plpgsql security definer set search_path to '' as $$
declare
  v_slug text := NEW.answers ->> 'onboarding.preferredPractitioner';
begin
  if coalesce(NEW.is_test, false) or v_slug is null then
    NEW.preferred_practitioner_id := null;
    return NEW;
  end if;
  select p.id into NEW.preferred_practitioner_id
    from public.practitioner_profiles p
   where p.slug = v_slug and p.status = 'approved' and p.public_consent_at is not null;
  return NEW;
end $$;

drop trigger if exists lead_preferred_practitioner on public.leads;
create trigger lead_preferred_practitioner before insert or update of answers, is_test on public.leads
  for each row execute function private.on_lead_preferred_practitioner();
