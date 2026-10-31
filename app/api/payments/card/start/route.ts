import { NextResponse } from "next/server";

import { startCardCheckout, verifyCardPayLink } from "@/lib/payments/cardCheckout";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { getTestSession, scopedSessionId } from "@/lib/testPortal/session";

/**
 * Start a Safepay card checkout (31 October 2026). Identified either by the
 * funnel session that just submitted, or by a signed pay link (emails,
 * studio). Never by a lead id alone, and never with an amount: the amount
 * is read from the lead on the server.
 */
export const dynamic = "force-dynamic";

const REASONS: Record<string, string> = {
  not_configured: "Card payments are not available yet.",
  not_found: "We could not find your assessment.",
  already_paid: "This assessment is already paid.",
  nothing_to_pay: "There is nothing to pay for this assessment.",
  currency: "Card payment is not available in your currency yet.",
  test_lead: "Test submissions cannot be paid by card.",
  error: "The card payment could not be started. Please try again in a moment.",
};

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { sessionId?: string; leadId?: string; s?: string };
  let leadId: string | null = null;

  if (body.leadId && verifyCardPayLink(body.leadId, body.s)) {
    leadId = body.leadId;
  } else if (typeof body.sessionId === "string" && /^[\w-]{6,120}$/.test(body.sessionId)) {
    const session = scopedSessionId(body.sessionId, await getTestSession());
    const { data } = await createAdminSupabaseClient()
      .from("leads")
      .select("id")
      .eq("session_id", session)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    leadId = data?.id ?? null;
  }
  if (!leadId) return NextResponse.json({ ok: false, message: REASONS.not_found }, { status: 404 });

  const result = await startCardCheckout(leadId);
  if (!result.ok) {
    return NextResponse.json({ ok: false, message: REASONS[result.reason] ?? REASONS.error }, { status: 400 });
  }
  return NextResponse.json({ ok: true, url: result.url });
}
