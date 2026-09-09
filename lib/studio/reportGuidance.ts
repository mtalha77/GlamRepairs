/**
 * HANDOVER-16 Part 2 a/b/d — the sections the template never asked for.
 *
 * The handover's diagnosis is precise: "Fatima's report is well written. The
 * problem is not quality, it is that it stops early. Everything below is
 * content Ayma is already capable of producing; it just is not asked for by
 * the template." So the fix is a template that asks.
 *
 * ── Why these are pre-filled, not blank ─────────────────────────────────
 * A blank textarea labelled "Timeline" gets skipped on a busy day, and the
 * section quietly stops shipping — which is exactly the failure being fixed.
 * Pre-filling with the handover's own wording means the worst case is that
 * the client receives sound generic guidance, and the good case is that it
 * gets tailored in thirty seconds because the words are already there to
 * edit. Every one of these is a starting point, not boilerplate to leave
 * alone.
 *
 * ── Why they are per-report columns, not constants ──────────────────────
 * The timeline for pigmentation is not the timeline for oiliness, and the
 * warning signs for someone on a retinoid are not the warning signs for
 * someone on a gentle cleanser. Storing the text on the row means an old
 * report still reproduces exactly what was sent, even after this default
 * changes.
 */

/**
 * Part 2a. Seven new behaviours at once is how routines fail; this names the
 * two that matter and gives permission to postpone the rest.
 */
export const DEFAULT_START_HERE =
  "If you only do one thing this week: wash your face properly every " +
  "evening and put on sunscreen every morning. Add the rest once those two " +
  "feel automatic.";

/**
 * Part 2b. The last line is the one that matters commercially — it converts
 * "this didn't work" into a message rather than a silent loss.
 */
export const DEFAULT_TIMELINE =
  "Weeks 1-2: skin may feel slightly different as it adjusts. Oiliness will " +
  "not change yet.\n" +
  "Weeks 3-4: less midday shine, fewer clogged pores.\n" +
  "Weeks 6-8: pores look smaller as buildup clears.\n" +
  "If nothing has changed by week 8, message us. That is useful " +
  "information, not failure.";

/** Part 2d, first half. */
export const DEFAULT_GOOD_SIGNS =
  "Less shine by midday, fewer new clogged pores, and skin that feels " +
  "comfortable rather than tight after washing.";

/**
 * Part 2d, second half. This is the safety line, so it is worded as
 * instructions to stop rather than symptoms to interpret.
 */
export const DEFAULT_WARNING_SIGNS =
  "Persistent burning or stinging, spreading redness, or new bumps within " +
  "days of starting something new. Stop what you started and message us.";

/**
 * Part 2e — the weekly photo. Not an editor field: it is the same sentence
 * for everyone, and it feeds `client_progress`, which already exists.
 */
export const PHOTO_PROMPT =
  "Take a photo in the same light, at the same angle, once a week. Skin " +
  "changes too slowly to notice in a mirror, and most people conclude " +
  "nothing is working when it is.";
