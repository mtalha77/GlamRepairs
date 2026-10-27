import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { requestClientLinkAction } from "@/lib/clients/actions";
import { currentClientAccount } from "@/lib/clients/signIn";

export const metadata: Metadata = {
  title: "Sign in to your assessment",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const NOTICE: Record<string, string> = {
  expired: "That link has expired. Enter your email and we will send a new one.",
  used: "That link has already been used. Enter your email and we will send a new one.",
  invalid: "That link is not valid. Enter your email and we will send a new one.",
  staff: "This email belongs to a studio account. Please sign in from the studio instead.",
  error: "Something went wrong signing you in. Please try again.",
  signed_out: "You are signed out.",
};

export default async function ClientLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ e?: string; sent?: string }>;
}) {
  const { e, sent } = await searchParams;
  if (!e && (await currentClientAccount())) redirect("/account");

  return (
    <main className="mx-auto max-w-md px-6 pb-20 pt-28 sm:pt-32">
      <h1 className="font-serif text-3xl text-brand-primary">Your assessment</h1>
      <p className="mt-3 text-sm leading-relaxed text-brand-gray">
        Your account is created when your payment is confirmed. Enter the email you used for your assessment and we will send you a
        link to sign in. No password needed.
      </p>

      {e && NOTICE[e] ? (
        <p role="status" className="mt-5 rounded-2xl bg-brand-cream-card px-4 py-3 text-sm text-brand-ink">
          {NOTICE[e]}
        </p>
      ) : null}

      {sent ? (
        <p role="status" className="mt-5 rounded-2xl bg-brand-success/10 px-4 py-3 text-sm text-brand-success-strong">
          If that email has an account with us, a sign-in link is on its way. It works once, for 30 minutes. Check your spam folder if
          it has not arrived in a few minutes.
        </p>
      ) : (
        <form action={requestClientLinkAction} className="mt-6 space-y-3">
          <label className="block text-sm text-brand-ink">
            Email
            <input
              type="email"
              name="email"
              required
              autoComplete="email"
              className="mt-1 block min-h-12 w-full rounded-xl border border-brand-border-light px-4 text-base"
            />
          </label>
          <button type="submit" className="min-h-12 w-full rounded-full bg-brand-primary px-6 text-sm font-medium text-white">
            Email me a sign-in link
          </button>
        </form>
      )}
    </main>
  );
}
