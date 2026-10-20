import type { Metadata } from "next";
import { redirect } from "next/navigation";

import StudioAuthCard from "@/components/studio/StudioAuthCard";
import { signOutAction } from "@/lib/studio/actions";
import { accountEmail, currentStudioSession, ensureVerified } from "@/lib/studio/twoFactor";
import { resendSignInCodeAction, verifySignInCodeAction } from "@/lib/studio/verifyActions";

/**
 * /studio/verify — the email code step of Studio sign-in (20 October 2026).
 * Reached after a password sign-in on a new device, or when a session's
 * verification is over 30 days old.
 */

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Check your email",
  robots: { index: false, follow: false },
};

const input =
  "w-full rounded-xl border border-brand-border-light bg-white px-4 py-3 text-center text-2xl tracking-[0.4em] text-black outline-none focus:border-brand-primary";

export default async function VerifyPage({ searchParams }: { searchParams: Promise<{ next?: string; sent?: string; error?: string }> }) {
  const params = await searchParams;
  const next = params.next?.startsWith("/studio") && !params.next.startsWith("//") ? params.next : "/studio";
  const session = await currentStudioSession();
  if (!session) {
    // Signed in, but the session cannot be read. Never bounce back to the
    // login page from here: it would send a signed-in user straight back.
    return (
      <StudioAuthCard title="Please sign in again" description="Your session could not be read.">
        <form action={signOutAction} className="text-center">
          <button type="submit" className="inline-flex min-h-12 items-center rounded-full bg-brand-primary px-6 text-sm text-white">
            Sign out
          </button>
        </form>
      </StudioAuthCard>
    );
  }
  if (await ensureVerified(session)) redirect(next);

  const email = await accountEmail(session.userId);
  const masked = email ? email.replace(/^(.).*(@.*)$/, "$1•••$2") : "your email";

  return (
    <StudioAuthCard
      title="Check your email"
      description={
        params.sent
          ? `We sent a six-digit code to ${masked}. It works for 10 minutes.`
          : `For your security, Studio asks for a code sent to ${masked} on a new device, and once a month.`
      }
    >
      {params.error ? (
        <p role="alert" className="mb-4 rounded-xl bg-brand-error/10 px-4 py-2.5 text-sm text-brand-error-strong">
          {params.error}
        </p>
      ) : null}
      <form action={verifySignInCodeAction} className="space-y-4">
        <input type="hidden" name="next" value={next} />
        <label className="block">
          <span className="sr-only">Six-digit code</span>
          <input name="code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9 ]{6,7}" maxLength={7} required className={input} autoFocus />
        </label>
        <button type="submit" className="inline-flex min-h-12 w-full items-center justify-center rounded-full bg-brand-primary px-5 text-sm font-medium text-white">
          Continue
        </button>
      </form>
      <form action={resendSignInCodeAction} className="mt-4 text-center">
        <input type="hidden" name="next" value={next} />
        <button type="submit" className="inline-flex min-h-12 items-center text-sm text-brand-primary underline underline-offset-2">
          {params.sent ? "Send a new code" : "Send me a code"}
        </button>
      </form>
      <form action={signOutAction} className="text-center">
        <button type="submit" className="inline-flex min-h-12 items-center text-xs text-brand-gray underline underline-offset-2">
          Sign out
        </button>
      </form>
    </StudioAuthCard>
  );
}
