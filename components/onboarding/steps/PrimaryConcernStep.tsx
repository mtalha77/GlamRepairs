"use client";

import {
  StepBody,
  StepChoiceList,
  StepFilledChoiceCard,
  StepHeader,
  StepRequiredError,
} from "@/components/steps";
import { useFunnelStore } from "@/lib/funnel/useFunnelStore";
import {
  useStepAnswer,
  useStepGate,
  useStepRequiredError,
} from "@/lib/funnel/useStepAnswer";

const inputClassName =
  "w-full rounded-2xl border border-brand-border-light/70 bg-white px-4 py-3.5 text-sm text-brand-ink shadow-sm outline-none transition-colors placeholder:text-brand-gray/45 focus:border-brand-primary sm:py-4 sm:text-[15px]";

type PrimaryConcern =
  | "acne-breakouts"
  | "dark-spots"
  | "dryness"
  | "oiliness"
  | "uneven-tone"
  | "acne-scars"
  | "sensitivity"
  | "fine-lines"
  | "other";

const MAX_SELECTIONS = 3;
const ANSWER_KEY = "onboarding.primaryConcern";

const primaryConcernOptions: {
  value: PrimaryConcern;
  label: string;
  icon?: string;
}[] = [
  {
    value: "acne-breakouts",
    label: "Acne & breakouts",
    icon: "/svgs/Group 2085660911.svg",
  },
  {
    value: "dark-spots",
    label: "Dark spots & pigmentation",
    icon: "/svgs/Group 2085660913.svg",
  },
  {
    value: "dryness",
    label: "Dryness & flakiness",
    icon: "/svgs/skin_concern.svg",
  },
  {
    value: "oiliness",
    label: "Oiliness & large pores",
    icon: "/svgs/Group 2085660914.svg",
  },
  {
    value: "uneven-tone",
    label: "Uneven skin tone",
    icon: "/svgs/Group 2085660783.svg",
  },
  {
    value: "acne-scars",
    label: "Acne scars & marks",
    icon: "/svgs/Vector (5).svg",
  },
  {
    value: "sensitivity",
    label: "Sensitivity & redness",
    icon: "/svgs/Group 2085660912.svg",
  },
  {
    value: "fine-lines",
    label: "Fine lines & dullness",
    icon: "/svgs/Group (3).svg",
  },
  {
    value: "other",
    label: "Other (describe below)",
  },
];

function normalizeConcerns(value: unknown): PrimaryConcern[] {
  if (Array.isArray(value)) {
    return value.filter((item): item is PrimaryConcern => typeof item === "string");
  }
  if (typeof value === "string" && value.length > 0) {
    return [value as PrimaryConcern];
  }
  return [];
}

export default function PrimaryConcernStep() {
  const rawAnswer = useFunnelStore((state) => state.answers[ANSWER_KEY]);
  const setAnswer = useFunnelStore((state) => state.setAnswer);
  const selectedConcerns = normalizeConcerns(rawAnswer);
  const [otherDescription, setOtherDescription] = useStepAnswer<string>(
    "onboarding.primaryConcernOther",
    "",
  );

  const includesOther = selectedConcerns.includes("other");
  const otherMissing = includesOther && otherDescription.trim().length === 0;
  useStepGate(
    selectedConcerns.length > 0 &&
      selectedConcerns.length <= MAX_SELECTIONS &&
      !otherMissing,
  );
  const selectionError = useStepRequiredError(
    selectedConcerns.length === 0,
    "Please select at least 1 concern.",
  );
  const otherError = useStepRequiredError(
    otherMissing,
    "Please describe your concern.",
  );

  const setSelectedConcerns = (next: PrimaryConcern[]) => {
    setAnswer(ANSWER_KEY, next);
  };

  const toggleConcern = (value: PrimaryConcern) => {
    if (selectedConcerns.includes(value)) {
      setSelectedConcerns(selectedConcerns.filter((item) => item !== value));
      return;
    }

    if (selectedConcerns.length >= MAX_SELECTIONS) return;

    setSelectedConcerns([...selectedConcerns, value]);
  };

  return (
    <div>
      <StepHeader
        eyebrow="Primary Concern"
        title="What is your main skin concern right now?"
      />

      <StepBody>
        <StepChoiceList>
          {primaryConcernOptions.map((option) => (
            <StepFilledChoiceCard
              key={option.value}
              label={option.label}
              icon={option.icon}
              reserveIconSpace={!option.icon}
              selected={selectedConcerns.includes(option.value)}
              onSelect={() => toggleConcern(option.value)}
            />
          ))}
        </StepChoiceList>
        <StepRequiredError message={selectionError} />

        {includesOther ? (
          <div className="mt-4 sm:mt-5">
            <label htmlFor="other-concern" className="sr-only">
              Describe your concern
            </label>
            <textarea
              id="other-concern"
              name="otherConcern"
              rows={3}
              placeholder="Describe your main skin concern"
              value={otherDescription}
              onChange={(event) => setOtherDescription(event.target.value)}
              className={`${inputClassName} resize-none`}
            />
            <StepRequiredError
              id="other-concern-error"
              message={otherError}
            />
          </div>
        ) : null}

        <p className="mt-5 text-sm leading-relaxed text-brand-gray sm:mt-6 sm:text-[0.9375rem]">
          Select up to 3 concerns.
        </p>
      </StepBody>
    </div>
  );
}
