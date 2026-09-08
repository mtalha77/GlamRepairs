"use client";

import { useState } from "react";
import { saveOnboardingFirstName } from "@/components/onboarding/onboardingStorage";
import FieldError from "@/components/ui/FieldError";
import { getFieldErrorId } from "@/components/ui/FormField";
import { StepHeader } from "@/components/steps";
import { useFunnelStore } from "@/lib/funnel/useFunnelStore";
import { useStepAnswer, useStepGate } from "@/lib/funnel/useStepAnswer";

const inputClassName =
  "w-full rounded-2xl border border-brand-border-light/70 bg-white px-4 py-3.5 text-sm text-brand-ink shadow-sm outline-none transition-colors placeholder:text-brand-gray/45 focus:border-brand-primary sm:py-4 sm:text-[15px]";

const inputErrorClassName =
  "border-brand-error focus:border-brand-error";

const labelClassName = "mb-2 block text-sm text-brand-ink sm:text-[0.9375rem]";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type GenderOption = "female" | "male" | "prefer-not-to-say";
type AboutField = "firstName" | "email" | "age" | "gender" | "city";

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
  firstName,
  email,
  age,
  gender,
  city,
}: {
  firstName: string;
  email: string;
  age: string;
  gender: GenderOption | null;
  city: string;
}): Partial<Record<AboutField, string>> {
  const errors: Partial<Record<AboutField, string>> = {};
  const trimmedEmail = email.trim();

  if (!firstName.trim()) {
    errors.firstName = "Name is required.";
  }

  if (!trimmedEmail) {
    errors.email = "Email is required.";
  } else if (!EMAIL_PATTERN.test(trimmedEmail)) {
    errors.email = "Email is not valid.";
  }

  if (!age.trim()) {
    errors.age = "Age is required.";
  } else {
    const ageNumber = Number(age);
    if (!Number.isFinite(ageNumber) || ageNumber < 1 || ageNumber > 120) {
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
  const [firstName, setFirstName] = useStepAnswer<string>(
    "onboarding.firstName",
    "",
  );
  const [email, setEmail] = useStepAnswer<string>("onboarding.email", "");
  const [age, setAge] = useStepAnswer<string>("onboarding.age", "");
  const [gender, setGender] = useStepAnswer<GenderOption | null>(
    "onboarding.gender",
    null,
  );
  const [city, setCity] = useStepAnswer<string>("onboarding.city", "");
  const setContact = useFunnelStore((state) => state.setContact);
  const validationAttempted = useFunnelStore(
    (state) => state.stepValidationAttempted,
  );
  const [touched, setTouched] = useState<Partial<Record<AboutField, boolean>>>(
    {},
  );

  const fieldErrors = getFieldErrors({
    firstName,
    email,
    age,
    gender,
    city,
  });
  const isValid = Object.keys(fieldErrors).length === 0;

  useStepGate(isValid);

  const markTouched = (field: AboutField) => {
    setTouched((current) =>
      current[field] ? current : { ...current, [field]: true },
    );
  };

  const shouldShowError = (field: AboutField) =>
    Boolean(
      fieldErrors[field] && (validationAttempted || touched[field]),
    );

  const firstNameError = shouldShowError("firstName")
    ? fieldErrors.firstName
    : undefined;
  const emailError = shouldShowError("email") ? fieldErrors.email : undefined;
  const ageError = shouldShowError("age") ? fieldErrors.age : undefined;
  const genderError = shouldShowError("gender")
    ? fieldErrors.gender
    : undefined;
  const cityError = shouldShowError("city") ? fieldErrors.city : undefined;

  return (
    <div>
      <StepHeader eyebrow="About You" title="Let's start with a few basics." />

      <div className="mt-6 space-y-4 sm:mt-7 sm:space-y-5">
        <div>
          <label htmlFor="first-name" className={labelClassName}>
            Name
          </label>
          <input
            id="first-name"
            type="text"
            name="firstName"
            placeholder="Enter name"
            autoComplete="name"
            required
            aria-invalid={firstNameError ? true : undefined}
            aria-describedby={
              firstNameError ? getFieldErrorId("first-name") : undefined
            }
            value={firstName}
            onChange={(event) => {
              const value = event.target.value;
              setFirstName(value);
              saveOnboardingFirstName(value);
              setContact({ fullName: value.trim() });
            }}
            onBlur={() => markTouched("firstName")}
            className={getInputClassName(Boolean(firstNameError))}
          />
          <FieldError id={getFieldErrorId("first-name")} message={firstNameError} />
        </div>

        <div>
          <label htmlFor="about-email" className={labelClassName}>
            Email
          </label>
          <input
            id="about-email"
            type="email"
            name="email"
            placeholder="Enter your email"
            autoComplete="email"
            inputMode="email"
            required
            aria-invalid={emailError ? true : undefined}
            aria-describedby={
              emailError ? getFieldErrorId("about-email") : undefined
            }
            value={email}
            onChange={(event) => {
              const value = event.target.value;
              setEmail(value);
              setContact({ email: value.trim() });
            }}
            onBlur={() => markTouched("email")}
            className={getInputClassName(Boolean(emailError))}
          />
          <FieldError id={getFieldErrorId("about-email")} message={emailError} />
        </div>

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

      <p className="mt-6 text-xs leading-relaxed text-brand-gray sm:mt-7 sm:text-[0.8125rem]">
        Your name and email are only used to personalize your report — they are never shared publicly.
      </p>
    </div>
  );
}
