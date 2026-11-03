"use client";

import { useFormStatus } from "react-dom";

import FormField from "@/components/ui/FormField";
import TextInput from "@/components/ui/TextInput";
import { signInAction } from "@/lib/studio/actions";

const ERROR_COPY: Record<string, string> = {
  missing: "Email and password are required.",
  invalid: "Those credentials did not match a studio account.",
  auth: "Sign-in link expired. Please sign in again.",
  expired:
    "That invite or email link is invalid or has expired. Use Forgot your password below for a new one, or ask the owner to send a new invite.",
  schema:
    "Studio tables are missing. Run the studio SQL migration in Supabase, then try again.",
};

type LoginFormProps = {
  nextPath?: string;
  errorCode?: string;
};

function SignInButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex w-full items-center justify-center rounded-full bg-brand-primary px-5 py-3 text-sm font-medium tracking-[0.08em] text-white disabled:opacity-60"
    >
      {pending ? "Signing in…" : "Sign in"}
    </button>
  );
}

export default function LoginForm({ nextPath, errorCode }: LoginFormProps) {
  return (
    <form action={signInAction} className="space-y-4">
      {errorCode && ERROR_COPY[errorCode] ? (
        <p
          role="alert"
          className="rounded-xl bg-brand-error/10 px-4 py-3 text-sm text-brand-error-strong"
        >
          {ERROR_COPY[errorCode]}
        </p>
      ) : null}
      <input type="hidden" name="next" value={nextPath || "/studio"} />
      <FormField id="studio-email" label="Email" required>
        <TextInput
          id="studio-email"
          name="email"
          type="email"
          autoComplete="email"
          required
        />
      </FormField>
      <FormField id="studio-password" label="Password" required>
        <TextInput
          id="studio-password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
        />
      </FormField>
      <SignInButton />
      <a href="/studio/forgot-password" className="block text-center text-sm text-brand-primary hover:underline">
        Forgot your password?
      </a>
    </form>
  );
}
