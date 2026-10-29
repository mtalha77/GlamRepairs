"use client";

import {
  StepBody,
  StepChoiceCard,
  StepChoiceList,
  StepHeader,
  StepRequiredError,
} from "@/components/steps";
import {
  useStepAnswer,
  useStepGate,
  useStepRequiredError,
} from "@/lib/funnel/useStepAnswer";

type SkinType = "dry" | "normal" | "oily" | "combination";

const skinTypeOptions: {
  value: SkinType;
  label: string;
  description: string;
  icon: string;
}[] = [
  {
    value: "dry",
    label: "Dry skin type",
    description: "Lacks moisture, tends to feel tight, dull appearance, flakiness",
    icon: "/svgs/Group (4).svg",
  },
  {
    value: "normal",
    label: "Normal skin type",
    description: "Balanced oil and moisture, smooth texture, few visible concerns",
    icon: "/svgs/Group 2085660787.svg",
  },
  {
    value: "oily",
    label: "Oily skin type",
    description: "Excess sebum, enlarged pores, shiny appearance, prone to breakouts",
    icon: "/svgs/Group 2085660788.svg",
  },
  {
    value: "combination",
    label: "Combination skin type",
    description: "Oily T-zone with dry or normal cheeks and jawline",
    icon: "/svgs/Group 2085660786.svg",
  },
];

export default function SkinTypeStep() {
  const [selectedType, setSelectedType] = useStepAnswer<SkinType | null>(
    "booking.skinType",
    null,
  );
  useStepGate(selectedType !== null);
  const error = useStepRequiredError(
    selectedType === null,
    "Skin type is required.",
  );

  return (
    <div>
      <StepHeader
        title="What is your skin type?"
        subtitle="We will create a skincare program based on your answers"
      />

      <StepBody>
        <StepChoiceList>
          {skinTypeOptions.map((option) => (
            <StepChoiceCard
              key={option.value}
              variant="description"
              label={option.label}
              description={option.description}
              icon={option.icon}
              selected={selectedType === option.value}
              onSelect={() => setSelectedType(option.value)}
            />
          ))}
        </StepChoiceList>
        <StepRequiredError message={error} />
      </StepBody>
    </div>
  );
}
