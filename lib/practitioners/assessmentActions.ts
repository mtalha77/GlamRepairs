"use server";

import { revalidatePath } from "next/cache";

import {
  ASSESSMENT_MINUTES,
  ASSESSMENT_QUESTIONS,
  candidateState,
  finishAttempt,
  GRACE_SECONDS,
  verifyAssessment,
} from "@/lib/practitioners/assessment";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

/**
 * The candidate's side of the screening assessment. Every call carries the
 * signed link (a, s) and is checked again here: the page that rendered the
 * buttons proves nothing about who presses them.
 */

type Result = { ok: true } | { ok: false; error: string };
type Link = { a: string; s: string };

async function liveAttempt(link: Link, attemptId: string) {
  if (!verifyAssessment(link.a, link.s)) return null;
  const { data } = await createAdminSupabaseClient()
    .from("assessment_attempts")
    .select("*")
    .eq("id", attemptId)
    .eq("application_id", link.a)
    .is("submitted_at", null)
    .is("invalidated_at", null)
    .maybeSingle();
  return data;
}

export async function startAssessment(link: Link): Promise<Result> {
  const state = await candidateState(link.a, link.s);
  if (state.kind === "running") return { ok: true };
  if (state.kind !== "ready") return { ok: false, error: "This assessment cannot be started from this link." };
  const { error } = await createAdminSupabaseClient().rpc("start_assessment", {
    p_app: link.a,
    p_minutes: ASSESSMENT_MINUTES,
    p_count: ASSESSMENT_QUESTIONS,
  });
  if (error) return { ok: false, error: "The assessment could not be started. Please try again in a minute." };
  revalidatePath("/join/assessment");
  return { ok: true };
}

export async function saveAssessmentAnswer(
  link: Link & { attemptId: string; questionId: string; key: string; seconds: number },
): Promise<Result> {
  const attempt = await liveAttempt(link, link.attemptId);
  if (!attempt) return { ok: false, error: "This attempt has closed." };
  if (Date.now() > new Date(attempt.expires_at).getTime() + GRACE_SECONDS * 1000) return { ok: false, error: "Time is up." };
  if (!attempt.question_ids.includes(link.questionId)) return { ok: false, error: "Unknown question." };
  if (!/^[a-z]$/i.test(link.key)) return { ok: false, error: "Unknown option." };

  const admin = createAdminSupabaseClient();
  const seconds = Math.max(0, Math.min(Math.round(link.seconds) || 0, ASSESSMENT_MINUTES * 60));
  const { data: existing } = await admin
    .from("assessment_answers")
    .select("chosen_key, seconds_spent, changed_count")
    .eq("attempt_id", attempt.id)
    .eq("question_id", link.questionId)
    .maybeSingle();
  const now = new Date().toISOString();
  const { error } = existing
    ? await admin
        .from("assessment_answers")
        .update({
          chosen_key: link.key,
          seconds_spent: (existing.seconds_spent ?? 0) + seconds,
          changed_count: existing.chosen_key && existing.chosen_key !== link.key ? existing.changed_count + 1 : existing.changed_count,
          answered_at: now,
        })
        .eq("attempt_id", attempt.id)
        .eq("question_id", link.questionId)
    : await admin
        .from("assessment_answers")
        .insert({ attempt_id: attempt.id, question_id: link.questionId, chosen_key: link.key, seconds_spent: seconds, answered_at: now });
  return error ? { ok: false, error: "That answer did not save. Please choose it again." } : { ok: true };
}

/** Leaving the tab, or pasting. Recorded and shown to a person; never decides anything on its own. */
export async function recordAssessmentEvent(link: Link & { attemptId: string; kind: "blur" | "paste" }): Promise<Result> {
  const attempt = await liveAttempt(link, link.attemptId);
  if (!attempt) return { ok: false, error: "This attempt has closed." };
  const update =
    link.kind === "blur"
      ? { blur_events: Math.min(attempt.blur_events + 1, 32000) }
      : { paste_events: Math.min(attempt.paste_events + 1, 32000) };
  await createAdminSupabaseClient().from("assessment_attempts").update(update).eq("id", attempt.id);
  return { ok: true };
}

export async function submitAssessment(link: Link & { attemptId: string }): Promise<Result> {
  const attempt = await liveAttempt(link, link.attemptId);
  if (!attempt) return { ok: true }; // already in
  const done = await finishAttempt(attempt.id);
  revalidatePath("/join/assessment");
  return done.ok ? done : { ok: false, error: "Your answers are saved, but the submission did not go through. Please press submit again." };
}
