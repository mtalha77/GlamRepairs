"use client";

import {
  StepBody,
  StepChoiceCard,
  StepChoiceList,
  StepHeader,
} from "@/components/steps";
import { useStepAnswer, useStepGate } from "@/lib/funnel/useStepAnswer";

type AdditionalConcern =
  | "dryness"
  | "oiliness"
  | "textural"
  | "puffy-eyes"
  | "crows-feet"
  | "double-chin"
  | "dark-circles"
  | "sagging-skin";

type ConcernOption = {
  value: AdditionalConcern;
  label: string;
  icon: string;
};

const concernOptions: ConcernOption[] = [
  { value: "dryness", label: "Dryness", icon: "/svgs/Group (16).svg" },
  {
    value: "oiliness",
    label: "Oiliness",
    icon: "/svgs/Group 2085660788.svg",
  },
  {
    value: "textural",
    label: "Textural",
    icon: "/svgs/Group 2085660843.svg",
  },
  {
    value: "puffy-eyes",
    label: "Puffy eyes",
    icon: "/svgs/Group 2085660844.svg",
  },
  {
    value: "crows-feet",
    label: "Crow's feet",
    icon: "/svgs/Group 2085660845.svg",
  },
  {
    value: "double-chin",
    label: "Double chin",
    icon: "/svgs/Group 2085660846.svg",
  },
  {
    value: "dark-circles",
    label: "Dark circles",
    icon: "/svgs/Group 2085660860.svg",
  },
  {
    value: "sagging-skin",
    label: "Sagging skin",
    icon: "/svgs/Group 2085660880.svg",
  },
];

export default function AdditionalConcernsStep() {
  const [selectedConcerns, setSelectedConcerns] = useStepAnswer<
    AdditionalConcern[]
  >("booking.additionalConcerns", []);
  useStepGate(selectedConcerns.length > 0);

  const toggleConcern = (value: AdditionalConcern) => {
    setSelectedConcerns(
      selectedConcerns.includes(value)
        ? selectedConcerns.filter((item) => item !== value)
        : [...selectedConcerns, value],
    );
  };

  return (
    <div>
      <StepHeader
        title="Any additional concerns?"
        subtitle="Identifying these helps us create a skincare program for your desired skin appearance"
      />

      <StepBody>
        <StepChoiceList spacing="compact">
          {concernOptions.map((option) => (
            <StepChoiceCard
              key={option.value}
              variant="icon-multi"
              iconSize="goal"
              indicatorBorder="lavender"
              icon={option.icon}
              label={option.label}
              selected={selectedConcerns.includes(option.value)}
              onSelect={() => toggleConcern(option.value)}
            />
          ))}
        </StepChoiceList>
      </StepBody>
    </div>
  );
}
