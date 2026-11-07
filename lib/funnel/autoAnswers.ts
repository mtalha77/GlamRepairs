/**
 * Handover 70 Part 1: answers the funnel captures by itself on arrival.
 *
 * Timezone, the practitioner a card link chose and a practitioner's
 * referral cookie are worth keeping, but none of them is something the
 * visitor typed. A lead row is created only once there is something the
 * visitor entered; until then the browser store is the only record, and it
 * carries these along to the first real write.
 *
 * The database enforces the same rule (lead_needs_a_real_answer), so this
 * list must match public.lead_has_real_answer().
 */
export const AUTO_ANSWER_KEYS: ReadonlySet<string> = new Set([
  "onboarding.timezone",
  "onboarding.referredBy",
  "onboarding.preferredPractitioner",
  "onboarding.country",
  "onboarding.utm",
]);

export function hasUserEnteredValue(input: {
  email?: string | null;
  phone?: string | null;
  fullName?: string | null;
  answers?: Record<string, unknown> | null;
}): boolean {
  if (input.email?.trim() || input.phone?.trim() || input.fullName?.trim()) return true;
  return Object.keys(input.answers ?? {}).some((k) => !AUTO_ANSWER_KEYS.has(k));
}
