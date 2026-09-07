/**
 * Single funnel: URL `/onboarding/step/N` matches progress bar `N/TOTAL`.
 */
export const ONBOARDING_FORM_STEPS = 25;

export const ONBOARDING_TOTAL_STEPS = ONBOARDING_FORM_STEPS;

/** @deprecated Use ONBOARDING_TOTAL_STEPS — kept so older imports don't break. */
export const ONBOARDING_INTRO_STEPS = 0;

export const ONBOARDING_PROGRESS = {
  welcome: 1,
  program: 2,
  notAlone: 10,
  planSelection: 21,
  consent: 25,
} as const;

/** Special step numbers (URL `/onboarding/step/N`). */
export const ONBOARDING_FORM = {
  welcome: 1,
  program: 2,
  notAlone: 10,
  treatmentFit: 11,
  specialEvent: 19,
  eventDate: 20,
  planSelection: 21,
  uploadPhotos: 23,
  consent: 25,
} as const;

/** Progress index = URL step (no offset). */
export function getFormStepProgress(formStep: number) {
  return formStep;
}

/** Legacy URLs after card removals. */
export function mapLegacyOnboardingStep(stepNumber: number): number | null {
  // Former consent/plan high steps → current consent
  if (stepNumber >= 26 && stepNumber <= 36) return ONBOARDING_FORM.consent;
  return null;
}
