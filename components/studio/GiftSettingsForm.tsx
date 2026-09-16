"use client";

import { useFormStatus } from "react-dom";

import { formInputClassName } from "@/components/ui/fieldStyles";
import { updateGiftSettingsAction } from "@/lib/studio/actions";

/**
 * The limits, editable without a deploy.
 *
 * ── Why the monthly limit is stated in assessments ───────────────────────
 * The column is called `gift_codes_per_month` and that name is now wrong in
 * a way that matters. The database counts `sum(max_uses)` over codes at
 * 100%, so one influencer code with fifty uses spends fifty of this number,
 * not one. Labelling it "codes" would invite Talha to set 20 and then wonder
 * why the second code was refused. The label describes what is counted.
 *
 * ── The member discount is here but dormant ──────────────────────────────
 * `private.on_lead_price_computed` applies it, but only when a lead has
 * `is_member_booking = true`, and nothing in the application ever sets that.
 * So it is a live wire with nothing plugged into it. It is shown — Talha
 * asked to control these numbers — and it says so plainly, because a
 * control that silently does nothing is the failure this studio already had
 * once with regional pricing.
 */

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-xl bg-brand-primary px-4 py-2.5 text-sm text-white transition-opacity disabled:opacity-50"
    >
      {pending ? "Saving…" : "Save limits"}
    </button>
  );
}

export default function GiftSettingsForm({
  giftCodesPerMonth,
  giftExpiryDays,
  memberDiscountPct,
}: {
  giftCodesPerMonth: number;
  giftExpiryDays: number;
  memberDiscountPct: number;
}) {
  return (
    <form
      action={updateGiftSettingsAction}
      className="space-y-4 rounded-2xl border border-brand-lavender/70 bg-white p-5"
    >
      <div>
        <h2 className="font-serif text-xl text-brand-primary">Limits</h2>
        <p className="mt-1 text-sm leading-relaxed text-brand-gray">
          Raise or lower these any time. They take effect on the next code
          issued — nothing needs redeploying.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm text-brand-gray">
          Free assessments a month
          <input
            type="number"
            name="giftCodesPerMonth"
            min={0}
            max={10000}
            step={1}
            defaultValue={giftCodesPerMonth}
            className={`${formInputClassName} mt-1`}
          />
          <span className="mt-1 block text-xs text-brand-gray">
            Counts assessments, not codes. A code good for 50 uses spends 50 of
            this. Set it to 0 to stop issuing free codes entirely.
          </span>
        </label>

        <label className="text-sm text-brand-gray">
          Default expiry
          <input
            type="number"
            name="giftExpiryDays"
            min={1}
            max={3650}
            step={1}
            defaultValue={giftExpiryDays}
            className={`${formInputClassName} mt-1`}
          />
          <span className="mt-1 block text-xs text-brand-gray">
            Days. Used when the expiry box is left alone on a new code. Codes
            already issued keep the date they were given.
          </span>
        </label>
      </div>

      <label className="block text-sm text-brand-gray sm:max-w-[calc(50%-0.5rem)]">
        Member discount
        <input
          type="number"
          name="memberDiscountPct"
          min={0}
          max={100}
          step="0.01"
          defaultValue={memberDiscountPct}
          className={`${formInputClassName} mt-1`}
        />
        <span className="mt-1 block text-xs text-brand-gray">
          Percent off for member bookings. Nothing marks a booking as a
          member&apos;s yet, so this changes no price today — it is stored
          ready for when that exists.
        </span>
      </label>

      <SaveButton />
    </form>
  );
}
