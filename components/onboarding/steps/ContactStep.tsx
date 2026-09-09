"use client";

import { useState } from "react";
import { saveOnboardingFirstName } from "@/components/onboarding/onboardingStorage";
import WelcomeHeroImage from "@/components/onboarding/WelcomeHeroImage";
import FieldError from "@/components/ui/FieldError";
import { getFieldErrorId } from "@/components/ui/FormField";
import { StepHeader } from "@/components/steps";
import { useFunnelStore } from "@/lib/funnel/useFunnelStore";
import { useStepAnswer, useStepGate } from "@/lib/funnel/useStepAnswer";

/**
 * Step 1 — name, WhatsApp number, email. Collected once, before any question.
 *
 * ── Why this moved to the front ──────────────────────────────────────────
 * The three real abandoned leads stopped at steps 8, 17 and 19. Contact
 * details were asked at step 14, so the one who left at step 8 is
 * unreachable — there is nothing to email and nothing to call. A recovery
 * system that only has details for people who got two-thirds of the way
 * through cannot recover the third who did not.
 *
 * Talha's call, and it is the right one for a business whose delivery
 * channel *is* WhatsApp: the number is not marketing data here, it is the
 * address the assessment gets sent to. The framing below says exactly that,
 * because a bare mandatory phone field on a first screen reads as a toll
 * gate, and the same field explained as "where your report goes" reads as
 * the form doing its job.
 *
 * ⚠️ Known cost, accepted deliberately: asking before the user has invested
 * anything is the highest-friction placement there is, and it will reduce
 * *starts*. The trade is fewer starts against every start being reachable.
 * With three leads of data that is a judgement call, not a measurement —
 * `funnel_step` now records where people stop, so it becomes measurable.
 *
 * ── One-time collection ──────────────────────────────────────────────────
 * AboutYouStep (step 14) no longer asks for name or email. Asking twice
 * makes a long form feel longer and invites two different spellings of the
 * same address into one record.
 */

const inputClassName =
  "w-full rounded-2xl border border-brand-border-light/70 bg-white px-4 py-3.5 text-sm text-brand-ink shadow-sm outline-none transition-colors placeholder:text-brand-gray/45 focus:border-brand-primary sm:py-4 sm:text-[15px]";

const inputErrorClassName = "border-brand-error focus:border-brand-error";

const labelClassName = "mb-2 block text-sm text-brand-ink sm:text-[0.9375rem]";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Deliberately loose. A database trigger normalises whatever is typed into
 * `phone_e164` — 03018770506, 0301-877-0506, +92 301 8770506 and 923018770506
 * all become +923018770506, and international numbers are preserved. So the
 * only job here is to reject something that cannot be a phone number at all.
 * Anything stricter would reject formats the trigger already handles, and
 * turn a working number into a dead end on the first screen.
 */
const PHONE_MIN_DIGITS = 10;
const PHONE_MAX_DIGITS = 15;

function digitCount(value: string) {
  return value.replace(/\D/g, "").length;
}

type ContactField = "firstName" | "phone" | "email";

function getFieldErrors({
  firstName,
  phone,
  email,
}: {
  firstName: string;
  phone: string;
  email: string;
}) {
  const errors: Partial<Record<ContactField, string>> = {};

  if (!firstName.trim()) {
    errors.firstName = "Name is required.";
  }

  const digits = digitCount(phone);
  if (!phone.trim()) {
    errors.phone = "WhatsApp number is required.";
  } else if (digits < PHONE_MIN_DIGITS || digits > PHONE_MAX_DIGITS) {
    errors.phone = "Please enter a valid phone number.";
  }

  const trimmedEmail = email.trim();
  if (!trimmedEmail) {
    errors.email = "Email is required.";
  } else if (!EMAIL_PATTERN.test(trimmedEmail)) {
    errors.email = "Email is not valid.";
  }

  return errors;
}

