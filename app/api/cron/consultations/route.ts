import { NextResponse } from "next/server";

import { notifyStudio } from "@/lib/consultation/booking";
import { formatSlot } from "@/lib/consultation/format";
import { deleteBridge, ringCentralConfigured } from "@/lib/consultation/ringcentral";
import { getConsultationSettings } from "@/lib/consultation/slots";
import { feedbackUrl } from "@/lib/consultation/feedback";
import { sendConsultationEmail } from "@/lib/email/sendConsultationEmail";
import { getPublicAppUrl } from "@/lib/leads/photoShortLink";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

/**
 * Consultation housekeeping — HANDOVER-50 §4.3, §6, §7.3. Hourly.
 *
 *   1. release_expired_holds   abandoned picks go back on the calendar
 *   2. generate_slots          keeps the bookable window full as days pass
 *   3. reminders               24 hours and 1 hour before, once each
 *   4. bridge deletion         each RingCentral room is deleted the day
 *                              after its call (or on cancellation), so a
 *                              past link can never open a live room again
 *   5. feedback                one request per consultation, an hour or
 *                              more after it ends (HANDOVER-52 §3.6)
 *
 * Called by .github/workflows/consultations.yml, since Vercel cron does not
 * fire on this project (see app/api/cron/gsc/route.ts). Safe to run twice:
 * a reminder is claimed by stamping it before it is sent, so two runs
 * cannot both send it, and generate_slots skips slots that already exist.
 */
export const dynamic = "force-dynamic";
export const maxDuration = 120;

