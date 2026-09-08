"use client";

import {
  StepBody,
  StepChoiceList,
  StepFilledChoiceCard,
  StepHeader,
  StepRequiredError,
} from "@/components/steps";
import {
  useStepAnswer,
  useStepGate,
  useStepRequiredError,
} from "@/lib/funnel/useStepAnswer";

const inputClassName =
  "w-full rounded-2xl border border-brand-border-light/70 bg-white px-4 py-3.5 text-sm text-brand-ink shadow-sm outline-none transition-colors placeholder:text-brand-gray/45 focus:border-brand-primary sm:py-4 sm:text-[15px]";

const labelClassName = "mb-2 block text-sm text-brand-ink sm:text-[0.9375rem]";

type DurationOption =
  | "under-1-month"
  | "1-6-months"
  | "about-a-year"
  | "several-years"
  | "most-of-life";

const durationOptions: { value: DurationOption; label: string }[] = [
  { value: "under-1-month", label: "Just started (under 1 month)" },
  { value: "1-6-months", label: "A few months (1–6 months)" },
  { value: "about-a-year", label: "About a year" },
  { value: "several-years", label: "Several years" },
  { value: "most-of-life", label: "Most of my life" },
];

export default function ConcernDurationStep() {
  const [selectedDuration, setSelectedDuration] = useStepAnswer<DurationOption | null>(
    "onboarding.concernDuration",
    null,
  );
  const [worseningFactors, setWorseningFactors] = useStepAnswer<string>(
    "onboarding.worseningFactors",
    "",
  );
  useStepGate(selectedDuration !== null);
  const error = useStepRequiredError(
    selectedDuration === null,
    "Please select how long you have been dealing with this.",
  );

  return (
    <div>
      <StepHeader
        eyebrow="Concern Duration"
        title="How long have you been dealing with this?"
      />

      <StepBody>
        <StepChoiceList>
          {durationOptions.map((option) => (
            <StepFilledChoiceCard
              key={option.value}
              label={option.label}
              selected={selectedDuration === option.value}
              onSelect={() => setSelectedDuration(option.value)}
            />
          ))}
        </StepChoiceList>
        <StepRequiredError message={error} />

        <div className="mt-6 sm:mt-7">
          <label htmlFor="worsening-factors" className={labelClassName}>
            Is there anything that makes it worse? (e.g. stress, food, season, products)
          </label>
          <textarea
            id="worsening-factors"
            name="worseningFactors"
            rows={3}
            placeholder="Optional — share anything that triggers or worsens your concern"
            value={worseningFactors}
            onChange={(event) => setWorseningFactors(event.target.value)}
            className={`${inputClassName} resize-none`}
          />
        </div>
      </StepBody>
    </div>
  );
}
