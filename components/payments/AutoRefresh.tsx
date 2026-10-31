"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** Re-asks the server every few seconds while a payment is being confirmed. */
export default function AutoRefresh({ seconds = 5, max = 24 }: { seconds?: number; max?: number }) {
  const router = useRouter();
  useEffect(() => {
    let n = 0;
    const id = setInterval(() => {
      n += 1;
      if (n > max) clearInterval(id);
      else router.refresh();
    }, seconds * 1000);
    return () => clearInterval(id);
  }, [router, seconds, max]);
  return null;
}
