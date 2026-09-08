"use client";

import {
  StepBody,
  StepChoiceList,
  StepFilledChoiceCard,
  StepHeader,
} from "@/components/steps";
import { useStepAnswer, useStepGate } from "@/lib/funnel/useStepAnswer";

const inputClassName =
  "w-full rounded-2xl border border-brand-border-light/70 bg-white px-4 py-3.5 text-sm text-brand-ink shadow-sm outline-none transition-colors placeholder:text-brand-gray/45 focus:border-brand-primary sm:py-4 sm:text-[15px]";

const labelClassName = "mb-2 block text-sm text-brand-ink sm:text-[0.9375rem]";

type RoutineOption =
  | "none"
  | "face-wash-only"
  | "wash-moisturizer"
  | "wash-moisturizer-spf"
  | "full-routine"
  | "not-working";

const routineOptions: { value: RoutineOption; label: string }[] = [
  { value: "none", label: "I don't have one — I use whatever is available" },
  { value: "face-wash-only", label: "Just a face wash (nothing else)" },
  { value: "wash-moisturizer", label: "Face wash + moisturizer" },
  { value: "wash-moisturizer-spf", label: "Face wash + moisturizer + sunscreen" },
  {
    value: "full-routine",
    label: "A full routine (cleanser, toner, serum, moisturizer, SPF)",
  },
  { value: "not-working", label: "I follow a routine but it's not working" },
];

export default function CurrentRoutineStep() {
  const [selectedRoutine, setSelectedRoutine] = useStepAnswer<RoutineOption | null>(
    "onboarding.currentRoutine",
    null,
  );
  const [productsUsed, setProductsUsed] = useStepAnswer<string>(
    "onboarding.productsUsed",
    "",
  );
  useStepGate(selectedRoutine !== null);

  return (
    <div>
      <StepHeader
        eyebrow="Your Current Routine"
        title="What does your current skincare routine look like?"
      />

      <StepBody>
        <StepChoiceList>
          {routineOptions.map((option) => (
            <StepFilledChoiceCard
              key={option.value}
              label={option.label}
              selected={selectedRoutine === option.value}
              onSelect={() => setSelectedRoutine(option.value)}
            />
          ))}
        </StepChoiceList>

        <div className="mt-6 sm:mt-7">
          <label htmlFor="products-used" className={labelClassName}>
            List any products or ingredients you currently use (optional — even a product type
            helps):
          </label>
          <textarea
            id="products-used"
            name="productsUsed"
            rows={3}
            placeholder="e.g. salicylic acid cleanser, vitamin C serum, drugstore moisturizer"
            value={productsUsed}
            onChange={(event) => setProductsUsed(event.target.value)}
            className={`${inputClassName} resize-none`}
          />
        </div>
      </StepBody>
    </div>
  );
}
