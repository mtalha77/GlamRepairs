"use client";

import { useActionState } from "react";

import FormField from "@/components/ui/FormField";
import TextInput from "@/components/ui/TextInput";
import { requestStudioPasswordReset, type ResetState } from "@/lib/studio/passwordReset";

export default function ForgotPasswordForm() {
  const [state, action, pending] = useActionState<ResetState, FormData>(requestStudioPasswordReset, { sent: false });

  if (state.sent) {
    return (
      <div className="space-y-4">
        <p role="status" className="rounded-xl bg-brand-success/15 px-4 py-3 text-sm text-brand-success-strong">
          If that email belongs to a studio account, a link to reset the password is on its way. It works for one hour.
          Check spam if it has not arrived in a few minutes.
        </p>
        <a href="/studio/login" className="block text-center text-sm text-brand-primary hover:underline">
          Back to sign in
        </a>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-4">
      {state.error ? (
        <p role="alert" className="rounded-xl bg-brand-error/10 px-4 py-3 text-sm text-brand-error-strong">
          {state.error}
        </p>
      ) : null}
      <FormField id="reset-email" label="Email" required>
        <TextInput id="reset-email" name="email" type="email" autoComplete="email" required />
      </FormField>
      <button
        type="submit"
        disabled={pending}
        className="inline-flex w-full items-center justify-center rounded-full bg-brand-primary px-5 py-3 text-sm font-medium tracking-[0.08em] text-white disabled:opacity-60"
      >
        {pending ? "Sending..." : "Send me a reset link"}
      </button>
      <a href="/studio/login" className="block text-center text-sm text-brand-primary hover:underline">
        Back to sign in
      </a>
    </form>
  );
}
