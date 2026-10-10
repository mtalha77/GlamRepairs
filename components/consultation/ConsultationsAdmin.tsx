"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { ReassignControl } from "@/components/studio/practice/PracticeControls";
import { formInputClassName } from "@/components/ui/fieldStyles";
import type { Blackout, ConsultationAdminData, StudioAppointment, WeeklyWindow } from "@/lib/consultation/admin";
import type { AppointmentOutcome } from "@/lib/supabase/database.types";
import {
  addBlackout,
  createVideoRoom,
  removeBlackout,
  saveConsultationSettings,
  saveWeeklyAvailability,
  setAppointmentLink,
  settleAppointment,
  type ConsultationActionResult,
} from "@/lib/consultation/adminActions";
import { formatDay, formatSlot, formatTime, TZ_LABEL } from "@/lib/consultation/format";

/**
 * Studio → Consultations — HANDOVER-50 §3.
 *
 * Ayma sets a weekly pattern once; the calendar of bookable times is built
 * from it nightly (and immediately after any change here). Blackouts take
 * time out without touching anyone already booked. Appointments are listed
 * with what she needs on the day: the time, the link, a WhatsApp button.
 */

const OUTCOME_OPTIONS: { value: AppointmentOutcome; label: string; help: string }[] = [
  { value: "attended", label: "Attended", help: "The practitioner is paid in full once the consultation note is written." },
  { value: "client_no_show", label: "Client did not show", help: "The practitioner is still paid in full. No refund to the client." },
  {
    value: "cancelled_by_client",
    label: "Client cancelled",
    help: "Inside the cancellation window the practitioner is paid and there is no refund; with notice, nobody is charged and the time reopens.",
  },
  { value: "cancelled_by_practitioner", label: "Practitioner cancelled", help: "Nobody is paid; refund or rebook the client. The time reopens." },
  { value: "practitioner_no_show", label: "Practitioner did not show", help: "Nobody is paid; refund the client." },
  { value: "technical_failure", label: "Technical failure", help: "Nobody is paid; rebook the client." },
];

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
// Week as Pakistan works it, Monday first. Values stay Postgres dow (0 = Sunday).
const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

const card = "rounded-2xl border border-brand-lavender/70 bg-white p-5";
const smallInput =
  "rounded-lg border border-brand-border-light bg-white px-2.5 py-2 text-sm text-black outline-none focus:border-brand-primary";
const primaryButton =
  "min-h-11 rounded-xl bg-brand-primary px-4 py-2.5 text-sm text-white transition-opacity disabled:opacity-50";
const ghostButton =
  "min-h-10 rounded-lg border border-brand-border-light px-3 py-1.5 text-sm text-brand-ink hover:border-brand-primary disabled:opacity-50";

function Feedback({ result }: { result: ConsultationActionResult | null }) {
  if (!result) return null;
  if (result.ok) {
    return result.message ? (
      <p role="status" className="rounded-xl bg-brand-success/15 px-4 py-2.5 text-sm text-brand-success-strong">
        {result.message}
      </p>
    ) : null;
  }
  if ("error" in result) {
    return (
      <p role="alert" className="rounded-xl bg-brand-error/10 px-4 py-2.5 text-sm text-brand-error-strong">
        {result.error}
      </p>
    );
  }
  return null;
}

function formatRupees(minor: number): string {
  return `Rs ${(minor / 100).toLocaleString("en-PK", { maximumFractionDigits: 0 })}`;
}

const toMin = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));

function callsIn(w: WeeklyWindow) {
  const span = toMin(w.endsTime) - toMin(w.startsTime);
  if (span < w.slotMinutes || w.strideMinutes < 1) return 0;
  return Math.floor((span - w.slotMinutes) / w.strideMinutes) + 1;
}

// ── Weekly hours ────────────────────────────────────────────────────────

