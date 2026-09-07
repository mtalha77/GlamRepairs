"use client";

import { useFormStatus } from "react-dom";

import FormField from "@/components/ui/FormField";
import TextInput from "@/components/ui/TextInput";
import { formInputClassName } from "@/components/ui/fieldStyles";
import { PLAN_OPTIONS } from "@/lib/studio/constants";
import { createCustomerAction } from "@/lib/studio/actions";

const ERROR_COPY: Record<string, string> = {
  invalid: "Name and a valid email are required.",
  save: "Could not save this customer. Try again.",
};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-xl bg-brand-primary px-5 py-2.5 text-sm text-white disabled:opacity-60"
    >
      {pending ? "Saving…" : "Add customer"}
    </button>
  );
}

type NewCustomerFormProps = {
  errorCode?: string;
};

export default function NewCustomerForm({ errorCode }: NewCustomerFormProps) {
  return (
    <form action={createCustomerAction} className="max-w-lg space-y-4">
      {errorCode && ERROR_COPY[errorCode] ? (
        <p
          role="alert"
          className="rounded-xl bg-brand-error/10 px-4 py-3 text-sm text-brand-error-strong"
        >
          {ERROR_COPY[errorCode]}
        </p>
      ) : null}
      <FormField id="customer-name" label="Full name" required>
        <TextInput id="customer-name" name="fullName" required />
      </FormField>
      <FormField id="customer-email" label="Email" required>
        <TextInput id="customer-email" name="email" type="email" required />
      </FormField>
      <FormField id="customer-plan" label="Plan">
        <select id="customer-plan" name="planId" className={formInputClassName}>
          <option value="">No plan</option>
          {PLAN_OPTIONS.map((plan) => (
            <option key={plan.id} value={plan.id}>
              {plan.name}
            </option>
          ))}
        </select>
      </FormField>
      <FormField id="customer-notes" label="Notes">
        <textarea
          id="customer-notes"
          name="notes"
          rows={4}
          className={formInputClassName}
        />
      </FormField>
      <SubmitButton />
    </form>
  );
}
