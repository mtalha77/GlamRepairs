import Link from "next/link";

import type { LeadConsultation } from "@/lib/consultation/forLead";
import { formatDay, formatTime, TZ_LABEL } from "@/lib/consultation/format";

/**
 * The client's consultation time, first thing on their customer page.
 * Whoever opens the page is usually about to message or call this person,
 * and the one fact they cannot afford to miss is when the video call is.
 */

const CLOSED_LABEL = { completed: "Completed", cancelled: "Cancelled", no_show: "No-show" } as const;

function When({ startsAt }: { startsAt: string }) {
  return (
    <p className="font-serif text-2xl leading-tight text-brand-ink sm:text-3xl">
      {formatDay(startsAt)},{" "}
      <span className="whitespace-nowrap">
        {formatTime(startsAt)} <span className="text-lg text-brand-gray sm:text-xl">{TZ_LABEL}</span>
      </span>
    </p>
  );
}

export default function ConsultationBanner({ consultation }: { consultation: LeadConsultation }) {
  if (consultation.kind === "none") {
    return (
      <section className="rounded-2xl border-2 border-dashed border-brand-lavender bg-white px-5 py-4" aria-label="Video consultation">
        <p className="text-xs font-medium uppercase tracking-[0.12em] text-brand-accent">Video consultation</p>
        <p className="mt-1 text-base text-brand-ink">No time chosen yet.</p>
        <p className="mt-1 text-sm text-brand-gray">
          Their plan includes a video call. Verifying payment emails them a link to choose a time.
        </p>
      </section>
    );
  }

  if (consultation.kind === "appointment" && consultation.status !== "scheduled") {
    return (
      <section className="rounded-2xl border border-brand-lavender/70 bg-white px-5 py-4" aria-label="Video consultation">
        <p className="text-xs font-medium uppercase tracking-[0.12em] text-brand-gray">
          Video consultation · {CLOSED_LABEL[consultation.status]}
        </p>
        <p className="mt-1 text-base text-brand-ink">
          {formatDay(consultation.startsAt)}, {formatTime(consultation.startsAt)} {TZ_LABEL}
        </p>
      </section>
    );
  }

  const booked = consultation.kind === "appointment" || consultation.kind === "booked_pending";

  return (
    <section
      aria-label="Video consultation"
      className={`rounded-2xl border-2 px-5 py-4 ${
        booked ? "border-brand-primary bg-brand-purple-soft" : "border-amber-400 bg-amber-50"
      }`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={`rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase tracking-[0.1em] ${
            booked ? "bg-brand-primary text-white" : "bg-amber-400 text-amber-950"
          }`}
        >
          {booked ? "Booked" : "Held, not paid"}
        </span>
        <span className="text-xs font-medium uppercase tracking-[0.12em] text-brand-gray">Video consultation</span>
        {consultation.relative ? <span className="text-sm text-brand-gray">· {consultation.relative}</span> : null}
      </div>

      <div className="mt-2">
        <When startsAt={consultation.startsAt} />
      </div>

      {consultation.kind === "held" ? (
        <p className="mt-2 text-sm text-amber-950">
          {consultation.heldUntil
            ? `Held until ${formatDay(consultation.heldUntil)}, ${formatTime(consultation.heldUntil)} ${TZ_LABEL}. `
            : ""}
          Verify payment before then to book it. After that the time goes back on offer.
        </p>
      ) : null}

      {consultation.kind === "appointment" ? (
        <p className="mt-2 text-sm text-brand-ink">
          {consultation.joinUrl ? (
            <>
              Client link:{" "}
              <a
                href={consultation.joinUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="break-all text-brand-primary underline underline-offset-2"
              >
                {consultation.joinUrl}
              </a>
            </>
          ) : (
            <span className="text-brand-error-strong">No video link yet. Add one in Consultations.</span>
          )}
          {" · "}
          <Link href="/studio/consultations" className="text-brand-primary underline underline-offset-2">
            Consultations
          </Link>
        </p>
      ) : null}

      {consultation.kind === "booked_pending" ? (
        <p className="mt-2 text-sm text-brand-ink">
          The time is booked but the appointment is still being set up. Refresh in a moment, or check{" "}
          <Link href="/studio/consultations" className="text-brand-primary underline underline-offset-2">
            Consultations
          </Link>
          .
        </p>
      ) : null}
    </section>
  );
}
