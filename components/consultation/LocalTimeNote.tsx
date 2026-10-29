"use client";

import { useSyncExternalStore } from "react";

import { localTimeNote } from "@/lib/consultation/format";

const subscribe = () => () => {};
const browserZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone;
const serverZone = () => null;

/**
 * " (2:20 pm your time)" beside a PKT time, from the browser's own clock.
 * Empty on the server, which cannot know the reader's timezone; filled on
 * the client without a hydration mismatch.
 */
export default function LocalTimeNote({ iso, className }: { iso: string; className?: string }) {
  const zone = useSyncExternalStore(subscribe, browserZone, serverZone);
  const note = localTimeNote(iso, zone);
  return note ? <span className={className}> ({note})</span> : null;
}