const HOUR = 3_600_000;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const hasSecret = Boolean(secret) && request.headers.get("authorization") === `Bearer ${secret}`;
  const isVercelCron = request.headers.get("x-vercel-cron") !== null;
  if (!hasSecret && !isVercelCron) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminSupabaseClient();
  const settings = await getConsultationSettings();
  const errors: string[] = [];

  const released = await supabase.rpc("release_expired_holds");
  if (released.error) errors.push(`release_expired_holds: ${released.error.message}`);

  const generated = await supabase.rpc("generate_slots", { p_days: Math.max(28, settings.horizonDays + 1) });
  if (generated.error) errors.push(`generate_slots: ${generated.error.message}`);

  const now = Date.now();
  const reminders = { sent24h: 0, sent1h: 0, failed: 0 };

  // 24 hours: due once the call is a day away, skipped if it is already
  // under 3 hours (the 1-hour reminder covers it) or was booked in the last
  // 2 hours (the confirmation has only just arrived).
  const { data: due24 } = await supabase
    .from("appointments")
    .select("id, lead_id, starts_at, join_url")
    .eq("status", "scheduled")
    .is("reminder_24h_at", null)
    .gt("starts_at", new Date(now + 3 * HOUR).toISOString())
    .lte("starts_at", new Date(now + 25 * HOUR).toISOString())
    .lt("created_at", new Date(now - 2 * HOUR).toISOString());

  // 1 hour: hourly runs mean "within the next 90 minutes" lands it at 30–90
  // minutes before; a late run still sends it, as long as the call is ahead.
  const { data: due1 } = await supabase
    .from("appointments")
    .select("id, lead_id, starts_at, join_url")
    .eq("status", "scheduled")
    .is("reminder_1h_at", null)
    .gt("starts_at", new Date(now).toISOString())
    .lte("starts_at", new Date(now + 90 * 60_000).toISOString());

  for (const [when, rows] of [["24h", due24 ?? []], ["1h", due1 ?? []]] as const) {
    const column = when === "24h" ? "reminder_24h_at" : "reminder_1h_at";
    for (const appt of rows) {
      // Claim first: only the run whose update matched sends.
      const { data: claimed } = await supabase
        .from("appointments")
        .update(when === "24h" ? { reminder_24h_at: new Date().toISOString() } : { reminder_1h_at: new Date().toISOString() })
        .eq("id", appt.id)
        .is(column, null)
        .select("id")
        .maybeSingle();
      if (!claimed) continue;

      const { data: lead } = appt.lead_id
        ? await supabase.from("leads").select("full_name, email, is_test").eq("id", appt.lead_id).maybeSingle()
        : { data: null };
      if (lead?.is_test) continue;

      const sent = await sendConsultationEmail({
        kind: "reminder",
        when,
        toEmail: lead?.email ?? null,
        name: lead?.full_name ?? null,
        startsAt: appt.starts_at,
        joinUrl: appt.join_url,
        guidelinesMarkdown: settings.guidelinesMarkdown,
      });
      if (sent.ok) {
        if (when === "24h") reminders.sent24h++;
        else reminders.sent1h++;
      } else {
        reminders.failed++;
        // Un-claim so the next run tries again, while it is still in time.
        await supabase
          .from("appointments")
          .update(when === "24h" ? { reminder_24h_at: null } : { reminder_1h_at: null })
          .eq("id", appt.id);
        errors.push(`reminder ${when} ${appt.id}: ${sent.message}`);
      }

      if (when === "1h" && !appt.join_url) {
        await notifyStudio({
          title: "Consultation within the hour has no video link",
          body: `${lead?.full_name ?? "A client"} is booked for ${formatSlot(appt.starts_at)} and has no link. Paste one in Studio → Consultations, or send it on WhatsApp.`,
          leadId: appt.lead_id,
          href: "/studio/consultations",
        });
      }
    }
  }

  // Feedback: once, between 1 hour and 3 days after the call. Not for a
  // cancelled call or one the client missed.
  const feedback = { sent: 0, failed: 0 };
  const { data: ended } = await supabase
    .from("appointments")
    .select("id, lead_id, starts_at, practitioner_id")
    .in("status", ["scheduled", "completed"])
    .is("feedback_requested_at", null)
    .lt("ends_at", new Date(now - HOUR).toISOString())
    .gt("ends_at", new Date(now - 72 * HOUR).toISOString())
    .limit(50);
  for (const appt of ended ?? []) {
    const { data: claimed } = await supabase
      .from("appointments")
      .update({ feedback_requested_at: new Date().toISOString() })
      .eq("id", appt.id)
      .is("feedback_requested_at", null)
      .select("id")
      .maybeSingle();
    if (!claimed) continue;
    const [{ data: lead }, { data: profile }] = await Promise.all([
      appt.lead_id
        ? supabase.from("leads").select("full_name, email, is_test").eq("id", appt.lead_id).maybeSingle()
        : Promise.resolve({ data: null }),
      supabase.from("practitioner_profiles").select("full_name").eq("id", appt.practitioner_id).maybeSingle(),
    ]);
    if (!lead || lead.is_test) continue;
    const sent = await sendConsultationEmail({
      kind: "feedback",
      toEmail: lead.email,
      name: lead.full_name,
      startsAt: appt.starts_at,
      practitionerName: profile?.full_name ?? "your practitioner",
      feedbackUrl: feedbackUrl(getPublicAppUrl(), appt.id),
    });
    if (sent.ok) feedback.sent++;
    else {
      feedback.failed++;
      errors.push(`feedback ${appt.id}: ${sent.message}`);
    }
  }

  // Rooms: the day after the call, or as soon as it is cancelled.
  const bridges = { deleted: 0, failed: 0, skipped: 0 };
  const { data: rooms } = await supabase
    .from("appointments")
    .select("id, provider_ref, status, ends_at")
    .not("provider_ref", "is", null)
    .is("bridge_deleted_at", null)
    .or(`status.eq.cancelled,ends_at.lt.${new Date(now - 24 * HOUR).toISOString()}`)
    .limit(50);
  for (const room of rooms ?? []) {
    if (!ringCentralConfigured()) {
      bridges.skipped++;
      continue;
    }
    if (await deleteBridge(room.provider_ref!)) {
      await supabase.from("appointments").update({ bridge_deleted_at: new Date().toISOString() }).eq("id", room.id);
      bridges.deleted++;
    } else {
      bridges.failed++;
    }
  }
  if (bridges.failed) errors.push(`${bridges.failed} RingCentral rooms could not be deleted; retried next hour.`);
  if (bridges.skipped) errors.push(`${bridges.skipped} rooms are due for deletion but RingCentral is not configured.`);

  const body = {
    ok: errors.length === 0,
    released: released.data ?? 0,
    generated: generated.data ?? 0,
    reminders,
    feedback,
    bridges,
    errors,
  };
  if (errors.length) console.error("[cron/consultations]", errors.join(" | "));
  return NextResponse.json(body);
}

export const POST = GET;
