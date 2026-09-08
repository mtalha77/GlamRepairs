type OnboardingProgressProps = {
  currentStep: number;
  totalSteps?: number;
  completed?: boolean;
};

export default function OnboardingProgress({
  currentStep,
  totalSteps = 10,
  completed = false,
}: OnboardingProgressProps) {
  const progress = Math.min(Math.max(currentStep / totalSteps, 0), 1);

  return (
    <div className="w-full">
      <div className="mb-2 flex items-center justify-between text-xs font-medium text-brand-gray sm:text-sm">
        <span className={completed ? "font-semibold text-brand-ink" : undefined}>
          {currentStep}/{totalSteps}
        </span>
      </div>
      {/* HANDOVER-11 §3.1 — the fill is a full-width bar scaled on the X
          axis, not a bar whose width changes. Same picture; the transform
          version composites instead of forcing layout on every frame, and
          it is what lets the easing overshoot without the track growing.
          role/aria make the bar mean something to a screen reader, which
          the purely decorative version did not. */}
      <div
        className="h-1.5 w-full overflow-hidden rounded-full bg-brand-lavender/50"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={totalSteps}
        aria-valuenow={currentStep}
        aria-label={`Step ${currentStep} of ${totalSteps}`}
      >
        <div
          className="onboarding-progress-fill h-full w-full rounded-full bg-brand-light"
          style={{ transform: `scaleX(${progress})` }}
        />
      </div>
    </div>
  );
}
