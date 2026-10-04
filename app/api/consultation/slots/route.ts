import { NextResponse } from "next/server";

import { getConsultationSettings, listBookableSlots, slotForSession } from "@/lib/consultation/slots";

/**
 * The picker's grid — HANDOVER-50 §5. Open slots past the lead time and
 * inside the horizon, plus the slot this funnel session already holds, so a
 * returning client sees their own pick rather than a gap. Never cached: a
 * stale grid is how two people end up choosing the same time.
 */
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const sessionId = new URL(request.url).searchParams.get("sessionId")?.trim() ?? "";
  const settings = await getConsultationSettings();
  const [slots, mine] = await Promise.all([
    listBookableSlots(settings),
    sessionId ? slotForSession(sessionId) : Promise.resolve({ eligible: false, slot: null }),
  ]);
  return NextResponse.json(
    { ok: true, slots, held: mine.slot, eligible: mine.eligible, holdMinutes: settings.holdMinutes },
    { headers: { "Cache-Control": "no-store" } },
  );
}
