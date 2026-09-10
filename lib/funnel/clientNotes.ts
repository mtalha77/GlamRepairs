/**
 * HANDOVER-18 §2 — the client's free-text note at the photo step.
 *
 * ── Why it is optional ───────────────────────────────────────────────────
 * It sits at the highest-friction step in a 25-step funnel, immediately
 * after uploading photographs of your own face. A required field here would
 * cost completions, and the people with something to say will say it.
 *
 * ── Why it is worth more than it looks ───────────────────────────────────
 * Photographs miss things: texture, itch, tightness, what changed recently,
 * what a product did. The practitioner is reading a still image with no way
 * to ask a follow-up question, and this is the only channel for that.
 *
 * It is also where safety information appears. "It burns when I use
 * anything", "I was using a fairness cream until last month", "it's
 * spreading" are exactly the details that should trigger a referral rather
 * than a routine, and none of them appear in a structured questionnaire or
 * are visible in a photo. That is why the studio surfaces this near the top
 * of the case rather than below the answers.
 */

/** The answer key, shared by the step, the store and the progress payload. */
export const CLIENT_NOTES_ANSWER_KEY = "onboarding.clientNotes";

export const CLIENT_NOTES_MAX_LENGTH = 600;

/**
 * Shown under the field. Concrete prompts, because "anything else?" produces
 * "no" and a list of examples produces the sentence that changes the advice.
 */
export const CLIENT_NOTES_HINTS = [
  "itching or burning",
  "recent product changes",
  "anything spreading or painful",
  "how your skin feels, not just how it looks",
];

/**
 * Pull the note out of a funnel answers blob.
 *
 * Both write paths need this: the progressive save passes it explicitly,
 * and the final submit only ever carries `answers`. Deriving it in one
 * place means the note cannot be persisted by one path and dropped by the
 * other — which is exactly what would happen now that
 * `sanitizeLeadAnswers` removes it from the blob before storage.
 */
export function clientNotesFromAnswers(
  answers: Record<string, unknown> | undefined,
): string | null {
  const value = answers?.[CLIENT_NOTES_ANSWER_KEY];
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, CLIENT_NOTES_MAX_LENGTH) : null;
}
