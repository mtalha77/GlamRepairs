"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { formInputClassName } from "@/components/ui/fieldStyles";
import {
  addOwnTimeOff,
  cannotAttend,
  leaveGlamRepairs,
  makePractitionerLive,
  offboardPractitionerAsAdmin,
  reassignAppointment,
  removeOwnTimeOff,
  saveOwnPublicProfile,
  setOwnDailyLimit,
  setPractitionerRate,
  suspendPractitioner,
  updateOwnBio,
  updatePractitionerDetails,
  type PractitionerActionResult,
} from "@/lib/practitioners/practitionerActions";
import { COUNTRY_TIMEZONES, countryName, timezoneLabel, timezonesFor } from "@/lib/countries/timezones";

const COUNTRY_OPTIONS = Object.keys(COUNTRY_TIMEZONES)
  .map((code) => ({ code, name: countryName(code) }))
  .sort((a, b) => a.name.localeCompare(b.name));

const primary = "min-h-11 rounded-xl bg-brand-primary px-4 py-2.5 text-sm text-white disabled:opacity-50";
const ghost = "min-h-10 rounded-lg border border-brand-border-light px-3 py-1.5 text-sm text-brand-ink hover:border-brand-primary disabled:opacity-50";
const danger = "min-h-11 rounded-xl border border-brand-error/40 px-4 py-2.5 text-sm text-brand-error-strong disabled:opacity-50";

function Feedback({ result }: { result: PractitionerActionResult | null }) {
  if (!result) return null;
  return (
    <p
      role={result.ok ? "status" : "alert"}
      className={`rounded-xl px-4 py-2.5 text-sm ${result.ok ? "bg-brand-success/15 text-brand-success-strong" : "bg-brand-error/10 text-brand-error-strong"}`}
    >
      {result.ok ? result.message : result.error}
    </p>
  );
}

function useAction() {
  const router = useRouter();
  const [result, setResult] = useState<PractitionerActionResult | null>(null);
  const [pending, start] = useTransition();
  const run = (fn: () => Promise<PractitionerActionResult>) =>
    start(async () => {
      const res = await fn();
      setResult(res);
      if (res.ok) router.refresh();
    });
  return { result, pending, run, setResult };
}

// ── The practitioner's own controls ────────────────────────────────────

export function CannotAttendButton({ appointmentId, when }: { appointmentId: string; when: string }) {
  const { result, pending, run } = useAction();
  return (
    <div className="space-y-2">
      <button
        type="button"
        className={ghost}
        disabled={pending}
        onClick={() => {
          if (!window.confirm(`You cannot attend ${when}? It will be handed to Ayma if she is free, otherwise the client is asked to choose another time.`)) return;
          run(() => cannotAttend(appointmentId));
        }}
      >
        {pending ? "Working…" : "I can't attend"}
      </button>
      <Feedback result={result} />
    </div>
  );
}

export function PhotoUpload({ current, profileId }: { current: string | null; profileId?: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function upload(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    setError(null);
    const form = new FormData();
    form.append("file", file);
    if (profileId) form.append("profileId", profileId);
    const res = await fetch("/api/studio/practitioner-photo", { method: "POST", body: form });
    const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
    setBusy(false);
    if (!data.ok) setError(data.error ?? "Upload failed.");
    else router.refresh();
  }
  return (
    <div className="flex flex-wrap items-start gap-4">
      {current ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={current} alt="Profile photograph" className="h-40 w-32 rounded-xl object-cover" />
      ) : (
        <div className="flex h-40 w-32 items-center justify-center rounded-xl bg-brand-cream-card text-xs text-brand-gray">No photo</div>
      )}
      <div className="min-w-0 flex-1 space-y-2 text-sm">
        <p className="text-brand-gray">
          A professional headshot: your face clearly visible, plain background, good light, no filters. Like Ayma&apos;s on
          the About page.
        </p>
        <label className={`${ghost} inline-flex cursor-pointer items-center`}>
          {busy ? "Uploading…" : current ? "Replace photograph" : "Upload photograph"}
          <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" disabled={busy} onChange={(e) => upload(e.target.files?.[0])} />
        </label>
        {error ? <p className="text-brand-error-strong">{error}</p> : null}
      </div>
    </div>
  );
}