export function WeeklyHours({
  initial,
  defaultSlot,
  readOnly,
  practitionerId,
}: {
  initial: WeeklyWindow[];
  defaultSlot: number;
  readOnly: boolean;
  /** Whose hours; omitted for the default practitioner (Ayma). */
  practitionerId?: string;
}) {
  const router = useRouter();
  const [rows, setRows] = useState<WeeklyWindow[]>(initial);
  const [result, setResult] = useState<ConsultationActionResult | null>(null);
  const [pending, start] = useTransition();

  const update = (i: number, patch: Partial<WeeklyWindow>) =>
    setRows((r) => r.map((row, j) => (j === i ? { ...row, ...patch } : row)));

  const addFor = (weekday: number) =>
    setRows((r) => [
      ...r,
      { weekday, startsTime: "18:00", endsTime: "21:00", slotMinutes: defaultSlot, strideMinutes: defaultSlot + 5, active: true },
    ]);

  const save = () =>
    start(async () => {
      const res = await saveWeeklyAvailability(
        rows.map(({ weekday, startsTime, endsTime, slotMinutes, strideMinutes }) => ({
          weekday,
          startsTime,
          endsTime,
          slotMinutes: Number(slotMinutes),
          strideMinutes: Number(strideMinutes),
        })),
        practitionerId,
      );
      setResult(res);
      if (res.ok) router.refresh();
    });

  const total = rows.reduce((n, w) => n + callsIn(w), 0);

  return (
    <section className={card} aria-labelledby="weekly-heading">
      <h2 id="weekly-heading" className="font-serif text-xl text-brand-primary">
        Weekly hours
      </h2>
      <p className="mt-1 max-w-2xl text-sm leading-relaxed text-brand-gray">
        The hours you take calls each week, in Pakistan time. Clients only ever see times built from this. The gap is from
        one call starting to the next: 15 minute calls on a 20 minute gap leaves 5 minutes between them.
      </p>

      <div className="mt-4 divide-y divide-brand-lavender/50">
        {DAY_ORDER.map((day) => {
          const forDay = rows.map((w, i) => ({ w, i })).filter(({ w }) => w.weekday === day);
          return (
            <div key={day} className="py-3">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-sm font-medium text-brand-ink">{DAYS[day]}</h3>
                {!readOnly ? (
                  <button type="button" className="text-sm text-brand-primary underline underline-offset-2" onClick={() => addFor(day)}>
                    Add hours
                  </button>
                ) : null}
              </div>
              {forDay.length === 0 ? (
                <p className="mt-1 text-sm text-brand-gray">No calls.</p>
              ) : (
                <div className="mt-2 space-y-3">
                  {forDay.map(({ w, i }) => {
                    const calls = callsIn(w);
                    const rest = Number(w.strideMinutes) - Number(w.slotMinutes);
                    return (
                      <div key={i} className="rounded-xl bg-brand-cream-card/60 p-3">
                        <div className="flex flex-wrap items-end gap-3 text-sm">
                          <label className="flex flex-col gap-1">
                            <span className="text-xs text-brand-gray">From</span>
                            <input type="time" value={w.startsTime} disabled={readOnly} onChange={(e) => update(i, { startsTime: e.target.value })} className={smallInput} />
                          </label>
                          <label className="flex flex-col gap-1">
                            <span className="text-xs text-brand-gray">To</span>
                            <input type="time" value={w.endsTime} disabled={readOnly} onChange={(e) => update(i, { endsTime: e.target.value })} className={smallInput} />
                          </label>
                          <label className="flex flex-col gap-1">
                            <span className="text-xs text-brand-gray">Call (min)</span>
                            <input type="number" min={15} max={120} value={w.slotMinutes} disabled={readOnly} onChange={(e) => update(i, { slotMinutes: Number(e.target.value) })} className={`${smallInput} w-20`} />
                          </label>
                          <label className="flex flex-col gap-1">
                            <span className="text-xs text-brand-gray">Gap (min)</span>
                            <input type="number" min={5} max={240} value={w.strideMinutes} disabled={readOnly} onChange={(e) => update(i, { strideMinutes: Number(e.target.value) })} className={`${smallInput} w-20`} />
                          </label>
                          {!readOnly ? (
                            <button type="button" className={ghostButton} onClick={() => setRows((r) => r.filter((_, j) => j !== i))}>
                              Remove
                            </button>
                          ) : null}
                        </div>
                        <p className="mt-2 text-xs text-brand-gray">
                          {rest < 0
                            ? "The gap cannot be shorter than the call."
                            : `${calls} ${calls === 1 ? "call" : "calls"}, ${w.slotMinutes} minutes each, ${rest} ${rest === 1 ? "minute" : "minutes"} between them.`}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <p className="mt-3 text-sm text-brand-ink">
        {total} {total === 1 ? "call" : "calls"} a week at most.
      </p>
      {!readOnly ? (
        <div className="mt-4 space-y-3">
          <Feedback result={result} />
          <button type="button" onClick={save} disabled={pending} className={primaryButton}>
            {pending ? "Saving…" : "Save weekly hours"}
          </button>
        </div>
      ) : null}
    </section>
  );
}

// ── Blackouts ───────────────────────────────────────────────────────────

function Blackouts({ items, readOnly }: { items: Blackout[]; readOnly: boolean }) {
  const router = useRouter();
  const [startsLocal, setStarts] = useState("");
  const [endsLocal, setEnds] = useState("");
  const [reason, setReason] = useState("");
  const [result, setResult] = useState<ConsultationActionResult | null>(null);
  const [pending, start] = useTransition();

  const submit = (confirmed: boolean) =>
    start(async () => {
      const res = await addBlackout({ startsLocal, endsLocal, reason, confirmed });
      setResult(res);
      if (res.ok) {
        setStarts("");
        setEnds("");
        setReason("");
        router.refresh();
      }
    });

  const remove = (id: string) =>
    start(async () => {
      const res = await removeBlackout(id);
      setResult(res);
      if (res.ok) router.refresh();
    });

  const affected = result && !result.ok && "needsConfirm" in result ? result.affected : null;

  return (
    <section className={card} aria-labelledby="blackout-heading">
      <h2 id="blackout-heading" className="font-serif text-xl text-brand-primary">
        Time off
      </h2>
      <p className="mt-1 max-w-2xl text-sm leading-relaxed text-brand-gray">
        Block a day or a few hours. Open times in the range stop being offered at once. Anyone already booked keeps their
        booking until you move it with them.
      </p>

      {items.length ? (
        <ul className="mt-4 space-y-2">
          {items.map((b) => (
            <li key={b.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-brand-cream-card/60 px-3 py-2 text-sm">
              <span>
                {formatSlot(b.startsAt)} to {formatDay(b.endsAt) === formatDay(b.startsAt) ? `${formatTime(b.endsAt)} ${TZ_LABEL}` : formatSlot(b.endsAt)}
                {b.reason ? <span className="text-brand-gray"> · {b.reason}</span> : null}
              </span>
              {!readOnly ? (
                <button type="button" className={ghostButton} disabled={pending} onClick={() => remove(b.id)}>
                  Remove
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 text-sm text-brand-gray">No time off coming up.</p>
      )}

      {!readOnly ? (
        <div className="mt-5 space-y-3">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-brand-gray">From ({TZ_LABEL})</span>
              <input type="datetime-local" value={startsLocal} onChange={(e) => { setStarts(e.target.value); setResult(null); }} className={formInputClassName} />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-brand-gray">To ({TZ_LABEL})</span>
              <input type="datetime-local" value={endsLocal} onChange={(e) => { setEnds(e.target.value); setResult(null); }} className={formInputClassName} />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-brand-gray">Reason (only you see this)</span>
              <input type="text" value={reason} maxLength={200} onChange={(e) => setReason(e.target.value)} className={formInputClassName} />
            </label>
          </div>

          {affected ? (
            <div role="alert" className="rounded-xl border border-brand-error/30 bg-brand-error/5 p-4 text-sm text-brand-ink">
              <p className="font-medium">
                {affected.length} {affected.length === 1 ? "client has" : "clients have"} a time in this range:
              </p>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                {affected.map((a, i) => (
                  <li key={i}>
                    {a.clientName}, {formatSlot(a.startsAt)} ({a.status === "booked" ? "booked" : "held, not yet paid"})
                  </li>
                ))}
              </ul>
              <p className="mt-2">Blocking will not cancel these. You will need to contact them to move their time.</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button type="button" className={primaryButton} disabled={pending} onClick={() => submit(true)}>
                  Block anyway
                </button>
                <button type="button" className={ghostButton} onClick={() => setResult(null)}>
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <>
              <Feedback result={result} />
              <button type="button" className={primaryButton} disabled={pending || !startsLocal || !endsLocal} onClick={() => submit(false)}>
                {pending ? "Saving…" : "Block this time"}
              </button>
            </>
          )}
        </div>
      ) : null}
    </section>
  );
}

// ── Settings ────────────────────────────────────────────────────────────

function Settings({ initial, readOnly }: { initial: ConsultationAdminData["settings"]; readOnly: boolean }) {
  const router = useRouter();
  const [s, setS] = useState(initial);
  const [result, setResult] = useState<ConsultationActionResult | null>(null);
  const [pending, start] = useTransition();

  const num = (key: "leadTimeHours" | "horizonDays" | "holdMinutes" | "rescheduleHours", label: string, hint: string) => (
    <label className="flex flex-col gap-1 text-sm">
      <span className="text-brand-ink">{label}</span>
      <input type="number" value={s[key]} disabled={readOnly} onChange={(e) => setS({ ...s, [key]: Number(e.target.value) })} className={formInputClassName} />
      <span className="text-xs text-brand-gray">{hint}</span>
    </label>
  );

  const save = () =>
    start(async () => {
      const res = await saveConsultationSettings(s);
      setResult(res);
      if (res.ok) router.refresh();
    });

  return (
    <section className={card} aria-labelledby="settings-heading">
      <h2 id="settings-heading" className="font-serif text-xl text-brand-primary">
        Booking rules
      </h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        {num("leadTimeHours", "Notice (hours)", "The soonest a client can book, from now.")}
        {num("horizonDays", "Booking window (days)", "How far ahead times are offered.")}
        {num("holdMinutes", "Hold (minutes)", "How long a picked time is kept for an unpaid client.")}
        {num("rescheduleHours", "Reschedule notice (hours)", "Shown to clients as the cut-off for changing their time.")}
      </div>
      <label className="mt-4 flex flex-col gap-1 text-sm">
        <span className="text-brand-ink">Call guidelines</span>
        <span className="text-xs text-brand-gray">
          Shown before a client picks a time and repeated in every confirmation and reminder. Markdown: ### for a heading, - for a list.
        </span>
        <textarea
          value={s.guidelinesMarkdown}
          disabled={readOnly}
          rows={10}
          onChange={(e) => setS({ ...s, guidelinesMarkdown: e.target.value })}
          className={`${formInputClassName} font-mono text-xs`}
        />
      </label>
      {!readOnly ? (
        <div className="mt-4 space-y-3">
          <Feedback result={result} />
          <button type="button" onClick={save} disabled={pending} className={primaryButton}>
            {pending ? "Saving…" : "Save rules"}
          </button>
        </div>
      ) : null}
    </section>
  );
}

// ── Appointments ────────────────────────────────────────────────────────

function AppointmentRow({
  a,
  readOnly,
  ringCentralReady,
  practitioners,
}: {
  a: StudioAppointment;
  readOnly: boolean;
  ringCentralReady: boolean;
  practitioners: PractitionerOption[];
}) {
  const router = useRouter();
  const [link, setLink] = useState(a.joinUrl ?? "");
  const [notify, setNotify] = useState(!a.joinUrl);
  const [result, setResult] = useState<ConsultationActionResult | null>(null);
  const [pending, start] = useTransition();
  const past = a.ended;

  const whatsapp = a.phoneDigits
    ? `https://wa.me/${a.phoneDigits}?text=${encodeURIComponent(
        `Hi ${a.clientName}, this is GlamRepairs about your video consultation with Ayma on ${formatSlot(a.startsAt)}.`,
      )}`
    : null;

  const saveLink = () =>
    start(async () => {
      const res = await setAppointmentLink({ id: a.id, joinUrl: link, notify });
      setResult(res);
      if (res.ok) router.refresh();
    });

  const makeRoom = () =>
    start(async () => {
      const res = await createVideoRoom({ id: a.id, notify });
      setResult(res);
      if (res.ok) router.refresh();
    });

  const [outcome, setOutcome] = useState<AppointmentOutcome | "">("");
  const [outcomeNote, setOutcomeNote] = useState("");
  const settle = () => {
    if (!outcome) return;
    const label = OUTCOME_OPTIONS.find((o) => o.value === outcome)?.label ?? outcome;
    if (!window.confirm(`Record "${label}" for ${a.clientName} on ${formatSlot(a.startsAt)}? This cannot be changed afterwards.`)) return;
    start(async () => {
      const res = await settleAppointment({ id: a.id, outcome, note: outcomeNote });
      setResult(res);
      if (res.ok) router.refresh();
    });
  };

  return (
    <li className={`rounded-xl border p-4 ${past ? "border-brand-error/30 bg-brand-error/5" : "border-brand-lavender/60"}`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-sm font-medium text-brand-ink">{formatSlot(a.startsAt)}</p>
          <p className="text-sm text-brand-gray">
            {a.leadId ? (
              <a href={`/studio/customers/${a.leadId}`} className="text-brand-primary underline underline-offset-2">
                {a.clientName}
              </a>
            ) : (
              a.clientName
            )}
            {a.email ? ` · ${a.email}` : ""}
          </p>
          {past ? <p className="mt-1 text-xs text-brand-error-strong">This call has ended. Mark how it went.</p> : null}
        </div>
        {whatsapp ? (
          <a href={whatsapp} target="_blank" rel="noopener noreferrer" className={ghostButton}>
            WhatsApp
          </a>
        ) : null}
      </div>

      <div className="mt-3 text-sm">
        {a.joinUrl ? (
          <p>
            Video link (practitioner and client, no sign-in):{" "}
            <a href={a.joinUrl} target="_blank" rel="noopener noreferrer" className="break-all text-brand-primary underline underline-offset-2">
              {a.joinUrl}
            </a>
          </p>
        ) : (
          <p className="text-brand-error-strong">No video link yet. Create a room or paste a link below.</p>
        )}
        {practitioners.length > 1 ? (
          <p className="mt-1 text-brand-gray">With {practitioners.find((p) => p.id === a.practitionerId)?.name ?? "another practitioner"}</p>
        ) : null}
        {a.notes ? <p className="mt-1 text-brand-gray">{a.notes}</p> : null}
        <p className="mt-1 text-xs text-brand-gray">
          Reminders: 24 hours {a.reminder24hAt ? "sent" : "not sent"} · 1 hour {a.reminder1hAt ? "sent" : "not sent"}
        </p>
        <p className="mt-2">
          <a
            href={`/studio/consultations/${a.id}/note`}
            className={`inline-flex min-h-10 items-center text-sm underline underline-offset-2 ${
              a.hasNote ? "text-brand-primary" : past ? "font-medium text-brand-error-strong" : "text-brand-primary"
            }`}
          >
            {a.hasNote ? "View consultation note" : past ? "Consultation note due: write it now" : "Write consultation note"}
          </a>
        </p>
      </div>

      {!readOnly ? (
        <div className="mt-3 space-y-3">
          {!a.hasBridge && ringCentralReady && !past ? (
            <button type="button" className={primaryButton} disabled={pending} onClick={makeRoom}>
              {pending ? "Creating…" : "Create RingCentral room"}
            </button>
          ) : null}
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="url"
              inputMode="url"
              placeholder="https://"
              value={link}
              onChange={(e) => setLink(e.target.value)}
              className={`${smallInput} w-full sm:w-auto sm:min-w-0 sm:flex-1`}
              aria-label="Client video link"
            />
            <label className="flex items-center gap-1.5 text-xs text-brand-gray">
              <input type="checkbox" checked={notify} onChange={(e) => setNotify(e.target.checked)} />
              Email it to the client
            </label>
            <button type="button" className={ghostButton} disabled={pending || link === (a.joinUrl ?? "")} onClick={saveLink}>
              Save link
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={outcome}
              onChange={(e) => setOutcome(e.target.value as AppointmentOutcome | "")}
              className={`${smallInput} min-h-10`}
              aria-label="How did this consultation go?"
            >
              <option value="">How did it go?</option>
              {OUTCOME_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <input
              value={outcomeNote}
              onChange={(e) => setOutcomeNote(e.target.value)}
              placeholder="Note (optional)"
              maxLength={300}
              className={`${smallInput} min-h-10 w-full sm:w-auto sm:min-w-0 sm:flex-1`}
              aria-label="Outcome note"
            />
            <button type="button" className={ghostButton} disabled={pending || !outcome} onClick={settle}>
              Record outcome
            </button>
          </div>
          {outcome ? <p className="text-xs text-brand-gray">{OUTCOME_OPTIONS.find((o) => o.value === outcome)?.help}</p> : null}
          <Feedback result={result} />
          {!past && practitioners.length > 1 ? (
            <ReassignControl appointmentId={a.id} currentPractitionerId={a.practitionerId} practitioners={practitioners.filter((p) => p.live)} />
          ) : null}
        </div>
      ) : null}
    </li>
  );
}

type PractitionerOption = { id: string; name: string; live: boolean };

// ── Page ────────────────────────────────────────────────────────────────

export default function ConsultationsAdmin({
  data,
  readOnly,
  practitionerView = false,
  ringCentralReady,
  practitioners = [],
}: {
  /** Practitioners, for names and for moving a booking (super admin only). */
  practitioners?: PractitionerOption[];
  data: ConsultationAdminData;
  readOnly: boolean;
  /** A practitioner's own view: her consultations only, no calendar admin. */
  practitionerView?: boolean;
  ringCentralReady: boolean;
}) {
  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className={card}>
          <p className="text-xs text-brand-gray">Open times, next 7 days</p>
          <p className="mt-1 text-2xl text-brand-ink">{data.openNext7}</p>
        </div>
        <div className={card}>
          <p className="text-xs text-brand-gray">Open times, next {data.settings.horizonDays} days</p>
          <p className="mt-1 text-2xl text-brand-ink">{data.openInHorizon}</p>
        </div>
        <div className={card}>
          <p className="text-xs text-brand-gray">Video rooms</p>
          <p className="mt-1 text-sm leading-relaxed text-brand-ink">
            {ringCentralReady
              ? "RingCentral connected. Each booking gets its own room."
              : "RingCentral not connected. Bookings still go through; paste a link for each one below."}
          </p>
        </div>
        <div className={card}>
          <p className="text-xs text-brand-gray">Referred to a doctor, last 90 days</p>
          <p className="mt-1 text-2xl text-brand-ink">{data.escalations90d}</p>
        </div>
      </div>

      {data.notesDue.length ? (
        <section role="alert" className="rounded-2xl border-2 border-amber-400 bg-amber-50 p-5" aria-labelledby="notes-due-heading">
          <h2 id="notes-due-heading" className="font-serif text-xl text-brand-ink">
            {data.notesDue.length} consultation {data.notesDue.length === 1 ? "note" : "notes"} outstanding
          </h2>
          {(() => {
            const held = data.notesDue.reduce((n, d) => n + (d.heldMinor ?? 0), 0);
            return held > 0 ? (
              <p className="mt-1 text-sm text-amber-950">
                {formatRupees(held)} is held until {data.notesDue.length === 1 ? "it is" : "they are"} written.
              </p>
            ) : null;
          })()}
          <ul className="mt-3 space-y-2 text-sm">
            {data.notesDue.map((d) => (
              <li key={d.appointmentId} className="flex flex-wrap items-center justify-between gap-2">
                <span>
                  {formatSlot(d.startsAt)} · {d.clientLabel}
                  {d.heldMinor ? <span className="text-amber-950"> · {formatRupees(d.heldMinor)} held</span> : null}
                </span>
                <a href={`/studio/consultations/${d.appointmentId}/note`} className="inline-flex min-h-10 items-center font-medium text-brand-primary underline underline-offset-2">
                  Write note
                </a>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {data.windows.length === 0 && !practitionerView ? (
        <p role="alert" className="rounded-xl bg-brand-lavender/25 px-4 py-3 text-sm leading-relaxed text-brand-ink">
          No weekly hours are set, so clients on a plan with a video call cannot pick a time. They are told it will be
          arranged on WhatsApp once they pay.
        </p>
      ) : null}

      <section className={card} aria-labelledby="appointments-heading">
        <h2 id="appointments-heading" className="font-serif text-xl text-brand-primary">
          Upcoming consultations
        </h2>
        {data.appointments.length ? (
          <ul className="mt-4 space-y-3">
            {data.appointments.map((a) => (
              <AppointmentRow key={a.id} a={a} readOnly={readOnly} ringCentralReady={ringCentralReady} practitioners={practitioners} />
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-brand-gray">Nothing booked yet.</p>
        )}

        {data.holds.length && !practitionerView ? (
          <div className="mt-6">
            <h3 className="text-sm font-medium text-brand-ink">Held, waiting for payment</h3>
            <ul className="mt-2 space-y-1 text-sm text-brand-gray">
              {data.holds.map((h) => (
                <li key={h.slotId}>
                  {h.leadId ? (
                    <a href={`/studio/customers/${h.leadId}`} className="text-brand-primary underline underline-offset-2">
                      {h.clientName}
                    </a>
                  ) : (
                    h.clientName
                  )}
                  , {formatSlot(h.startsAt)}
                  {h.heldUntil ? ` · held until ${formatTime(h.heldUntil)} ${TZ_LABEL}` : ""}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </section>

      {practitionerView ? null : (
        <>
          <WeeklyHours initial={data.windows} defaultSlot={data.defaultSlotMinutes} readOnly={readOnly} />
          <Blackouts items={data.blackouts} readOnly={readOnly} />
          <Settings initial={data.settings} readOnly={readOnly} />
        </>
      )}
    </div>
  );
}
