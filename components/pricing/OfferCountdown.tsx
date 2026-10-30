"use client";

import { useEffect, useState } from "react";

/**
 * The free plan's countdown (Talha, 30 October 2026: free for 30 days, with
 * a countdown). Counts to the plan's `available_until`, which the database
 * owns, so moving the date in the studio moves the countdown with no
 * deploy. Before hydration it shows the end date alone, which is also what
 * a crawler reads.
 */
export default function OfferCountdown({ until, label }: { until: string; label: string }) {
  const end = new Date(until).getTime();
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    const tick = () => setNow(Date.now());
    const first = setTimeout(tick, 0);
    const id = setInterval(tick, 30_000);
    return () => {
      clearTimeout(first);
      clearInterval(id);
    };
  }, []);

  if (now === null) return <>{label}</>;
  const left = end - now;
  if (left <= 0) return <>This free offer has ended.</>;
  const days = Math.floor(left / 86_400_000);
  const hours = Math.floor((left % 86_400_000) / 3_600_000);
  const minutes = Math.floor((left % 3_600_000) / 60_000);
  const parts =
    days > 0
      ? `${days} day${days === 1 ? "" : "s"} ${hours} hour${hours === 1 ? "" : "s"}`
      : `${hours} hour${hours === 1 ? "" : "s"} ${minutes} minute${minutes === 1 ? "" : "s"}`;
  return (
    <span suppressHydrationWarning>
      Free offer ends in <span className="tabular-nums">{parts}</span>. {label}
    </span>
  );
}
