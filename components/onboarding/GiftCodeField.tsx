"use client";

import { useState, useTransition } from "react";

import { formInputClassName } from "@/components/ui/fieldStyles";
import {
  checkGiftCodeAction,
  type GiftFieldResult,
} from "@/lib/gifts/checkCodeAction";
import { useFunnelStore } from "@/lib/funnel/useFunnelStore";

/**
 * "Have a gift code?" on the plan step — HANDOVER-28 §2.1.
 *
 * ── Why it starts collapsed ──────────────────────────────────────────────
 * An open, empty code box on a payment step is a message: other people are
 * paying less than you. Most readers have no code, and the ones who do are
 * looking for where to put it. A link that opens a field serves the second
 * group without taxing the first.
 *
 * Someone arriving through /gift/<code> never sees this at all — the code is
 * already in the store and already confirmed above.
 *
 * ── Only the code is stored ──────────────────────────────────────────────
 * §2.2: the browser never sends a price, a discount or a payment status.
 * `discountPct` below is used to write a sentence and then discarded. The
 * lead insert carries the code string, and the database recomputes what it
 * is worth from the code's own row.
 */

/** Every state this field can be in, and what the reader is told. */
const REASON_COPY: Record<
  GiftFieldResult["reason"],
  { tone: "good" | "bad"; text: string }
> = {
  ok: {
    tone: "good",
    text: "Code applied.",
  },
  empty: {
    tone: "bad",
    text: "Type the code first.",
  },
  not_found: {
    tone: "bad",
    text: "We don't recognise that code. Check the spelling — it's easy to mistake 0 for O.",
  },
  inactive: {
    tone: "bad",
    text: "That code has been switched off. If someone gave it to you recently, ask them to check.",
  },
  expired: {
    tone: "bad",
    text: "That code has passed its date. You can still book at the usual price.",
  },
  already_used: {
    tone: "bad",
    text: "That code has been used as many times as it allows.",
  },
  self_redemption: {
    tone: "bad",
    text: "That's your own gift code — it's meant for someone else. Send them the link and their assessment is on us.",
  },
  already_gifted: {
    tone: "bad",
    text: "You've already had a gifted assessment — they're one per person. You're very welcome to book at the usual price.",
  },
  plan_unavailable: {
    tone: "bad",
    text: "That code covers a plan we no longer offer. Nothing has gone wrong on your end — message us and we'll sort out an equivalent.",
  },
  rate_limited: {
    tone: "bad",
    text: "Too many tries. Wait a few minutes, or send us the code on WhatsApp and we'll apply it for you.",
  },
  error: {
    tone: "bad",
    text: "We couldn't check that just now. Try again, or carry on and tell us on WhatsApp.",
  },
};

export default function GiftCodeField() {
  const giftCode = useFunnelStore((state) => state.giftCode);
  const setGiftCode = useFunnelStore((state) => state.setGiftCode);

  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const [result, setResult] = useState<GiftFieldResult | null>(null);
  const [pending, startTransition] = useTransition();

  // Arrived through a gift link, or already applied one — the confirmation
  // above says so, and a second box asking for a code would read as though
  // the first one had not worked.
  if (giftCode) return null;

  function apply() {
    startTransition(async () => {
      const next = await checkGiftCodeAction(value);
      setResult(next);
      if (next.code) setGiftCode(next.code);
    });
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-4 text-sm text-brand-primary underline underline-offset-4 hover:opacity-80"
      >
        Have a gift code?
      </button>
    );
  }

  const copy = result ? REASON_COPY[result.reason] : null;
  const applied = result?.code != null;

  return (
    <div className="mt-4 rounded-2xl border border-brand-border-light/60 bg-white px-4 py-3.5">
      <label
        htmlFor="gift-code-input"
        className="block text-sm text-brand-gray"
      >
        Gift or discount code
      </label>
      <div className="mt-1.5 flex gap-2">
        <input
          id="gift-code-input"
          type="text"
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            // A stale "we don't recognise that" under a box the reader is
            // mid-way through retyping is just wrong.
            if (result) setResult(null);
          }}
          onKeyDown={(e) => {
            // The field sits inside the funnel's own markup; Enter must
            // apply the code, not do whatever the surrounding page does.
            if (e.key === "Enter") {
              e.preventDefault();
              apply();
            }
          }}
          disabled={applied}
          autoCapitalize="characters"
          autoComplete="off"
          spellCheck={false}
          placeholder="GLAM-GIFT-ABC123"
          className={`${formInputClassName} font-mono uppercase disabled:opacity-60`}
        />
        <button
          type="button"
          onClick={apply}
          disabled={pending || applied || value.trim() === ""}
          className="shrink-0 rounded-xl bg-brand-primary px-4 text-sm text-white transition-opacity disabled:opacity-50"
        >
          {pending ? "Checking…" : applied ? "Applied" : "Apply"}
        </button>
      </div>

      {copy ? (
        <p
          role="status"
          className={`mt-2 text-sm leading-relaxed ${
            copy.tone === "good"
              ? "text-brand-success-strong"
              : "text-brand-error-strong"
          }`}
        >
          {/*
            A valid code says what it is actually worth. "Code applied" alone
            leaves someone with a 20% code expecting to pay nothing, and the
            moment they find out otherwise is the payment screen.
          */}
          {applied && result?.discountPct != null && result.discountPct < 100
            ? `Code applied — ${result.discountPct}% off. The rest is payable as usual.`
            : applied
              ? "Code applied — your assessment is covered."
              : copy.text}
        </p>
      ) : null}
    </div>
  );
}
