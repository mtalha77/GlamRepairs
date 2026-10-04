/**
 * Consultation times, written the one way — HANDOVER-50 §5.
 *
 * Always Pakistan time, always labelled. A client seeing an unlabelled time
 * assumes it is their own clock, and someone abroad would then join an
 * hour or five early or late. Dates are written out ("Thursday 9 October"),
 * never "09/10", which half the world reads as 10 September.
 *
 * Shared by the funnel, the studio and the emails, so all three say the
 * same thing about the same appointment.
 */

export const CONSULTATION_TZ = "Asia/Karachi";
export const TZ_LABEL = "PKT";

const dayFmt = new Intl.DateTimeFormat("en-GB", {
  timeZone: CONSULTATION_TZ,
  weekday: "long",
  day: "numeric",
  month: "long",
});

const timeFmt = new Intl.DateTimeFormat("en-GB", {
  timeZone: CONSULTATION_TZ,
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
});

const keyFmt = new Intl.DateTimeFormat("en-CA", {
  timeZone: CONSULTATION_TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** "Thursday 9 October" */
export function formatDay(iso: string | Date): string {
  return dayFmt.format(new Date(iso));
}

/** "6:20 pm" */
export function formatTime(iso: string | Date): string {
  return timeFmt.format(new Date(iso)).replace(/\s?([ap])\.?m\.?/i, " $1m").toLowerCase();
}

/** "Thursday 9 October, 6:20 pm PKT" */
export function formatSlot(iso: string | Date): string {
  return `${formatDay(iso)}, ${formatTime(iso)} ${TZ_LABEL}`;
}

/** Pakistan calendar date, for grouping slots by day: "2026-10-09". */
export function dayKey(iso: string | Date): string {
  return keyFmt.format(new Date(iso));
}

export type PublicSlot = { id: string; startsAt: string; endsAt: string };

/** Slots grouped by Pakistan calendar day, in order. */
export function groupByDay(slots: PublicSlot[]): { key: string; label: string; slots: PublicSlot[] }[] {
  const groups = new Map<string, PublicSlot[]>();
  for (const slot of [...slots].sort((a, b) => a.startsAt.localeCompare(b.startsAt))) {
    const key = dayKey(slot.startsAt);
    groups.set(key, [...(groups.get(key) ?? []), slot]);
  }
  return [...groups.entries()].map(([key, list]) => ({ key, label: formatDay(list[0].startsAt), slots: list }));
}
