import { NextResponse } from "next/server";

import { holdForSession } from "@/lib/consultation/slots";

/**
 * Hold a consultation time for this funnel session — HANDOVER-50 §5.
 *
 * The client sends its session id, never a lead id: the lead is looked up
 * server-side, so nobody can hold a time in someone else's name. A refusal
 * because the slot was taken comes back as 409 with the message the picker
 * shows ("That time was just taken, please choose another.").
 */
export async function POST(request: Request) {
  let body: { sessionId?: string; slotId?: string; fullName?: string; email?: string; selectedPlan?: string | null };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid request." }, { status: 400 });
  }
  const sessionId = body.sessionId?.trim();
  const slotId = body.slotId?.trim();
  if (!sessionId || !slotId || !/^[0-9a-f-]{36}$/i.test(slotId)) {
    return NextResponse.json({ ok: false, message: "Invalid request." }, { status: 400 });
  }
  const result = await holdForSession({
    sessionId,
    slotId,
    fullName: body.fullName,
    email: body.email,
    selectedPlan: body.selectedPlan ?? null,
  });
  if (result.ok) return NextResponse.json(result);
  const status = result.reason === "taken" ? 409 : result.reason === "error" ? 500 : 422;
  return NextResponse.json(result, { status });
}
