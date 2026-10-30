"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};
const browserZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone;
const serverZone = () => null;

/**
 * Support hours in the reader's own time, beside the PKT hours (Handover 61
 * Part 8.2). Pakistan has no daylight saving, so PKT is always UTC+5 and the
 * conversion is exact. Nothing renders on the server, or for a reader who
 * is already on Pakistan time.
 */
export default function LocalHoursNote({ opens, closes }: { opens: string; closes: string }) {
  const zone = useSyncExternalStore(subscribe, browserZone, serverZone);
  if (!zone || zone === "Asia/Karachi") return null;
  const at = (hhmm: string) => {
    const [h, m] = hhmm.split(":").map(Number);
    const d = new Date();
    d.setUTCHours(h - 5, m, 0, 0);
    return d;
  };
  const fmt = new Intl.DateTimeFormat("en-GB", { hour: "numeric", minute: "2-digit", hour12: true, timeZone: zone });
  return (
    <p className="mt-0.5 text-brand-gray">
      {fmt.format(at(opens))} to {fmt.format(at(closes))} your time
    </p>
  );
}