export default function ContactStep() {
  const [firstName, setFirstName] = useStepAnswer<string>(
    "onboarding.firstName",
    "",
  );
  const [phone, setPhone] = useStepAnswer<string>("onboarding.phone", "");
  const [email, setEmail] = useStepAnswer<string>("onboarding.email", "");

  const setContact = useFunnelStore((state) => state.setContact);
  const validationAttempted = useFunnelStore(
    (state) => state.stepValidationAttempted,
  );
  const [touched, setTouched] = useState<Partial<Record<ContactField, boolean>>>(
    {},
  );

  const fieldErrors = getFieldErrors({ firstName, phone, email });
  useStepGate(Object.keys(fieldErrors).length === 0);

  const markTouched = (field: ContactField) =>
    setTouched((current) =>
      current[field] ? current : { ...current, [field]: true },
    );

  const shouldShowError = (field: ContactField) =>
    Boolean(fieldErrors[field] && (validationAttempted || touched[field]));

  const firstNameError = shouldShowError("firstName")
    ? fieldErrors.firstName
    : undefined;
  const phoneError = shouldShowError("phone") ? fieldErrors.phone : undefined;
  const emailError = shouldShowError("email") ? fieldErrors.email : undefined;

  return (
    <div>
      <WelcomeHeroImage />

      <StepHeader
        className="mt-6 text-center sm:mt-7"
        title="Welcome"
        titleClassName="font-serif text-[1.75rem] leading-none text-brand-primary sm:text-[2rem]"
        subtitle="Tell us where to send your assessment, then we'll ask about your skin."
        subtitleClassName="mx-auto mt-3 max-w-[20rem] text-sm font-normal leading-relaxed text-brand-ink sm:mt-3.5 sm:max-w-none sm:text-[0.9375rem]"
      />

      <div className="mt-6 space-y-4 sm:mt-7 sm:space-y-5">
        <div>
          <label htmlFor="contact-first-name" className={labelClassName}>
            Name
          </label>
          <input
            id="contact-first-name"
            type="text"
            name="firstName"
            autoComplete="given-name"
            placeholder="Your name"
            value={firstName}
            aria-invalid={firstNameError ? true : undefined}
            aria-describedby={
              firstNameError ? getFieldErrorId("contact-first-name") : undefined
            }
            onChange={(event) => {
              const value = event.target.value;
              setFirstName(value);
              setContact({ fullName: value });
              saveOnboardingFirstName(value);
            }}
            onBlur={() => markTouched("firstName")}
            className={`${inputClassName}${firstNameError ? ` ${inputErrorClassName}` : ""}`}
          />
          <FieldError id={getFieldErrorId("contact-first-name")} message={firstNameError} />
        </div>

        <div>
          <label htmlFor="contact-phone" className={labelClassName}>
            Your WhatsApp number
          </label>
          <input
            id="contact-phone"
            // type="tel" + inputMode numeric brings up the phone keypad on a
            // handset, which is where nearly all of this traffic is.
            type="tel"
            inputMode="numeric"
            name="phone"
            autoComplete="tel"
            placeholder="+92 300 0000000"
            value={phone}
            aria-invalid={phoneError ? true : undefined}
            aria-describedby={
              phoneError ? getFieldErrorId("contact-phone") : undefined
            }
            onChange={(event) => {
              const value = event.target.value;
              setPhone(value);
              // Raw, exactly as typed. The database trigger owns phone_e164 —
              // normalising here as well would give two sources of truth for
              // one number and no way to see what the client actually entered.
              setContact({ phone: value });
            }}
            onBlur={() => markTouched("phone")}
            className={`${inputClassName}${phoneError ? ` ${inputErrorClassName}` : ""}`}
          />
          <FieldError id={getFieldErrorId("contact-phone")} message={phoneError} />
          <p className="mt-2 text-xs leading-relaxed text-brand-gray sm:text-[0.8125rem]">
            This is how we send your assessment and confirm your payment.{" "}
            <span className="italic">
              We never share your number, and we will not add you to any
              marketing list.
            </span>
          </p>
        </div>

        <div>
          <label htmlFor="contact-email" className={labelClassName}>
            Email
          </label>
          <input
            id="contact-email"
            type="email"
            name="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            aria-invalid={emailError ? true : undefined}
            aria-describedby={
              emailError ? getFieldErrorId("contact-email") : undefined
            }
            onChange={(event) => {
              const value = event.target.value;
              setEmail(value);
              setContact({ email: value });
            }}
            onBlur={() => markTouched("email")}
            className={`${inputClassName}${emailError ? ` ${inputErrorClassName}` : ""}`}
          />
          <FieldError id={getFieldErrorId("contact-email")} message={emailError} />
        </div>
      </div>
    </div>
  );
}