export function BioForm({ initial }: { initial: string }) {
  const [bio, setBio] = useState(initial);
  const { result, pending, run } = useAction();
  return (
    <div className="space-y-2">
      <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={5} maxLength={1200} className={formInputClassName} />
      <p className={`text-xs ${bio.trim().length > 80 ? "text-brand-success-strong" : "text-brand-gray"}`}>
        {bio.trim().length > 80 ? "Long enough" : `More than 80 characters needed (${bio.trim().length} so far)`}
      </p>
      <Feedback result={result} />
      <button type="button" className={primary} disabled={pending} onClick={() => run(() => updateOwnBio(bio))}>
        {pending ? "Saving…" : "Save bio"}
      </button>
    </div>
  );
}

export function LeaveButton() {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const { result, pending, run } = useAction();
  if (!open) {
    return (
      <button type="button" className={danger} onClick={() => setOpen(true)}>
        Leave GlamRepairs…
      </button>
    );
  }
  return (
    <div className="space-y-3">
      <p className="text-sm leading-relaxed text-brand-ink">
        Your hours close and no new times are offered. Every consultation you have booked is handed to Ayma, who will
        attend it or give it to someone else. Your notes stay as the record, and anything you have earned is still paid.
        Your sign-in stops working straight away, so save any payout statements you want first.
      </p>
      <label className="block text-sm">
        <span className="text-brand-gray">Anything you would like us to know (optional)</span>
        <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} maxLength={500} className={formInputClassName} />
      </label>
      <Feedback result={result} />
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className={danger}
          disabled={pending}
          onClick={() => {
            if (!window.confirm("Leave GlamRepairs now? This cannot be undone from here.")) return;
            run(() => leaveGlamRepairs(reason));
          }}
        >
          {pending ? "Working…" : "Leave and hand over my bookings"}
        </button>
        <button type="button" className={ghost} onClick={() => setOpen(false)}>
          Cancel
        </button>
      </div>
    </div>
  );
}

// ── Super admin controls ───────────────────────────────────────────────

