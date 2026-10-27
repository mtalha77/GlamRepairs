-- HANDOVER-58 Part 12.4: when a country moves to legal_advice or cleared, the
-- studio records what the lawyer said, who recorded it, and when.
alter table public.countries
  add column if not exists legal_note text,
  add column if not exists status_changed_at timestamptz,
  add column if not exists status_changed_by uuid references auth.users(id) on delete set null;

-- A country cannot reach legal_advice or cleared without the advice written
-- down. Pakistan is grandfathered: it was operating before the gate existed.
alter table public.countries
  add constraint countries_clearance_needs_note
  check (
    research_status not in ('legal_advice','cleared')
    or code = 'PK'
    or length(coalesce(legal_note, '')) >= 20
  ) not valid;
alter table public.countries validate constraint countries_clearance_needs_note;
