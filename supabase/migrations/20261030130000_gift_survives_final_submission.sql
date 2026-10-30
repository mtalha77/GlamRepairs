-- A redeemed gift or promo code survives the final submission (30 October 2026).
--
-- Reproduced against the live triggers: the code is redeemed by the first
-- progressive save that carries it (uses_count goes up, final_price is
-- discounted, a 100% gift is 'waived'). The final submission then PATCHes
-- plan_price, list_price and payment_status = 'pending'. lead_price_compute
-- recomputes final_price at full price, payment_status is reset, and
-- lead_zz_gift_redeem returned early because the code was unchanged. A 20%
-- code ended at full price and a 100% gift ended 'pending' with the bank
-- details shown, while the code itself was spent.
--
-- Now: when the code on the row is the one already redeemed, its terms are
-- re-applied (without counting another use) after any write that touches
-- the price, the plan or the payment status. 'waived' is only ever set over
-- 'pending', so a verified or refunded payment is never overwritten.
create or replace function private.on_gift_code_redeemed()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'private'
as $function$
declare
  g            record;
  v_gift_price numeric;
begin
  if NEW.gift_code_used is null then
    return NEW;
  end if;

  if TG_OP = 'UPDATE' and OLD.gift_code_used is not null
     and lower(OLD.gift_code_used) = lower(NEW.gift_code_used) then
    -- Already redeemed on this row: re-apply, do not count another use.
    select * into g from public.gift_codes where code = OLD.gift_code_used;
    if g.code is null then
      return NEW;
    end if;
    NEW.gift_code_used := g.code;
  else
    -- One gifted assessment per person, ever.
    if NEW.person_key is not null and exists (
         select 1 from public.leads l
          where l.person_key = NEW.person_key
            and l.gift_code_used is not null
            and l.deleted_at is null
            and l.id <> NEW.id) then
      NEW.gift_code_used := null;
      return NEW;
    end if;

    update public.gift_codes
       set uses_count = uses_count + 1
     where lower(code) = lower(NEW.gift_code_used)
       and active
       and expires_at > now()
       and uses_count < max_uses
    returning * into g;

    if g.code is null then
      NEW.gift_code_used := null;                       -- invalid or spent
      return NEW;
    end if;

    if not private.gift_plan_is_offerable(g.grants_plan) then
      update public.gift_codes set uses_count = uses_count - 1 where code = g.code;
      NEW.gift_code_used := null;
      return NEW;
    end if;

    -- Store the canonical code so the FK to gift_codes.code holds however
    -- the client capitalised it.
    NEW.gift_code_used     := g.code;
    NEW.referred_by_person := g.issued_to_person;
  end if;

  NEW.discount_reason := case when g.kind = 'gift' then 'Gifted assessment' else 'Referral' end;

  if g.discount_pct >= 100 then
    NEW.selected_plan := g.grants_plan;
    NEW.list_price    := 0;
    NEW.final_price   := 0;
    NEW.discount_pct  := 100;
  else
    -- Discounts do not stack: whichever is cheaper, the code's price or the
    -- already-computed one (which may carry the member discount).
    v_gift_price := round(coalesce(NEW.list_price, 0) * (1 - g.discount_pct / 100.0), 2);
    if NEW.final_price is null or v_gift_price < NEW.final_price then
      NEW.final_price  := v_gift_price;
      NEW.discount_pct := g.discount_pct;
    end if;
    if NEW.final_price < 0 then
      NEW.final_price := 0;
    end if;
  end if;

  if NEW.final_price = 0 and coalesce(NEW.payment_status, 'pending') = 'pending' then
    NEW.payment_status := 'waived';
  end if;

  return NEW;
end;
$function$;

-- Fires on any write that could undo the code's terms, not only a new code.
-- Name sorts after lead_price_compute, so it always runs last.
drop trigger if exists lead_zz_gift_redeem on public.leads;
create trigger lead_zz_gift_redeem
  before insert or update of gift_code_used, plan_price, list_price, is_member_booking, payment_status, selected_plan
  on public.leads
  for each row execute function private.on_gift_code_redeemed();
