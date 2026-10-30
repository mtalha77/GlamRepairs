import "server-only";

import { notifyStudio } from "@/lib/consultation/booking";
import { formatSlot, formatSlotFor } from "@/lib/consultation/format";
import { escapeHtml, getResendConfig } from "@/lib/email/resendClient";
import { getPublicAppUrl } from "@/lib/leads/photoShortLink";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

/**
 * Emails to the practitioner — Talha, 20 October 2026: "Email notifications
 * should be sent to the practitioner for booked appointment and reminder",
 * and "practitioner must write notes about the clients".
 *
 *   booked     a consultation was placed in her diary
 *   reminder   24 hours and 1 hour before
 *   note_due   2 hours after the call, again at 24 hours; at 48 hours the
 *              studio is told instead
 *
 * Each send is claimed by stamping its column first, so two runs of the
 * hourly job cannot both send it. The client is never named in an email:
 * practitioners see clients masked in Studio, and an inbox is less private
 * than Studio. Links go to Studio, never to the call itself.
 */

const BRAND = "#662d91";
const HOUR = 3_600_000;

type Notice =
  | { kind: "booked"; startsAt: string; clientLabel: string }
  | { kind: "reminder"; when: "24h" | "1h"; startsAt: string; clientLabel: string }
  | { kind: "note_due"; startsAt: string; clientLabel: string; second: boolean };

function compose(name: string, n: Notice, timezone: string | null): { subject: string; lines: string[]; cta: { href: string; label: string } } {
  // PKT with the practitioner's own time beside it when they are elsewhere.
  const when = formatSlotFor(n.startsAt, timezone);
  const base = getPublicAppUrl();
  switch (n.kind) {
    case "booked":
      return {
        subject: `New consultation: ${when}`,
        lines: [
          `A consultation has been booked with you for ${when} (Pakistan time), ${n.clientLabel}.`,
          "The client's assessment and the video link are in Studio under My practice. Please read the assessment before the call.",
          "If you cannot attend, press \"Can't attend\" in Studio as early as you can, so Ayma can hand it on.",
        ],
        cta: { href: `${base}/studio/practice`, label: "Open My practice" },
      };
    case "reminder":
      return {
        subject: n.when === "24h" ? `Tomorrow: consultation at ${when}` : `In an hour: consultation at ${when}`,
        lines: [
          n.when === "24h"
            ? `A reminder that you have a consultation tomorrow, ${when} (Pakistan time), ${n.clientLabel}.`
            : `Your consultation with ${n.clientLabel} starts within the hour, at ${when} (Pakistan time).`,
          "The video link and the client's assessment are in Studio under My practice.",
        ],
        cta: { href: `${base}/studio/practice`, label: "Open My practice" },
      };
    case "note_due":
      return {
        subject: n.second ? `Still needed: your note for ${when}` : `Please write your note for ${when}`,
        lines: [
          n.second
            ? `The note for your consultation on ${when} with ${n.clientLabel} has not been written yet.`
            : `Thank you for your consultation on ${when} with ${n.clientLabel}.`,
          "Every consultation needs a note: what you saw, what you advised, and anything to follow up. It is the client's record and the next practitioner's starting point.",
          "Your fee for this consultation is paid once the note is written.",
        ],
        cta: { href: `${base}/studio/practice`, label: "Write the note" },
      };
  }
}

async function practitionerContact(practitionerId: string): Promise<{ email: string; name: string; timezone: string | null } | null> {
  const admin = createAdminSupabaseClient();
  const { data: profile } = await admin
    .from("practitioner_profiles")
    .select("full_name, user_id, status, timezone")
    .eq("id", practitionerId)
    .maybeSingle();
  if (!profile?.user_id || profile.status === "offboarded") return null;
  const { data } = await admin.auth.admin.getUserById(profile.user_id);
  const email = data.user?.email;
  return email ? { email, name: profile.full_name.split(/\s+/)[0] ?? profile.full_name, timezone: profile.timezone } : null;
}

async function sendNotice(practitionerId: string, notice: Notice): Promise<{ ok: true } | { ok: false; message: string }> {
  const config = getResendConfig();
  if (!config) return { ok: false, message: "Email is not configured." };
  const contact = await practitionerContact(practitionerId);
  if (!contact) return { ok: false, message: "The practitioner has no sign-in email." };
  const { subject, lines, cta } = compose(contact.name, notice, contact.timezone);
  const html = `
    <div style="font-family: Arial, Helvetica, sans-serif; line-height: 1.65; color: #2b2b2b; max-width: 560px;">
      <p style="margin: 0 0 12px;">Hi ${escapeHtml(contact.name)},</p>
      ${lines.map((l) => `<p style="margin: 0 0 12px;">${escapeHtml(l)}</p>`).join("")}
      <p style="margin: 20px 0;"><a href="${escapeHtml(cta.href)}" style="display: inline-block; background: ${BRAND}; color: #fff; text-decoration: none; padding: 12px 22px; border-radius: 999px;">${escapeHtml(cta.label)}</a></p>
      <p style="margin: 24px 0 0; color: #4a4a4a;">The GlamRepairs Team</p>
    </div>`;
  const text = [`Hi ${contact.name},`, "", ...lines, "", `${cta.label}: ${cta.href}`, "", "The GlamRepairs Team"].join("\n");
  const { error } = await config.resend.emails.send({ from: config.from, to: [contact.email], subject, html, text });
  return error ? { ok: false, message: error.message } : { ok: true };
}

const label = (appointmentId: string) => `Client ${appointmentId.slice(0, 4).toUpperCase()}`;

