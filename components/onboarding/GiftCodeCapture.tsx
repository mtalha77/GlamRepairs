"use client";

import { useSearchParams } from "next/navigation";
import { useEffect } from "react";

import { normaliseGiftCode } from "@/lib/gifts/giftCodes";
import { useFunnelStore } from "@/lib/funnel/useFunnelStore";

/**
 * HANDOVER-20 Part 2 — picks `?gift=CODE` off the URL and puts it in the
 * funnel store, once.
 *
 * The gift link lands on /gift/[code], which sends the visitor to step 1
 * with the code attached. From there the URL is left behind as they move
 * through the funnel, so it has to be captured into persisted state
 * immediately or it is lost on the first navigation.
 *
 * Writing in an effect is deliberate: this reacts to the URL, which is
 * outside React's control, and it must not run during render. It only
 * writes when the value actually differs, so it cannot loop.
 */
export default function GiftCodeCapture() {
  const searchParams = useSearchParams();
  const raw = searchParams.get("gift");
  const setGiftCode = useFunnelStore((state) => state.setGiftCode);

  useEffect(() => {
    if (!raw) return;
    const code = normaliseGiftCode(raw);
    if (!code) return;
    // Read at call time rather than subscribing, so this effect does not
    // re-run every time any part of the store changes.
    if (useFunnelStore.getState().giftCode === code) return;
    setGiftCode(code);
  }, [raw, setGiftCode]);

  return null;
}
