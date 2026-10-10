"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { formatDay, formatSlot, formatTime, groupByDay, TZ_LABEL, type PublicSlot } from "@/lib/consultation/format";

/**
 * Choose a consultation time — HANDOVER-50 §5.
 *
 * Picking a time puts a hold on it (it is not booked until payment is
 * verified), and the hold is shown with its expiry so nobody mistakes it
 * for a confirmed appointment. The guidelines sit above the times on
 * purpose: someone who knows they need daylight on their face will pick a
 * daytime slot.
 *
 * Two modes: inside the funnel (identified by the session id) and from a
 * signed re-pick link (`link`), where a paid client's pick books at once.
 */

export type HeldSlot = { slotId: string; startsAt: string; endsAt: string; status: "held" | "booked"; heldUntil: string | null };

export type PickerState = {
  /** There are times to choose from, so one must be chosen before continuing. */
  required: boolean;
  held: HeldSlot | null;
};

type Props = {
  guidelinesHtml: string;
  minutes: number;
  onStateChange?: (state: PickerState) => void;
} & (
  | { mode: "funnel"; sessionId: string; fullName?: string; email?: string; selectedPlan?: string | null }
  | { mode: "link"; leadId: string; signature: string }
);

const DAYS_SHOWN = 5;

export default function ConsultationPicker(props: Props) {
  const { guidelinesHtml, minutes, onStateChange } = props;
  const [slots, setSlots] = useState<PublicSlot[] | null>(null);
  // HANDOVER-52 step 13: named only while one practitioner offers times.
  const [practitioner, setPractitioner] = useState<string | null>(null);
  const [held, setHeld] = useState<HeldSlot | null>(null);
  const [chosen, setChosen] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [allDays, setAllDays] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const sessionId = props.mode === "funnel" ? props.sessionId : null;

  const load = useCallback(async () => {
    const qs = sessionId ? `?sessionId=${encodeURIComponent(sessionId)}` : "";
    try {
      const res = await fetch(`/api/consultation/slots${qs}`, { cache: "no-store" });
      const data = (await res.json()) as { slots?: PublicSlot[]; held?: HeldSlot | null; practitioner?: string };
      setSlots(data.slots ?? []);
      setPractitioner(data.practitioner ?? null);
      if (props.mode === "funnel") setHeld(data.held ?? null);
    } catch {
      setSlots([]);
      setMessage("We could not load the available times. Please check your connection.");
    }
    // props.mode never changes for a mounted picker.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  useEffect(() => {
    // Loading the grid on mount is the point of this effect.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  // Tick once a minute for the countdown, and drop a hold that has lapsed.
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);
  const holdLapsed = held?.status === "held" && held.heldUntil ? new Date(held.heldUntil).getTime() <= now : false;
  const activeHold = holdLapsed ? null : held;

  const lastReported = useRef<string>("");
  useEffect(() => {
    if (!onStateChange || slots === null) return;
    const state: PickerState = { required: slots.length > 0 || Boolean(activeHold), held: activeHold };
    const key = JSON.stringify(state);
    if (key === lastReported.current) return;
    lastReported.current = key;
    onStateChange(state);
  }, [slots, activeHold, onStateChange]);

  // The held slot is no longer "open", so it is added back to the grid to
  // show as selected rather than vanishing.
  const days = useMemo(() => {
    const list = [...(slots ?? [])];
    if (activeHold && !list.some((s) => s.id === activeHold.slotId)) {
      list.push({ id: activeHold.slotId, startsAt: activeHold.startsAt, endsAt: activeHold.endsAt });
    }
    return groupByDay(list);
  }, [slots, activeHold]);

  const chosenSlot = days.flatMap((d) => d.slots).find((s) => s.id === chosen) ?? null;

  async function hold() {
    if (!chosenSlot) return;
    setBusy(true);
    setMessage(null);
    try {
      const res =
        props.mode === "funnel"
          ? await fetch("/api/consultation/hold", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                sessionId: props.sessionId,
                slotId: chosenSlot.id,
                fullName: props.fullName,
                email: props.email,
                selectedPlan: props.selectedPlan,
              }),
            })
          : await fetch("/api/consultation/pick", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ l: props.leadId, s: props.signature, slotId: chosenSlot.id }),
            });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        message?: string;
        reason?: string;
        slot?: HeldSlot;
        booked?: boolean;
      };
      if (data.ok && data.slot) {
        setHeld(data.booked ? { ...data.slot, status: "booked", heldUntil: null } : data.slot);
        setChosen(null);
      } else {
        // Taken (409): refresh so the lost time disappears, and say so.
        setMessage(data.message ?? "That time could not be held. Please choose another.");
        setChosen(null);
        await load();
      }
    } catch {
      setMessage("Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  const visibleDays = allDays ? days : days.slice(0, DAYS_SHOWN);

  return (
    <section aria-labelledby="consultation-heading" className="rounded-2xl border border-brand-border-light/60 bg-white p-4 sm:p-5">
      <h2 id="consultation-heading" className="font-serif text-xl text-brand-ink sm:text-2xl">
        Choose your consultation time
      </h2>
      <p className="mt-1 text-sm text-brand-gray">
        {practitioner ? `${practitioner}. ` : ""}
        {minutes} minutes, by video.
      </p>

      {guidelinesHtml ? (
        <div
          className="prose-gr mt-4 rounded-xl bg-brand-cream-card p-4 text-sm leading-relaxed [&>*:first-child]:!mt-0 [&_h3]:!mt-0 [&_h3]:text-base [&_p]:mt-2"
          // Rendered server-side from consultation_settings by renderMarkdown,
          // which escapes HTML first.
          dangerouslySetInnerHTML={{ __html: guidelinesHtml }}
        />
      ) : null}

      {activeHold ? (
        <div className="mt-4 rounded-xl border border-brand-primary/30 bg-brand-lavender/20 p-4 text-sm text-brand-ink" role="status">
          {activeHold.status === "booked" ? (
            <p>
              <strong className="font-medium">Booked:</strong> {formatSlot(activeHold.startsAt)}. Your confirmation and video link
              are on their way by email.
            </p>
          ) : (
            <>
              <p>
                <strong className="font-medium">Held for you:</strong> {formatSlot(activeHold.startsAt)}.
              </p>
              {activeHold.heldUntil ? (
                <p className="mt-1">
                  Held until {formatTime(activeHold.heldUntil)} {TZ_LABEL}. It is booked once your payment is confirmed.
                </p>
              ) : null}
            </>
          )}
        </div>
      ) : holdLapsed ? (
        <p className="mt-4 text-sm text-red-700" role="status">
          Your hold on {formatSlot(held!.startsAt)} has expired. Please choose a time again.
        </p>
      ) : null}

      {slots === null ? (
        <p className="mt-4 text-sm text-brand-gray">Loading available times…</p>
      ) : days.length === 0 ? (
        <p className="mt-4 text-sm leading-relaxed text-brand-gray">
          No consultation times are open right now. Carry on, and we will arrange your time with you on WhatsApp once your
          payment is confirmed.
        </p>
      ) : activeHold?.status === "booked" ? null : (
        <>
          <div className="mt-5 space-y-5">
            {visibleDays.map((day) => (
              <div key={day.key}>
                <h3 className="text-sm font-medium text-brand-ink">{day.label}</h3>
                <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {day.slots.map((slot) => {
                    const isHeld = activeHold?.slotId === slot.id;
                    const isChosen = chosen === slot.id;
                    return (
                      <button
                        key={slot.id}
                        type="button"
                        aria-pressed={isChosen || isHeld}
                        onClick={() => {
                          setMessage(null);
                          setChosen(isHeld ? null : slot.id);
                        }}
                        className={`min-h-12 w-full rounded-full border px-2 text-sm transition-colors ${
                          isHeld || isChosen
                            ? "border-brand-primary bg-brand-primary font-medium text-white"
                            : "border-brand-border-light bg-white text-brand-ink hover:border-brand-lavender"
                        }`}
                      >
                        {formatTime(slot.startsAt)}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
          {days.length > DAYS_SHOWN ? (
            <button type="button" onClick={() => setAllDays((v) => !v)} className="mt-4 min-h-11 text-sm text-brand-primary underline underline-offset-2">
              {allDays ? "Show fewer days" : `Show ${days.length - DAYS_SHOWN} more days`}
            </button>
          ) : null}

          <p className="mt-4 text-xs text-brand-gray">All times Pakistan Standard Time ({TZ_LABEL}).</p>

          {message ? (
            <p className="mt-3 text-sm text-red-700" role="alert">
              {message}
            </p>
          ) : null}

          {chosenSlot ? (
            <button
              type="button"
              onClick={hold}
              disabled={busy}
              className="mt-4 min-h-12 w-full rounded-full bg-brand-primary px-6 text-sm text-white disabled:opacity-60"
            >
              {busy
                ? "Holding…"
                : props.mode === "link"
                  ? `Book ${formatTime(chosenSlot.startsAt)} ${formatDay(chosenSlot.startsAt)}`
                  : `Hold ${formatTime(chosenSlot.startsAt)} ${formatDay(chosenSlot.startsAt).split(" ")[0]}`}
            </button>
          ) : null}
        </>
      )}
    </section>
  );
}
