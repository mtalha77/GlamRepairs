import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

import { getPublicAppUrl } from "@/lib/leads/photoShortLink";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/database.types";

/**
 * The screening assessment — HANDOVER-56, spec 20 October §6.3.
 *
 * The database does the marking: start_assessment() picks the questions and
 * starts the clock, submit_assessment() scores and raises integrity flags.
 * Both are service role only, and the question bank (with its answer key)
 * is never readable from a browser. This file is the bridge: a signed link
 * per application, and the two views of an attempt, the candidate's (no
 * answers, ever) and the studio's.
 *
 * One start per link sent. Each time the studio sends the link, the
 * candidate may start once; an abandoned attempt still uses it up, so the
 * questions cannot be previewed and restarted. The database separately caps
 * submissions at two.
 */

export const ASSESSMENT_MINUTES = 20;
export const ASSESSMENT_QUESTIONS = 12;
/** Answers arriving this long after the clock runs out are still accepted: the network is not the candidate's fault. */
export const GRACE_SECONDS = 30;

type Attempt = Database["public"]["Tables"]["assessment_attempts"]["Row"];

function key(): string {
  const k = process.env.APPLICATION_LINK_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!k) throw new Error("No key available to sign assessment links.");
  return k;
}

export function signAssessment(applicationId: string): string {
  return createHmac("sha256", key()).update(`application-assessment:${applicationId}`).digest("base64url");
}

export function verifyAssessment(applicationId: string, signature: string): boolean {
  const expected = Buffer.from(signAssessment(applicationId));
  const given = Buffer.from(signature);
  return expected.length === given.length && timingSafeEqual(expected, given);
}

export function assessmentUrl(applicationId: string): string {
  return `${getPublicAppUrl()}/join/assessment?a=${applicationId}&s=${signAssessment(applicationId)}`;
}

async function attemptsFor(applicationId: string): Promise<Attempt[]> {
  const { data } = await createAdminSupabaseClient()
    .from("assessment_attempts")
    .select("*")
    .eq("application_id", applicationId)
    .order("started_at", { ascending: false });
  return data ?? [];
}

const isOpen = (a: Attempt) => !a.submitted_at && !a.invalidated_at;

/**
 * Close an attempt whose clock ran out without a submission: score what was
 * answered. Fairer than voiding it, and a closed tab is not a reason to lose
 * eleven good answers.
 */
export async function closeIfExpired(attempt: Attempt): Promise<boolean> {
  if (!isOpen(attempt)) return false;
  if (Date.now() < new Date(attempt.expires_at).getTime() + GRACE_SECONDS * 1000) return false;
  await finishAttempt(attempt.id, attempt.expires_at);
  return true;
}

/** Record timing, then let the database mark it. */
export async function finishAttempt(attemptId: string, endedAt?: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const admin = createAdminSupabaseClient();
  const { data: attempt } = await admin.from("assessment_attempts").select("*").eq("id", attemptId).maybeSingle();
  if (!attempt) return { ok: false, error: "Attempt not found." };
  if (attempt.submitted_at) return { ok: true };

  const started = new Date(attempt.started_at).getTime();
  const end = Math.min(new Date(endedAt ?? Date.now()).getTime(), new Date(attempt.expires_at).getTime() + GRACE_SECONDS * 1000);
  const { data: answers } = await admin
    .from("assessment_answers")
    .select("answered_at")
    .eq("attempt_id", attemptId)
    .not("answered_at", "is", null)
    .order("answered_at");
  // The longest silence between one answer and the next, counting from the start.
  let previous = started;
  let longest = 0;
  for (const a of answers ?? []) {
    const t = new Date(a.answered_at!).getTime();
    longest = Math.max(longest, t - previous);
    previous = t;
  }
  await admin
    .from("assessment_attempts")
    .update({
      total_seconds: Math.max(0, Math.round((end - started) / 1000)),
      longest_gap_seconds: Math.round(longest / 1000),
    })
    .eq("id", attemptId);

  const { error } = await admin.rpc("submit_assessment", { p_attempt: attemptId });
  if (error && !error.message.includes("already submitted")) return { ok: false, error: error.message };
  return { ok: true };
}

export type CandidateQuestion = { id: string; prompt: string; options: { key: string; label: string }[] };

export type CandidateState =
  | { kind: "invalid" }
  | { kind: "closed"; reason: "decided" | "not_this_stage" }
  | { kind: "ready"; name: string; attemptNo: number }
  | { kind: "used"; name: string }
  | {
      kind: "running";
      name: string;
      attemptId: string;
      expiresAt: string;
      questions: CandidateQuestion[];
      answers: Record<string, string>;
    }
  | { kind: "done"; name: string };

