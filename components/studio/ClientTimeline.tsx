import type { TimelineEvent, TimelineKind } from "@/lib/studio/clientTimeline";
import { formatStudioDateTime } from "@/lib/studio/formatDate";

/** The client's whole record on one line, newest first (20 October 2026). */

const DOT: Record<TimelineKind, string> = {
  form: "bg-brand-lavender",
  payment: "bg-brand-success",
  assign: "bg-brand-lavender",
  email: "bg-brand-primary/60",
  report: "bg-brand-primary",
  review: "bg-brand-primary/40",
  consultation: "bg-brand-accent",
  note: "bg-brand-accent/60",
  feedback: "bg-brand-success/60",
  followup: "bg-brand-primary/30",
  contact: "bg-brand-gray/50",
  photos: "bg-brand-gray/50",
  archive: "bg-brand-error/60",
};

export default function ClientTimeline({ events }: { events: TimelineEvent[] }) {
  if (!events.length) return <p className="text-sm text-brand-gray">Nothing recorded yet.</p>;
  return (
    <ol className="relative space-y-4 border-l border-brand-lavender/70 pl-5">
      {events.map((e, i) => (
        <li key={`${e.at}-${i}`} className="relative">
          <span className={`absolute -left-[1.6rem] top-1.5 h-2.5 w-2.5 rounded-full ${DOT[e.kind]}`} aria-hidden="true" />
          <p className="text-sm text-brand-ink">{e.title}</p>
          <p className="text-xs text-brand-gray">
            {formatStudioDateTime(e.at)}
            {e.detail ? ` · ${e.detail}` : ""}
          </p>
        </li>
      ))}
    </ol>
  );
}
