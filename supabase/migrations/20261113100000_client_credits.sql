-- A client's credit balance (13 November 2026). The policy since
-- 10 November: no refunds; where a fee would have been refunded, it is held
-- as a credit (Terms, "Revisions and credits").
--
-- A ledger, never a mutable balance: every credit held and every use is a
-- row, the balance is their sum, and a row is never edited or deleted. Keyed
-- by the client's email (lowercase), because a client may have no account,
-- and per currency, because a PKR credit is not a GBP credit.
--
-- Using a credit pays a lead in full: apply_client_credit() writes the
-- negative row under a lock, and the app then confirms payment with
-- payment_method 'credit', exactly as a bank transfer is confirmed.

create table if not exists public.client_credits (
  id              uuid primary key default gen_random_uuid(),
  email           text not null check (email = lower(email) and email ~ '^[^@\s]+@[^@\s]+\.[^@\s]{2,}$'),
  amount          numeric(12,2) not null check (amount <> 0),
  currency        text not null check (currency ~ '^[A-Z]{3}$'),
  reason          text not null check (reason in (
                    'medical_referral', 'cancelled_before_work', 'unable_to_complete',
                    'appointment_cancelled', 'declined', 'short_transfer', 'goodwill', 'applied')),
  source_lead_id  uuid references public.leads(id) on delete set null,
  applied_lead_id uuid references public.leads(id) on delete set null,
  note            text check (note is null or length(note) <= 500),
  created_by      uuid references auth.users(id),
  created_at      timestamptz not null default now(),
  -- A use is negative and names the lead it paid; anything else is a credit held.
  constraint credit_sign check ((reason = 'applied') = (amount < 0)),
  constraint applied_names_lead check (reason <> 'applied' or applied_lead_id is not null)
);
create index if not exists client_credits_email_idx on public.client_credits (email, currency);
-- One lead is paid by credit at most once.
create unique index if not exists client_credits_one_use_per_lead on public.client_credits (applied_lead_id) where reason = 'applied';

create or replace function public.client_credits_immutable()
returns trigger language plpgsql as $$
begin
  raise exception 'client_credits is a ledger: add a row instead of changing one';
end $$;
drop trigger if exists client_credits_no_update on public.client_credits;
create trigger client_credits_no_update before update or delete on public.client_credits
  for each row execute function public.client_credits_immutable();

-- Card and bank transfer, and now credit.
alter table public.leads drop constraint if exists leads_payment_method_check;
alter table public.leads add constraint leads_payment_method_check
  check (payment_method is null or payment_method = any (array['bank_transfer', 'card', 'credit']));

create or replace function public.client_credit_balance(p_email text)
returns table (currency text, balance numeric)
language sql stable security definer set search_path = public as $$
  select c.currency, sum(c.amount)::numeric(12,2)
    from public.client_credits c
   where c.email = lower(trim(p_email))
   group by c.currency
  having sum(c.amount) <> 0
$$;

-- Pays one lead from its client's credit, all or nothing. Returns null on
-- success, or the reason it cannot.
create or replace function public.apply_client_credit(p_lead uuid, p_actor uuid)
returns text language plpgsql security definer set search_path = public as $$
declare l record; v_balance numeric;
begin
  select id, lower(trim(email)) as email, currency, final_price, payment_status
    into l from public.leads where id = p_lead for update;
  if not found then return 'No such assessment.'; end if;
  if l.payment_status <> 'pending' then return 'This assessment is not awaiting payment.'; end if;
  if l.email is null or l.email = '' then return 'This assessment has no email address to hold credit against.'; end if;
  if coalesce(l.final_price, 0) <= 0 then return 'There is nothing to pay on this assessment.'; end if;
  if l.currency is null then return 'This assessment has no currency.'; end if;

  -- Serialise uses per client so two at once cannot both spend one balance.
  perform pg_advisory_xact_lock(hashtext('client_credits:' || l.email));
  select coalesce(sum(amount), 0) into v_balance
    from public.client_credits where email = l.email and currency = l.currency;
  if v_balance < l.final_price then
    return format('Credit is %s %s; this assessment is %s %s.', l.currency, v_balance, l.currency, l.final_price);
  end if;

  insert into public.client_credits (email, amount, currency, reason, applied_lead_id, created_by)
  values (l.email, -l.final_price, l.currency, 'applied', l.id, p_actor);
  return null;
end $$;

alter table public.client_credits enable row level security;
revoke all on public.client_credits from anon, authenticated;
grant select, insert on public.client_credits to service_role;
revoke all on function public.client_credit_balance(text) from public, anon, authenticated;
revoke all on function public.apply_client_credit(uuid, uuid) from public, anon, authenticated;
grant execute on function public.client_credit_balance(text) to service_role;
grant execute on function public.apply_client_credit(uuid, uuid) to service_role;
