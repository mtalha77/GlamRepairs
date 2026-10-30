"use client";

import { useSyncExternalStore } from "react";

import { daysUntil } from "@/lib/practitioners/card";

const subscribe = () => () => {};
const browserZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone;
const serverZone = () => null;

/**
 * The next open video call times on the profile, in the reader's own time.
 * Display only: the time itself is picked inside the assessment, after the
 * photographs, where it can be held. Empty on the server, which cannot know
 * the reader's timezone.
 */
export default function ProfileSlots({ slots }: { slots: string[] }) {
  const zone = useSyncExternalStore(subscribe, browserZone, serverZone);
  if (!zone || !slots.length) return null;
  const time = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: zone });
  const weekday = new Intl.DateTimeFormat("en-GB", { weekday: "short", timeZone: zone });
  const date = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: zone });
  const day = (iso: string) => {
    const d = daysUntil(iso);
    return d <= 0 ? "Today" : d === 1 ? "Tomorrow" : d < 7 ? weekday.format(new Date(iso)) : date.format(new Date(iso));
  };
  return (
    <div className="mt-[18px]">
      <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-brand-gray/70">Next open times, your time</p>
      <ul className="mt-2.5 flex flex-wrap gap-[7px]">
        {slots.map((iso) => (
          <li key={iso} className="rounded-[9px] border border-brand-lavender/70 bg-white px-3 py-2 text-[12.5px] text-brand-ink">
            {day(iso)} {time.format(new Date(iso))}
          </li>
        ))}
      </ul>
    </div>
  );
}
