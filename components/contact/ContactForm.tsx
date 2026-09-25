"use client";

import { FormEvent, useCallback, useState } from "react";
import {
  contactFieldIds,
  contactFormFields,
  contactMessageField,
} from "@/components/contact/contactFormFields";
import FillButton from "@/components/ui/FillButton";
import FormField from "@/components/ui/FormField";
import Notification from "@/components/ui/Notification";
import TextArea from "@/components/ui/TextArea";
import TextInput from "@/components/ui/TextInput";
import {
  buildContactFormPayload,
  submitContactForm,
} from "@/lib/contact/submitContactForm";
import {
  CONTACT_FORM_ERRORS,
  getFirstInvalidContactField,
  getRequiredFieldError,
  isContactFormComplete,
  validateContactForm,
  type ContactField,
} from "@/lib/contact/validateContactForm";

type SubmitState =
  | { type: "idle" }
  | { type: "error"; message: string };

const SUCCESS_MESSAGE =
  "Message sent. A thank-you email was sent to the address you entered.";
const contactInputClassName =
  "rounded-full border-[#d9d9d9] px-5 py-3.5 sm:px-6";
const contactTextAreaClassName =
  "min-h-[9.5rem] resize-y rounded-[1.5625rem] border-[#d9d9d9] px-5 py-4 sm:px-6";

function focusField(field: ContactField) {
  document.getElementById(contactFieldIds[field])?.focus();
}

export default function ContactForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitState, setSubmitState] = useState<SubmitState>({ type: "idle" });
  const [successNotificationId, setSuccessNotificationId] = useState<number | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<ContactField, string>>>(
    {},
  );
  const [isFormComplete, setIsFormComplete] = useState(false);

  const dismissSuccessNotification = useCallback(() => {
    setSuccessNotificationId(null);
  }, []);

  const updateFormCompleteState = (form: HTMLFormElement) => {
    const payload = buildContactFormPayload(new FormData(form));
    setIsFormComplete(isContactFormComplete(payload));
  };

  const handleFormChange = (event: FormEvent<HTMLFormElement>) => {
    updateFormCompleteState(event.currentTarget);
  };

  const clearFieldError = (field: ContactField) => {
    setFieldErrors((current) => {
      if (!current[field]) {
        return current;
      }

      const next = { ...current };
      delete next[field];
      return next;
    });
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const form = event.currentTarget;
    const payload = buildContactFormPayload(new FormData(form));
    const validationErrors = validateContactForm(payload);

    if (Object.keys(validationErrors).length > 0) {
      setFieldErrors(validationErrors);
      setSubmitState({ type: "idle" });

      const firstInvalidField = getFirstInvalidContactField(validationErrors);
      if (firstInvalidField) {
        focusField(firstInvalidField);
      }

      return;
    }

    setIsSubmitting(true);
    setFieldErrors({});
    setSubmitState({ type: "idle" });

    try {
      const result = await submitContactForm(payload);

      if (result.ok) {
        form.reset();
        setIsFormComplete(false);
        setSuccessNotificationId(Date.now());
        return;
      }

      if (result.reason === "validation") {
        setFieldErrors({
          workEmail: CONTACT_FORM_ERRORS.invalidEmail,
          message: getRequiredFieldError("message"),
        });
        focusField("workEmail");
        return;
      }

      setSubmitState({
        type: "error",
        message: "Something went wrong. Please try again.",
      });
    } catch {
      setSubmitState({
        type: "error",
        message: "Something went wrong. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Notification
        key={successNotificationId ?? "closed"}
        isOpen={successNotificationId !== null}
        message={SUCCESS_MESSAGE}
        onDismiss={dismissSuccessNotification}
        duration={4000}
        variant="success"
      />

      <form
        onSubmit={handleSubmit}
        onChange={handleFormChange}
        onInput={handleFormChange}
        noValidate
        className="flex h-full flex-col"
      >
        <h3 className="text-[1.5rem] leading-tight text-brand-primary sm:text-[2rem]">
          <span className="font-sans font-normal">Send us a</span>{" "}
          <span className="font-serif italic">message</span>
        </h3>

        <div className="mt-8 space-y-5 sm:mt-9">
          {contactFormFields.map((field) => (
            <FormField
              key={field.name}
              id={field.id}
              label={field.label}
              error={fieldErrors[field.name]}
              required
            >
              <TextInput
                id={field.id}
                name={field.name}
                type={field.type}
                autoComplete={field.autoComplete}
                hasError={Boolean(fieldErrors[field.name])}
                required
                className={contactInputClassName}
                onChange={() => clearFieldError(field.name)}
              />
            </FormField>
          ))}

          <FormField
            id={contactMessageField.id}
            label={contactMessageField.label}
            error={fieldErrors.message}
            required
          >
            <TextArea
              id={contactMessageField.id}
              name={contactMessageField.name}
              rows={contactMessageField.rows}
              hasError={Boolean(fieldErrors.message)}
              required
              className={contactTextAreaClassName}
              onChange={() => clearFieldError("message")}
            />
          </FormField>
        </div>

        <div className="mt-7 flex w-full justify-stretch sm:mt-8 sm:justify-start">
          <FillButton
            type="submit"
            variant="subscribe"
            disabled={isSubmitting}
            aria-disabled={isSubmitting}
            className={`min-h-12 w-full bg-brand-accent px-8 py-2.5 text-sm uppercase tracking-normal sm:w-auto sm:px-10 sm:py-3 sm:text-base${isFormComplete && !isSubmitting ? "" : " is-incomplete"}`}
          >
            {isSubmitting ? "Sending..." : "Send now"}
          </FillButton>
        </div>

        <div className="mt-3 min-h-[1.25rem] text-left">
          {submitState.type === "error" ? (
            <p role="alert" className="text-xs text-brand-ink sm:text-sm">
              {submitState.message}
            </p>
          ) : null}
        </div>
      </form>
    </>
  );
}
