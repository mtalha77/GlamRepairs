/**
 * Single funnel: URL `/onboarding/step/N` matches progress bar `N/TOTAL`.
 */
export const ONBOARDING_FORM_STEPS = 26;

export const ONBOARDING_TOTAL_STEPS = ONBOARDING_FORM_STEPS;

/** @deprecated Use ONBOARDING_TOTAL_STEPS — kept so older imports don't break. */
export const ONBOARDING_INTRO_STEPS = 0;

export const ONBOARDING_PROGRESS = {
  welcome: 1,
  earlyPlanSelection: 2,
  program: 3,
  notAlone: 11,
  planSelection: 22,
  consent: 26,
} as const;

/** Special step numbers (URL `/onboarding/step/N`). */
export const ONBOARDING_FORM = {
  welcome: 1,
  /**
   * HANDOVER-22 §4 — plan selection moved to the front.
   *
   * It used to sit at step 21, which meant someone could invest twenty
   * steps before finding out the price. Two of the three real abandonments
   * happened at steps 17 and 19 — immediately before that reveal. Asking
   * while the user has invested almost nothing removes the fear that drives
   * the late drop-off.
   *
   * Skipped entirely when the plan arrived from a pricing CTA (`?plan=`);
   * nobody should be asked the same question twice.
   */
  earlyPlanSelection: 2,
  program: 3,
  notAlone: 11,
  treatmentFit: 12,
  specialEvent: 20,
  eventDate: 21,
  /** Kept as a confirmation before payment, not a first choice. */
  planSelection: 22,
  uploadPhotos: 24,
  consent: 26,
} as const;

/** Progress index = URL step (no offset). */
export function getFormStepProgress(formStep: number) {
  return formStep;
}

/** Legacy URLs after card removals. */
export function mapLegacyOnboardingStep(stepNumber: number): number | null {
  // Former consent/plan high steps → current consent. The lower bound moved
  // from 26 to 27 when HANDOVER-22 §4 inserted a step and made 26 the real
  // consent step; leaving it at 26 would have redirected consent to itself.
  if (stepNumber >= 27 && stepNumber <= 36) return ONBOARDING_FORM.consent;
  return null;
}
