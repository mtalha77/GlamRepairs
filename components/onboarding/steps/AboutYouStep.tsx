"use client";

import { useState } from "react";
import FieldError from "@/components/ui/FieldError";
import { getFieldErrorId } from "@/components/ui/FormField";
import { StepHeader } from "@/components/steps";
import { useFunnelStore } from "@/lib/funnel/useFunnelStore";
import { useStepAnswer, useStepGate } from "@/lib/funnel/useStepAnswer";

/**
 * HANDOVER-14 — name and email are no longer asked here.
 *
 * Both, plus the WhatsApp number, are collected once on step 1
 * (`ContactStep`), so a lead who abandons early is still reachable. This step
 * keeps only what it is actually for: age, gender and city.
 *
 * Asking twice cost twice. It made a 25-step form feel longer at the exact
 * midpoint where people were already leaving, and it let two different
 * spellings of the same address into one lead record with no way to tell
 * which the client meant.
 *
 * The answer keys `onboarding.firstName` and `onboarding.email` are unchanged
 * — ContactStep writes the same keys — so every downstream reader (the
 * WhatsApp summary, the studio answer labels, the confirmation email) keeps
 * working without a migration.
 */

const inputClassName =
  "w-full rounded-2xl border border-brand-border-light/70 bg-white px-4 py-3.5 text-sm text-brand-ink shadow-sm outline-none transition-colors placeholder:text-brand-gray/45 focus:border-brand-primary sm:py-4 sm:text-[15px]";

const inputErrorClassName = "border-brand-error focus:border-brand-error";

const labelClassName = "mb-2 block text-sm text-brand-ink sm:text-[0.9375rem]";

type GenderOption = "female" | "male" | "prefer-not-to-say";
type AboutField = "age" | "gender" | "city";

const genderOptions: { value: GenderOption; label: string }[] = [
  { value: "female", label: "Female" },
  { value: "male", label: "Male" },
  { value: "prefer-not-to-say", label: "Prefer not to say" },
];

function getInputClassName(hasError: boolean) {
  return `${inputClassName}${hasError ? ` ${inputErrorClassName}` : ""}`;
}

function GenderOption({
  label,
  value,
  selected,
  onSelect,
}: {
  label: string;
  value: GenderOption;
  selected: boolean;
  onSelect: (value: GenderOption) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(value)}
      className={`flex items-center gap-2.5 rounded-full px-3 py-1.5 transition-colors ${
        selected ? "bg-brand-light text-white" : "text-brand-gray/70"
      }`}
    >
      <span
        className={`flex h-4 w-4 items-center justify-center rounded-full border ${
          selected
            ? "border-white bg-white"
            : "border-brand-border-light bg-white"
        }`}
      >
        {selected ? (
          <span className="h-2 w-2 rounded-full bg-brand-light" />
        ) : null}
      </span>
      <span className="text-sm sm:text-[15px]">{label}</span>
    </button>
  );
}

function getFieldErrors({
  age,
  gender,
  city,
}: {
  age: string;
  gender: GenderOption | null;
  city: string;
}) {
  const errors: Partial<Record<AboutField, string>> = {};

  if (!age.trim()) {
    errors.age = "Age is required.";
  } else {
    const parsed = Number(age);
    if (!Number.isFinite(parsed) || parsed < 1 || parsed > 120) {
      errors.age = "Please enter a valid age.";
    }
  }

  if (gender === null) {
    errors.gender = "Gender is required.";
  }

  if (!city.trim()) {
    errors.city = "City is required.";
  }

  return errors;
}

export default function AboutYouStep() {
  const [age, setAge] = useStepAnswer<string>("onboarding.age", "");
  const [gender, setGender] = useStepAnswer<GenderOption | null>(
    "onboarding.gender",
    null,
  );
  const [city, setCity] = useStepAnswer<string>("onboarding.city", "");
  const validationAttempted = useFunnelStore(
    (state) => state.stepValidationAttempted,
  );
  const [touched, setTouched] = useState<Partial<Record<AboutField, boolean>>>(
    {},
  );

  const fieldErrors = getFieldErrors({ age, gender, city });
  useStepGate(Object.keys(fieldErrors).length === 0);

  const markTouched = (field: AboutField) => {
    setTouched((current) =>
      current[field] ? current : { ...current, [field]: true },
    );
  };

  const shouldShowError = (field: AboutField) =>
    Boolean(fieldErrors[field] && (validationAttempted || touched[field]));

  const ageError = shouldShowError("age") ? fieldErrors.age : undefined;
  const genderError = shouldShowError("gender")
    ? fieldErrors.gender
    : undefined;
  const cityError = shouldShowError("city") ? fieldErrors.city : undefined;

  return (
    <div>
      <StepHeader eyebrow="About You" title="A few basics about you." />

      <div className="mt-6 space-y-4 sm:mt-7 sm:space-y-5">
        <div>
          <label htmlFor="age" className={labelClassName}>
            Age
          </label>
          <input
            id="age"
            type="number"
            name="age"
            placeholder="Enter age"
            min={1}
            max={120}
            inputMode="numeric"
            required
            aria-invalid={ageError ? true : undefined}
            aria-describedby={ageError ? getFieldErrorId("age") : undefined}
            value={age}
            onChange={(event) => setAge(event.target.value)}
            onBlur={() => markTouched("age")}
            className={getInputClassName(Boolean(ageError))}
          />
          <FieldError id={getFieldErrorId("age")} message={ageError} />
        </div>

        <div>
          <p className={labelClassName} id="gender-label">
            Gender
          </p>
          <div
            role="group"
            aria-labelledby="gender-label"
            aria-invalid={genderError ? true : undefined}
            aria-describedby={
              genderError ? getFieldErrorId("gender") : undefined
            }
            className="flex flex-wrap items-center gap-x-5 gap-y-3 sm:gap-x-6"
          >
            {genderOptions.map((option) => (
              <GenderOption
                key={option.value}
                label={option.label}
                value={option.value}
                selected={gender === option.value}
                onSelect={(value) => {
                  setGender(value);
                  markTouched("gender");
                }}
              />
            ))}
          </div>
          <FieldError id={getFieldErrorId("gender")} message={genderError} />
        </div>

        <div>
          <label htmlFor="city" className={labelClassName}>
            City
          </label>
          <input
            id="city"
            type="text"
            name="city"
            placeholder="Enter city"
            autoComplete="address-level2"
            required
            aria-invalid={cityError ? true : undefined}
            aria-describedby={cityError ? getFieldErrorId("city") : undefined}
            value={city}
            onChange={(event) => setCity(event.target.value)}
            onBlur={() => markTouched("city")}
            className={getInputClassName(Boolean(cityError))}
          />
          <FieldError id={getFieldErrorId("city")} message={cityError} />
        </div>
      </div>
    </div>
  );
}
