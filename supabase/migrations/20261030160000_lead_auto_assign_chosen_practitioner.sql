-- The practitioner a client chose now gets the client (Talha, 30 October 2026).
--
-- Tested end to end before this: the choice was stored on the lead
-- (preferred_practitioner_id) and nothing read it. The lead stayed
-- unassigned, so the chosen practitioner could not even see it (RLS lets a
-- practitioner read only leads assigned to them), and the consultation
-- time picker offered every practitioner's times at random.
--
-- Now, when the assessment is submitted (funnel_complete turns true):
--   1. a held or booked consultation time wins: the client meets whoever
--      owns that time, so they are the one assigned;
--   2. otherwise the practitioner they chose;
--   3. otherwise nobody, and the studio assigns as before ("choose for me").
-- Only an approved practitioner with a studio seat is assigned. Test leads
-- and anything already assigned are left alone.
--
-- The free plan has no choice: any preference on a free lead is dropped,
-- and the studio assigns it.

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
  if v_slug is not null and coalesce(NEW.selected_plan, '') <> 'free' then
    select p.id into NEW.preferred_practitioner_id
      from public.practitioner_profiles p
     where p.slug = v_slug and p.status = 'approved' and p.public_consent_at is not null;
  end if;

  if NEW.referred_by_practitioner_id is null and v_ref is not null then
    select p.id into NEW.referred_by_practitioner_id
      from public.practitioner_profiles p
     where p.slug = v_ref and p.status = 'approved';
  end if;
  return NEW;
end $$;

drop trigger if exists lead_preferred_practitioner on public.leads;
create trigger lead_preferred_practitioner before insert or update of answers, is_test, selected_plan on public.leads
  for each row execute function private.on_lead_preferred_practitioner();

create or replace function private.on_lead_auto_assign()
returns trigger language plpgsql security definer set search_path to '' as $$
declare
  v_user uuid;
begin
  if not coalesce(NEW.funnel_complete, false)
     or (TG_OP = 'UPDATE' and coalesce(OLD.funnel_complete, false))
     or NEW.assigned_to is not null
     or coalesce(NEW.is_test, false)
     or coalesce(NEW.selected_plan, '') = 'free' then
    return NEW;
  end if;

  -- 1. The owner of a time this lead holds or has booked.
  select p.user_id into v_user
    from public.availability_slots s
    join public.practitioner_profiles p on p.id = s.practitioner_id
    join public.studio_members m on m.user_id = p.user_id
   where s.lead_id = NEW.id and s.status in ('held', 'booked') and p.status = 'approved'
   order by s.starts_at
   limit 1;

  -- 2. The practitioner they chose.
  if v_user is null and NEW.preferred_practitioner_id is not null then
    select p.user_id into v_user
      from public.practitioner_profiles p
      join public.studio_members m on m.user_id = p.user_id
     where p.id = NEW.preferred_practitioner_id and p.status = 'approved';
  end if;

  if v_user is not null then
    NEW.assigned_to := v_user;
    NEW.assigned_at := now();
  end if;
  return NEW;
end $$;

-- After lead_preferred_practitioner (which resolves the choice) and before
-- lead_zz_gift_redeem; triggers of one kind fire in name order.
drop trigger if exists lead_zy_auto_assign on public.leads;
create trigger lead_zy_auto_assign before insert or update of funnel_complete, preferred_practitioner_id, answers on public.leads
  for each row execute function private.on_lead_auto_assign();
