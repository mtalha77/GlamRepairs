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
          <label className="text-sm text-brand-gray">
            Clarity ({region.symbol})
            <input
              type="number"
              name="clarity"
              min={0}
              step="0.01"
              defaultValue={region.priceClarity}
              required
              className={`${formInputClassName} mt-1 w-32`}
            />
          </label>
          <label className="text-sm text-brand-gray">
            Transform ({region.symbol})
            <input
              type="number"
              name="transform"
              min={0}
              step="0.01"
              defaultValue={region.priceTransform}
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
