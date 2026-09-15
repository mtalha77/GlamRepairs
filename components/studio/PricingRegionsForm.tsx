"use client";

import { useFormStatus } from "react-dom";
import { formInputClassName } from "@/components/ui/fieldStyles";
import { updatePricingRegionAction } from "@/lib/studio/actions";
import type { PricingRegion } from "@/lib/pricing/regions";

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-xl bg-brand-primary px-4 py-2 text-sm text-white disabled:opacity-60"
    >
      {pending ? "Saving…" : "Save"}
    </button>
  );
}

/**
 * HOTFIX-7 §1 — "changing a price is a database update, not a deploy."
 * One row per active pricing_regions row; Free is always 0 and isn't
 * editable here (nothing in the codebase charges for it).
 */
export default function PricingRegionsForm({
  regions,
}: {
  regions: PricingRegion[];
}) {
  return (
    <div className="space-y-4">
      {regions.map((region) => (
        <form
          key={region.code}
          action={updatePricingRegionAction}
          className="flex flex-wrap items-end gap-3 rounded-xl border border-brand-lavender/60 p-4"
        >
          <input type="hidden" name="code" value={region.code} />
          <div className="min-w-[8rem]">
            <p className="text-sm font-semibold text-brand-ink">
              {region.label}
            </p>
            <p className="text-xs text-brand-gray">
              {region.code} · {region.currency}
            </p>
          </div>
          {/*
            HANDOVER-27 §1.1 — one paid plan, so one field. The Clarity
            input is gone: the plan is retired, and a price box for a plan
            nobody can buy invites someone to "fix" a number that does
            nothing.

            The free tier has no field either, for the same reason it has
            no price: it is zero by definition. Retiring or extending that
            offer is `plan_settings.available_until`, not a price.
          */}
          <label className="text-sm text-brand-gray">
            Skin Transform ({region.symbol})
            <input
              type="number"
              name="transform"
              min={0}
              step="0.01"
              defaultValue={region.prices.transform}
              required
              className={`${formInputClassName} mt-1 w-32`}
            />
          </label>
          <SaveButton />
        </form>
      ))}
    </div>
  );
}
