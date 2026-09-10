"use client";

import { useFormStatus } from "react-dom";

import { issueGiftCodeAction } from "@/lib/studio/actions";
import { giftCodeUrl } from "@/lib/gifts/giftCodes";

/**
 * HANDOVER-20 Part 2 — issuing a gift from the client's own record.
 *
 * The handover asks for issuing to be automatic when a report is sent. It is
 * wired there too, but a manual control exists because automatic issuing is
 * silent: when a code is not issued — unpaid, already has one, cap reached —
 * the practitioner needs somewhere that says which rule stopped it rather
 * than wondering why the client never got a link.
 */

type GiftCodePanelProps = {
  leadId: string;
  enabled: boolean;
  paymentVerified: boolean;
  /** Existing outstanding code for this person, if any. */
  existingCode: string | null;
  remainingThisMonth: number;
};

function IssueButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={disabled || pending}
      className="rounded-xl bg-brand-primary px-4 py-2 text-sm text-white transition-opacity disabled:opacity-50"
    >
      {pending ? "Issuing…" : "Issue a gift code"}
    </button>
  );
}

export default function GiftCodePanel({
  leadId,
  enabled,
  paymentVerified,
  existingCode,
  remainingThisMonth,
}: GiftCodePanelProps) {
  const blockedReason = !enabled
    ? "The gift programme is switched off until there is more than one practitioner."
    : !paymentVerified
      ? "Only clients with a verified payment can gift an assessment."
      : remainingThisMonth <= 0
        ? "This month's gift limit has been reached."
        : null;

  return (
    <section className="rounded-2xl border border-brand-lavender/70 bg-white p-5">
      <h2 className="mb-1 font-serif text-xl text-brand-primary">
        Gift an assessment
      </h2>
      <p className="mb-4 text-sm leading-relaxed text-brand-gray">
        A single-use code this client can give away. The recipient gets a free
        Skin Clarity assessment — roughly Rs. 2,000 of practitioner time, so
        it counts against the monthly limit.
      </p>

      {existingCode ? (
        <div className="rounded-xl border border-brand-primary/30 bg-brand-lavender/20 px-4 py-3">
          <p className="text-sm text-brand-ink">
            This client has an unused gift code.
          </p>
          <p className="mt-1 font-mono text-xs text-brand-ink">{existingCode}</p>
          {/*
            The report goes out by email with this block already in it. This
            is the same wording ready to paste into WhatsApp, because that is
            where most of this business's conversations actually happen and
            retyping it by hand is how the link gets mistyped.
          */}
          <label
            htmlFor="gift-whatsapp-message"
            className="mt-3 block text-xs text-brand-gray"
          >
            Ready to send on WhatsApp
          </label>
          <textarea
            id="gift-whatsapp-message"
            readOnly
            rows={4}
            onFocus={(event) => event.currentTarget.select()}
            value={[
              "A gift for someone you care about",
              "Send them this link and their assessment is on us. No charge, no catch.",
              giftCodeUrl(existingCode),
            ].join("\n")}
            className="mt-1 w-full resize-y rounded-xl border border-brand-border-light/70 bg-white px-3 py-2 text-xs leading-relaxed text-brand-ink"
          />
        </div>
      ) : blockedReason ? (
        <p className="rounded-xl border border-brand-lavender/70 bg-brand-lavender/10 px-4 py-3 text-sm text-brand-gray">
          {blockedReason}
        </p>
      ) : (
        <form action={issueGiftCodeAction}>
          <input type="hidden" name="leadId" value={leadId} />
          <IssueButton disabled={false} />
          <p className="mt-2 text-xs text-brand-gray">
            {remainingThisMonth} left this month.
          </p>
        </form>
      )}
    </section>
  );
}