/** What the candidate may see. Never the correct key, never the score. */
export async function candidateState(a: string | undefined, s: string | undefined): Promise<CandidateState> {
  if (!a || !s || !/^[0-9a-f-]{36}$/i.test(a) || !verifyAssessment(a, s)) return { kind: "invalid" };
  const admin = createAdminSupabaseClient();
  const { data: app } = await admin
    .from("practitioner_applications")
    .select("id, full_name, status, assessment_sent_at")
    .eq("id", a)
    .is("deleted_at", null)
    .maybeSingle();
  if (!app) return { kind: "invalid" };
  if (["approved", "rejected", "withdrawn"].includes(app.status)) return { kind: "closed", reason: "decided" };
  const name = app.full_name.split(/\s+/)[0] ?? app.full_name;

  let attempts = await attemptsFor(app.id);
  const open = attempts.find(isOpen);
  if (open && (await closeIfExpired(open))) attempts = await attemptsFor(app.id);
  const running = attempts.find(isOpen);

  if (running) {
    const [{ data: questions }, { data: answers }] = await Promise.all([
      admin.from("assessment_questions").select("id, prompt, options").in("id", running.question_ids),
      admin.from("assessment_answers").select("question_id, chosen_key").eq("attempt_id", running.id),
    ]);
    const byId = new Map((questions ?? []).map((q) => [q.id, q]));
    return {
      kind: "running",
      name,
      attemptId: running.id,
      expiresAt: running.expires_at,
      questions: running.question_ids
        .map((id) => byId.get(id))
        .filter((q): q is NonNullable<typeof q> => Boolean(q))
        .map((q) => ({
          id: q.id,
          prompt: q.prompt,
          options: Object.entries(q.options)
            .sort(([x], [y]) => x.localeCompare(y))
            .map(([key, label]) => ({ key, label })),
        })),
      answers: Object.fromEntries((answers ?? []).filter((x) => x.chosen_key).map((x) => [x.question_id, x.chosen_key!])),
    };
  }

  // One start per link sent.
  const sentAt = app.assessment_sent_at ? new Date(app.assessment_sent_at).getTime() : null;
  const startedSinceSent = attempts.some((t) => sentAt !== null && new Date(t.started_at).getTime() >= sentAt);
  const submitted = attempts.filter((t) => t.submitted_at).length;

  if (startedSinceSent) return attempts[0]?.submitted_at ? { kind: "done", name } : { kind: "used", name };
  if (app.status !== "test_assessment" || sentAt === null) return { kind: "closed", reason: "not_this_stage" };
  if (submitted >= 2) return { kind: "done", name };
  return { kind: "ready", name, attemptNo: submitted + 1 };
}

// ── The studio's view ──────────────────────────────────────────────────

export type StudioAttempt = {
  id: string;
  attemptNo: number;
  startedAt: string;
  state: "in_progress" | "submitted" | "abandoned";
  score: number | null;
  maxScore: number;
  percent: number | null;
  passed: boolean | null;
  passMark: number;
  minutes: number | null;
  flagged: boolean;
  flagReason: string | null;
  blurEvents: number;
  answers: { prompt: string; chosen: string | null; correct: string; right: boolean; rationale: string }[];
};

export async function studioAssessment(applicationId: string): Promise<StudioAttempt[]> {
  const admin = createAdminSupabaseClient();
  let attempts = await attemptsFor(applicationId);
  if (!attempts.length) return [];
  const open = attempts.find(isOpen);
  if (open && (await closeIfExpired(open))) attempts = await attemptsFor(applicationId);
  const ids = [...new Set(attempts.flatMap((t) => t.question_ids))];
  const [{ data: questions }, { data: answers }] = await Promise.all([
    admin.from("assessment_questions").select("id, prompt, options, correct_key, rationale").in("id", ids),
    admin
      .from("assessment_answers")
      .select("attempt_id, question_id, chosen_key, correct")
      .in(
        "attempt_id",
        attempts.map((t) => t.id),
      ),
  ]);
  const q = new Map((questions ?? []).map((x) => [x.id, x]));

  return attempts.map((t) => {
    const mine = new Map((answers ?? []).filter((x) => x.attempt_id === t.id).map((x) => [x.question_id, x]));
    return {
      id: t.id,
      attemptNo: t.attempt_no,
      startedAt: t.started_at,
      state: t.submitted_at ? "submitted" : t.invalidated_at ? "abandoned" : "in_progress",
      score: t.score,
      maxScore: t.max_score,
      percent: t.score !== null && t.max_score ? Math.round((t.score / t.max_score) * 100) : null,
      passed: t.passed,
      passMark: t.pass_mark,
      minutes: t.total_seconds !== null ? Math.max(1, Math.round(t.total_seconds / 60)) : null,
      flagged: t.flagged,
      flagReason: t.flag_reason,
      blurEvents: t.blur_events,
      answers: t.submitted_at
        ? t.question_ids.flatMap((id) => {
            const question = q.get(id);
            if (!question) return [];
            const answer = mine.get(id);
            return [
              {
                prompt: question.prompt,
                chosen: answer?.chosen_key ? (question.options[answer.chosen_key] ?? answer.chosen_key) : null,
                correct: question.options[question.correct_key] ?? question.correct_key,
                right: Boolean(answer?.correct),
                rationale: question.rationale,
              },
            ];
          })
        : [],
    };
  });
}
