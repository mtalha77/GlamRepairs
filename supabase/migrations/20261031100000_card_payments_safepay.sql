-- Card payments through Safepay (Talha, 31 October 2026). Dormant until
-- the Safepay keys are set in the environment.
--
-- One row per checkout attempt. The amount and currency are copied from the
-- lead when the checkout is created, on the server, and never from the
-- browser. A payment counts only when Safepay itself reports the tracker as
-- ended (checked against Safepay's API, not only the webhook), and only for
-- the amount and currency recorded here.

create table if not exists public.card_payments (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads(id) on delete cascade,
  provider text not null default 'safepay' check (provider in ('safepay')),
  environment text not null check (environment in ('sandbox', 'production')),
  tracker text unique,
  amount_minor bigint not null check (amount_minor > 0),
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  status text not null default 'created'
    check (status in ('created', 'paid', 'failed', 'cancelled', 'mismatch')),
  provider_state text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  paid_at timestamptz,
  last_event jsonb
);

create index if not exists card_payments_lead_idx on public.card_payments (lead_id, created_at desc);

alter table public.card_payments enable row level security;
revoke all on public.card_payments from anon, authenticated;

alter table public.leads
  add column if not exists payment_method text
    check (payment_method is null or payment_method in ('bank_transfer', 'card')),
  add column if not exists payment_reference text
    check (payment_reference is null or length(payment_reference) <= 120);

-- A card payment is confirmed by the server, with no signed-in user, so
-- auth.uid() is null there. Keep a verifier the caller set explicitly
-- rather than overwriting it with null; a studio verification still
-- records the person who pressed the button.
create or replace function private.on_lead_assignment_stamped()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
begin
  if NEW.assigned_to is distinct from OLD.assigned_to then
    NEW.assigned_at := case when NEW.assigned_to is null then null else now() end;
    NEW.assigned_by := auth.uid();
  end if;

  if NEW.payment_status is distinct from OLD.payment_status
     and NEW.payment_status = 'verified' then
    NEW.payment_verified_at := now();
    NEW.payment_verified_by := coalesce(auth.uid(), NEW.payment_verified_by);
  end if;

  return NEW;
end;
$function$;
