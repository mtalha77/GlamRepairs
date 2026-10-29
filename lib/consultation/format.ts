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

/* ── The client's own clock, beside PKT (audit, 29 October 2026) ──────────
 * PKT stays the label of record. Beside it, the same moment in the
 * client's timezone, so someone in London or Toronto does not have to do
 * the arithmetic. Nothing is added when their clock already reads PKT.
 */

export function isValidTimeZone(tz: unknown): tz is string {
  if (typeof tz !== "string" || !tz || tz.length > 64) return false;
  try {
    new Intl.DateTimeFormat("en-GB", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/** "2:20 pm your time", or "Friday 2:20 am your time" when the day differs. Null when it adds nothing. */
export function localTimeNote(iso: string | Date, tz: string | null | undefined): string | null {
  if (!isValidTimeZone(tz)) return null;
  const at = new Date(iso);
  const local = new Intl.DateTimeFormat("en-GB", { timeZone: tz, hour: "numeric", minute: "2-digit", hour12: true })
    .format(at)
    .replace(/\s?([ap])\.?m\.?/i, " $1m")
    .toLowerCase();
  if (local === formatTime(at)) return null;
  const day = new Intl.DateTimeFormat("en-GB", { timeZone: tz, weekday: "long" }).format(at);
  const pkDay = new Intl.DateTimeFormat("en-GB", { timeZone: CONSULTATION_TZ, weekday: "long" }).format(at);
  return `${day === pkDay ? "" : `${day} `}${local} your time`;
}

/** "Thursday 9 October, 6:20 pm PKT (2:20 pm your time)" */
export function formatSlotFor(iso: string | Date, tz: string | null | undefined): string {
  const note = localTimeNote(iso, tz);
  return note ? `${formatSlot(iso)} (${note})` : formatSlot(iso);
}