/** Tell the practitioner about a new booking, once. Safe to call from the booking and from the hourly job. */
export async function notifyPractitionerOfBooking(appointmentId: string): Promise<boolean> {
  const admin = createAdminSupabaseClient();
  const { data: appt } = await admin
    .from("appointments")
    .update({ practitioner_notified_at: new Date().toISOString() })
    .eq("id", appointmentId)
    .is("practitioner_notified_at", null)
    .eq("status", "scheduled")
    .select("id, practitioner_id, starts_at")
    .maybeSingle();
  if (!appt) return false;
  const sent = await sendNotice(appt.practitioner_id, { kind: "booked", startsAt: appt.starts_at, clientLabel: label(appt.id) });
  if (!sent.ok) {
    await admin.from("appointments").update({ practitioner_notified_at: null }).eq("id", appt.id);
    console.error("[notifyPractitionerOfBooking]", sent.message);
  }
  return sent.ok;
}

export type PractitionerNoticeRun = { booked: number; reminders: number; notes: number; escalated: number; errors: string[] };

/** The practitioner's part of the hourly consultations job. */
export async function runPractitionerNotices(): Promise<PractitionerNoticeRun> {
  const admin = createAdminSupabaseClient();
  const now = Date.now();
  const run: PractitionerNoticeRun = { booked: 0, reminders: 0, notes: 0, escalated: 0, errors: [] };

  // Bookings the booking flow could not announce (email down, a crash).
  const { data: unannounced } = await admin
    .from("appointments")
    .select("id")
    .eq("status", "scheduled")
    .is("practitioner_notified_at", null)
    .gt("starts_at", new Date(now).toISOString())
    .limit(25);
  for (const a of unannounced ?? []) if (await notifyPractitionerOfBooking(a.id)) run.booked++;

  // Reminders, on the same windows as the client's.
  const windows = [
    { when: "24h" as const, column: "practitioner_reminder_24h_at" as const, from: now + 3 * HOUR, to: now + 25 * HOUR },
    { when: "1h" as const, column: "practitioner_reminder_1h_at" as const, from: now, to: now + 90 * 60_000 },
  ];
  for (const w of windows) {
    const { data: due } = await admin
      .from("appointments")
      .select("id, practitioner_id, starts_at")
      .eq("status", "scheduled")
      .is(w.column, null)
      .gt("starts_at", new Date(w.from).toISOString())
      .lte("starts_at", new Date(w.to).toISOString())
      .limit(50);
    for (const a of due ?? []) {
      const { data: claimed } = await admin
        .from("appointments")
        .update(w.when === "24h" ? { practitioner_reminder_24h_at: new Date().toISOString() } : { practitioner_reminder_1h_at: new Date().toISOString() })
        .eq("id", a.id)
        .is(w.column, null)
        .select("id")
        .maybeSingle();
      if (!claimed) continue;
      const sent = await sendNotice(a.practitioner_id, { kind: "reminder", when: w.when, startsAt: a.starts_at, clientLabel: label(a.id) });
      if (sent.ok) run.reminders++;
      else {
        await admin.from("appointments").update(w.when === "24h" ? { practitioner_reminder_24h_at: null } : { practitioner_reminder_1h_at: null }).eq("id", a.id);
        run.errors.push(`practitioner reminder ${w.when} ${a.id}: ${sent.message}`);
      }
    }
  }

  // Notes: the same rule as "Notes due" in Studio.
  const { data: ended } = await admin
    .from("appointments")
    .select("id, practitioner_id, starts_at, ends_at, note_reminder_count")
    .in("status", ["scheduled", "completed", "no_show"])
    .lt("ends_at", new Date(now - 2 * HOUR).toISOString())
    .gte("ends_at", new Date(now - 14 * 24 * HOUR).toISOString())
    .lt("note_reminder_count", 3)
    .limit(100);
  const ids = (ended ?? []).map((a) => a.id);
  const { data: notes } = ids.length
    ? await admin.from("consultation_notes").select("appointment_id").in("appointment_id", ids)
    : { data: [] };
  const written = new Set((notes ?? []).map((n) => n.appointment_id));
  for (const a of ended ?? []) {
    if (written.has(a.id)) continue;
    const hoursSince = (now - new Date(a.ends_at).getTime()) / HOUR;
    const step = a.note_reminder_count;
    const due = (step === 0 && hoursSince >= 2) || (step === 1 && hoursSince >= 24) || (step === 2 && hoursSince >= 48);
    if (!due) continue;
    const { data: claimed } = await admin
      .from("appointments")
      .update({ note_reminder_count: step + 1, note_reminder_at: new Date().toISOString() })
      .eq("id", a.id)
      .eq("note_reminder_count", step)
      .select("id")
      .maybeSingle();
    if (!claimed) continue;
    if (step < 2) {
      const sent = await sendNotice(a.practitioner_id, { kind: "note_due", startsAt: a.starts_at, clientLabel: label(a.id), second: step === 1 });
      if (sent.ok) run.notes++;
      else {
        await admin.from("appointments").update({ note_reminder_count: step }).eq("id", a.id);
        run.errors.push(`note reminder ${a.id}: ${sent.message}`);
      }
    } else {
      const { data: profile } = await admin.from("practitioner_profiles").select("full_name").eq("id", a.practitioner_id).maybeSingle();
      await notifyStudio({
        title: "Consultation note still missing after 48 hours",
        body: `${profile?.full_name ?? "A practitioner"} has not written the note for ${formatSlot(a.starts_at)}, after two reminders. The fee stays held until it is written.`,
        leadId: null,
        href: "/studio/consultations",
      });
      run.escalated++;
    }
  }

  return run;
}
