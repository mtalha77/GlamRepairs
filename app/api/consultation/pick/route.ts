import { NextResponse } from "next/server";

import { bookConsultationForLead } from "@/lib/consultation/booking";
import { holdForLeadId, leadFactsById, slotForLead, verifyLeadSignature } from "@/lib/consultation/slots";
import { getPublicAppUrl } from "@/lib/leads/photoShortLink";

/**
 * Choosing a time from a signed link — HANDOVER-50 §1, the row that "will
 * happen": a client paid, but their time was taken after the hold lapsed.
 *
 * The link carries the lead id and an HMAC of it. A paid lead is booked on
 * the spot (hold, then the same booking path the studio uses); an unpaid
 * one only holds, exactly as in the funnel.
 */
export async function POST(request: Request) {
  let body: { l?: string; s?: string; slotId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid request." }, { status: 400 });
  }
  const leadId = body.l?.trim() ?? "";
  const slotId = body.slotId?.trim() ?? "";
  if (!/^[0-9a-f-]{36}$/i.test(leadId) || !/^[0-9a-f-]{36}$/i.test(slotId) || !body.s || !verifyLeadSignature(leadId, body.s)) {
    return NextResponse.json({ ok: false, message: "This link is not valid." }, { status: 403 });
  }
  // Already booked: the link must not let them take a second time.
  const current = await slotForLead(leadId);
  if (current?.status === "booked") {
    return NextResponse.json({ ok: true, booked: true, slot: current, already: true });
  }
  const held = await holdForLeadId(leadId, slotId);
  if (!held.ok) {
    return NextResponse.json(held, { status: held.reason === "taken" ? 409 : 422 });
  }
  const facts = await leadFactsById(leadId);
  const paid = facts?.paymentStatus === "verified" || facts?.paymentStatus === "waived";
  if (!paid) return NextResponse.json({ ok: true, booked: false, slot: held.slot });

  const outcome = await bookConsultationForLead(leadId, { appBase: getPublicAppUrl(request) });
  if (outcome.kind === "booked" || outcome.kind === "already_booked") {
    return NextResponse.json({ ok: true, booked: true, slot: held.slot });
  }
  if (outcome.kind === "lost") {
    return NextResponse.json({ ok: false, reason: "taken", message: "That time was just taken, please choose another." }, { status: 409 });
  }
  return NextResponse.json({ ok: false, message: "We could not book that time. Please message us on WhatsApp." }, { status: 500 });
}