export function PractitionerDetailsForm(props: {
  id: string;
  profilePhotoVerified: boolean;
  payoutMethod: string | null;
  payoutDetailRef: string | null;
  maxPerDay: number;
  maxPerWeek: number;
  countryCode: string | null;
  timezone: string;
}) {
  const [v, setV] = useState({
    profilePhotoVerified: props.profilePhotoVerified,
    payoutMethod: props.payoutMethod ?? "",
    payoutDetailRef: props.payoutDetailRef ?? "",
    maxPerDay: props.maxPerDay,
    maxPerWeek: props.maxPerWeek,
    countryCode: props.countryCode ?? "",
    timezone: props.timezone,
  });
  const { result, pending, run } = useAction();
  return (
    <div className="space-y-3">
      <label className="flex min-h-10 items-center gap-2 text-sm text-brand-ink">
        <input type="checkbox" checked={v.profilePhotoVerified} onChange={(e) => setV({ ...v, profilePhotoVerified: e.target.checked })} />
        Photograph checked: professional, face clearly visible
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-brand-gray">Payout method</span>
          <input value={v.payoutMethod} placeholder="e.g. Bank transfer, Meezan" onChange={(e) => setV({ ...v, payoutMethod: e.target.value })} className={formInputClassName} />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-brand-gray">Payout reference (not the account number)</span>
          <input value={v.payoutDetailRef} placeholder="e.g. Account title, last 4 digits" onChange={(e) => setV({ ...v, payoutDetailRef: e.target.value })} className={formInputClassName} />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-brand-gray">Most consultations a day</span>
          <input type="number" min={1} max={20} value={v.maxPerDay} onChange={(e) => setV({ ...v, maxPerDay: Number(e.target.value) })} className={formInputClassName} />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-brand-gray">Most a week</span>
          <input type="number" min={1} value={v.maxPerWeek} onChange={(e) => setV({ ...v, maxPerWeek: Number(e.target.value) })} className={formInputClassName} />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-brand-gray">Country (shown publicly; sets their currency)</span>
          <select
            value={v.countryCode}
            onChange={(e) => {
              const code = e.target.value;
              // A new country brings its own zones; keep the current one only if it belongs.
              const zones = timezonesFor(code);
              setV({ ...v, countryCode: code, timezone: zones.includes(v.timezone) ? v.timezone : zones[0] ?? v.timezone });
            }}
            className={formInputClassName}
          >
            <option value="">Choose a country</option>
            {COUNTRY_OPTIONS.map((c) => (
              <option key={c.code} value={c.code}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-brand-gray">Timezone (their hours are set in this)</span>
          <select
            value={v.timezone}
            onChange={(e) => setV({ ...v, timezone: e.target.value })}
            className={formInputClassName}
            disabled={!v.countryCode}
          >
            {(timezonesFor(v.countryCode).length ? timezonesFor(v.countryCode) : [v.timezone]).map((zone) => (
              <option key={zone} value={zone}>
                {timezoneLabel(zone)}
              </option>
            ))}
          </select>
        </label>
      </div>
      <Feedback result={result} />
      <button type="button" className={primary} disabled={pending} onClick={() => run(() => updatePractitionerDetails({ id: props.id, ...v }))}>
        {pending ? "Saving…" : "Save"}
      </button>
    </div>
  );
}

export function RateForm({
  id,
  feeMinor,
  platformMinor,
  currency,
}: {
  id: string;
  feeMinor: number;
  platformMinor: number;
  /** The practitioner's own currency (their country's price, or PKR). */
  currency: string;
}) {
  const [prac, setPrac] = useState(String(feeMinor / 100));
  const [plat, setPlat] = useState(String(platformMinor / 100));
  const [note, setNote] = useState("");
  const { result, pending, run } = useAction();
  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-brand-gray">Practitioner ({currency})</span>
          <input inputMode="numeric" value={prac} onChange={(e) => setPrac(e.target.value)} className={formInputClassName} />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-brand-gray">Platform ({currency})</span>
          <input inputMode="numeric" value={plat} onChange={(e) => setPlat(e.target.value)} className={formInputClassName} />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-brand-gray">Why (optional)</span>
          <input value={note} onChange={(e) => setNote(e.target.value)} className={formInputClassName} />
        </label>
      </div>
      <Feedback result={result} />
      <button
        type="button"
        className={ghost}
        disabled={pending}
        onClick={() => run(() => setPractitionerRate({ id, practitionerAmount: Number(prac), platformAmount: Number(plat), note }))}
      >
        {pending ? "Saving…" : "Set rate from now"}
      </button>
    </div>
  );
}

export function PractitionerStatusButtons({ id, status, name }: { id: string; status: string; name: string }) {
  const [reason, setReason] = useState("");
  const { result, pending, run } = useAction();
  const live = status === "approved";
  const gone = status === "offboarded";
  return (
    <div className="space-y-3">
      {!live && !gone ? (
        <button type="button" className={primary} disabled={pending} onClick={() => run(() => makePractitionerLive(id))}>
          Make live
        </button>
      ) : null}
      {live ? (
        <div className="flex flex-wrap items-end gap-2">
          <label className="flex min-w-0 flex-1 flex-col gap-1 text-sm">
            <span className="text-brand-gray">Reason to suspend</span>
            <input value={reason} onChange={(e) => setReason(e.target.value)} className={formInputClassName} />
          </label>
          <button type="button" className={danger} disabled={pending} onClick={() => run(() => suspendPractitioner({ id, reason }))}>
            Suspend
          </button>
        </div>
      ) : null}
      {!gone ? (
        <button
          type="button"
          className={danger}
          disabled={pending}
          onClick={() => {
            if (!window.confirm(`Offboard ${name}? Their hours close and their bookings move to Ayma.`)) return;
            run(() => offboardPractitionerAsAdmin(id));
          }}
        >
          Offboard
        </button>
      ) : null}
      <Feedback result={result} />
    </div>
  );
}

export function ReassignControl({
  appointmentId,
  currentPractitionerId,
  practitioners,
}: {
  appointmentId: string;
  currentPractitionerId: string;
  practitioners: { id: string; name: string }[];
}) {
  const options = practitioners.filter((p) => p.id !== currentPractitionerId);
  const [to, setTo] = useState(options[0]?.id ?? "");
  const { result, pending, run } = useAction();
  if (!options.length) return null;
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <select value={to} onChange={(e) => setTo(e.target.value)} className="min-h-10 rounded-lg border border-brand-border-light bg-white px-2.5 text-sm" aria-label="Reassign to">
          {options.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <button type="button" className={ghost} disabled={pending || !to} onClick={() => run(() => reassignAppointment({ appointmentId, toPractitionerId: to }))}>
          Reassign
        </button>
      </div>
      <Feedback result={result} />
    </div>
  );
}

// ── Her limit, time off and public profile ─────────────────────────────

export function DailyLimitForm({ initial }: { initial: number }) {
  const [limit, setLimit] = useState(String(initial));
  const { result, pending, run } = useAction();
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-end gap-2">
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-brand-gray">Most consultations in a day</span>
          <input type="number" min={1} max={15} value={limit} onChange={(e) => setLimit(e.target.value)} className={`${formInputClassName} w-28`} />
        </label>
        <button type="button" className={ghost} disabled={pending} onClick={() => run(() => setOwnDailyLimit(Number(limit)))}>
          {pending ? "Saving…" : "Save limit"}
        </button>
      </div>
      <Feedback result={result} />
    </div>
  );
}

export function TimeOffControls({ blocks }: { blocks: { id: string; label: string; reason: string | null }[] }) {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [reason, setReason] = useState("");
  const { result, pending, run } = useAction();
  return (
    <div className="space-y-3">
      {blocks.length ? (
        <ul className="divide-y divide-brand-lavender/60 text-sm">
          {blocks.map((b) => (
            <li key={b.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
              <span className="text-brand-ink">
                {b.label}
                {b.reason ? <span className="text-brand-gray"> · {b.reason}</span> : null}
              </span>
              <button type="button" className={ghost} disabled={pending} onClick={() => run(() => removeOwnTimeOff(b.id))}>
                Remove
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-brand-gray">No time off booked.</p>
      )}
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-brand-gray">First day</span>
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={formInputClassName} />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-brand-gray">Last day</span>
          <input type="date" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} className={formInputClassName} />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-brand-gray">Note (optional)</span>
          <input value={reason} maxLength={200} onChange={(e) => setReason(e.target.value)} className={formInputClassName} />
        </label>
      </div>
      <Feedback result={result} />
      <button type="button" className={primary} disabled={pending || !from || !to} onClick={() => run(() => addOwnTimeOff({ from, to, reason }))}>
        {pending ? "Saving…" : "Block these days"}
      </button>
    </div>
  );
}

export function PublicProfileForm(props: {
  city: string;
  yearsExperience: string;
  specialisms: string;
  languages: string;
  consented: boolean;
}) {
  const [v, setV] = useState(props);
  const { result, pending, run } = useAction();
  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-brand-gray">City you practise in</span>
          <input value={v.city} onChange={(e) => setV({ ...v, city: e.target.value })} className={formInputClassName} />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-brand-gray">Years of experience</span>
          <input inputMode="numeric" value={v.yearsExperience} onChange={(e) => setV({ ...v, yearsExperience: e.target.value })} className={formInputClassName} />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-brand-gray">Specialisms (comma separated)</span>
          <input value={v.specialisms} placeholder="e.g. Acne, Pigmentation" onChange={(e) => setV({ ...v, specialisms: e.target.value })} className={formInputClassName} />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-brand-gray">Languages (comma separated)</span>
          <input value={v.languages} onChange={(e) => setV({ ...v, languages: e.target.value })} className={formInputClassName} />
        </label>
      </div>
      <label className="flex min-h-12 items-start gap-3 rounded-xl border border-brand-lavender/60 px-4 py-3 text-sm leading-relaxed text-brand-ink">
        <input type="checkbox" checked={v.consented} onChange={(e) => setV({ ...v, consented: e.target.checked })} className="mt-1 h-5 w-5 shrink-0" />
        <span>
          Show my profile on the GlamRepairs website: my name, photograph, title, qualification, bio, years of experience,
          city, specialisms, languages and when I am next available. Never my CNIC, documents, phone number or address.
        </span>
      </label>
      <Feedback result={result} />
      <button type="button" className={primary} disabled={pending} onClick={() => run(() => saveOwnPublicProfile({ ...v, consent: v.consented }))}>
        {pending ? "Saving…" : "Save profile"}
      </button>
    </div>
  );
}
