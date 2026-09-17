"use client";

import { useFormStatus } from "react-dom";

import { setGiftCodeActiveAction } from "@/lib/studio/actions";

/**
 * Turn a code off, or back on.
 *
 * Deactivating rather than deleting is not a UI preference — a redeemed code
 * is referenced by `leads.gift_code_used`, so a delete would either fail on
 * the foreign key or erase a client's record of how they paid. Turning it
 * off stops future redemptions and changes nothing about one that already
 * happened, which is what "cancel this code" actually means.
 */

function Button({ active }: { active: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={`rounded-lg border px-2.5 py-1 text-xs transition-opacity disabled:opacity-50 ${
        active
          ? "border-brand-error/40 text-brand-error-strong hover:bg-brand-error/5"
          : "border-brand-lavender text-brand-primary hover:bg-brand-lavender/20"
      }`}
    >
      {pending ? "…" : active ? "Turn off" : "Turn on"}
    </button>
  );
}

export default function GiftCodeActiveToggle({
  code,
  active,
}: {
  code: string;
  active: boolean;
}) {
  return (
    <form action={setGiftCodeActiveAction} className="inline">
      <input type="hidden" name="code" value={code} />
      <input type="hidden" name="active" value={active ? "false" : "true"} />
      <Button active={active} />
    </form>
  );
}
