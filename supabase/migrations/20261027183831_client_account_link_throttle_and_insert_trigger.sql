-- When a sign-in link was last emailed, to throttle requests.
alter table public.client_accounts
  add column if not exists last_link_sent_at timestamptz;

-- A lead that arrives already verified (a gift) gets its account too.
create trigger lead_insert_creates_client_account
  after insert on public.leads
  for each row when (new.payment_status = 'verified')
  execute function public.create_account_on_lead_payment();
