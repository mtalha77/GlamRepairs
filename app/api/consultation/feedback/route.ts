import { NextResponse } from "next/server";

import { feedbackTarget, verifyFeedback } from "@/lib/consultation/feedback";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

/** Saves a client's feedback once per consultation — HANDOVER-52 §3.6. */
export const dynamic = "force-dynamic";

const score = (v: unknown) => {
  const n = Number(v);
  return Number.isInteger(n) && n >= 1 && n <= 5 ? n : null;
};

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const id = typeof body?.a === "string" ? body.a : "";
  const sig = typeof body?.k === "string" ? body.k : "";
  if (!verifyFeedback(id, sig)) return NextResponse.json({ ok: false, error: "This link is not valid." }, { status: 403 });

  const target = await feedbackTarget(id);
  if (!target) return NextResponse.json({ ok: false, error: "There is no consultation to rate for this link." }, { status: 404 });
  if (target.answered) return NextResponse.json({ ok: false, error: "Thank you, we already have your feedback." }, { status: 409 });

  const rating = score(body?.rating);
  if (!rating) return NextResponse.json({ ok: false, error: "Please choose a rating." }, { status: 422 });
  const comment = typeof body?.comment === "string" ? body.comment.trim().slice(0, 1500) : "";

  const { error } = await createAdminSupabaseClient().from("consultation_feedback").insert({
    appointment_id: id,
    rating,
    felt_heard: score(body?.feltHeard),
    would_return: typeof body?.wouldReturn === "boolean" ? body.wouldReturn : null,
    comment: comment || null,
    publishable: body?.publishable === true && comment.length > 0,
  });
  if (error) {
    if (error.code === "23505") return NextResponse.json({ ok: false, error: "Thank you, we already have your feedback." }, { status: 409 });
    console.error("[api/consultation/feedback]", error.message);
    return NextResponse.json({ ok: false, error: "Something went wrong. Please try again." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
