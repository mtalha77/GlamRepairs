import { NextResponse } from "next/server";

import { getConsultationSettings, listBookableSlots, slotForSession } from "@/lib/consultation/slots";
import { consultationPractitionerLine } from "@/lib/practitioners/authorship";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

/** The chosen practitioner, if the slug names one who is public. */
async function chosenPractitioner(slug: string | null) {
  if (!slug || !/^[a-z0-9-]{2,80}$/.test(slug)) return null;
  const { data } = await createAdminSupabaseClient()
    .from("practitioner_public")
    .select("id, display_name, role_title")
    .eq("slug", slug)
    .maybeSingle();
  return data ? { id: data.id as string, line: `${data.display_name}, ${data.role_title}` } : null;
}

/**
 * The picker's grid — HANDOVER-50 §5. Open slots past the lead time and
 * inside the horizon, plus the slot this funnel session already holds, so a
 * returning client sees their own pick rather than a gap. Never cached: a
 * stale grid is how two people end up choosing the same time.
 */
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const sessionId = params.get("sessionId")?.trim() ?? "";
  const [settings, chosen] = await Promise.all([getConsultationSettings(), chosenPractitioner(params.get("practitioner"))]);
  const [slots, mine, practitioner] = await Promise.all([
    listBookableSlots(settings, chosen?.id ?? null),
    sessionId ? slotForSession(sessionId) : Promise.resolve({ eligible: false, slot: null }),
    chosen ? Promise.resolve(chosen.line) : consultationPractitionerLine(),
  ]);
  return NextResponse.json(
    { ok: true, slots, held: mine.slot, eligible: mine.eligible, holdMinutes: settings.holdMinutes, practitioner },
    { headers: { "Cache-Control": "no-store" } },
  );
}
