import type { Metadata } from "next";
import Link from "next/link";

import Logo from "@/components/home/Logo";
import AssessmentRunner, { StartAssessmentButton } from "@/components/join/AssessmentRunner";
import { WhatsAppHelpLine } from "@/components/join/PractitionerWhatsApp";
import { ASSESSMENT_MINUTES, ASSESSMENT_QUESTIONS, candidateState } from "@/lib/practitioners/assessment";

/**
 * /join/assessment — the screening test (HANDOVER-56, spec 20 October §6.3).
 * Reached only through the signed link the studio emails. The score is
 * never shown here: a person reads it, alongside any integrity flags.
 */

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Practitioner assessment",
  robots: { index: false, follow: false },
};

const card = "rounded-2xl border border-brand-lavender/70 bg-white p-5 text-sm leading-relaxed text-brand-ink sm:p-6";

export default async function AssessmentPage({ searchParams }: { searchParams: Promise<{ a?: string; s?: string }> }) {
  const { a, s } = await searchParams;
  const state = await candidateState(a, s);

  return (
    <div className="min-h-dvh bg-white text-brand-ink">
      <nav className="flex items-center justify-between border-b border-brand-lavender/60 px-4 py-3 sm:px-8">
        <Link href="/join" aria-label="GlamRepairs, for practitioners">
          <Logo variant="color" className="block h-9" />
        </Link>
        <span className="text-xs text-brand-gray sm:text-sm">Practitioner assessment</span>
      </nav>
      <main className="mx-auto max-w-2xl px-4 py-8 sm:px-8 sm:py-10">
        <h1 className="font-serif text-3xl italic text-brand-primary">
          {state.kind === "ready" || state.kind === "running" || state.kind === "done" || state.kind === "used"
            ? `${state.name}, your assessment`
            : "Practitioner assessment"}
        </h1>

        <div className="mt-6 space-y-4">
          {state.kind === "invalid" ? (
            <p className={card}>This link is not valid. Please use the button in the email we sent you.</p>
          ) : state.kind === "closed" ? (
            <p className={card}>
              {state.reason === "decided"
                ? "This application has already been decided, so the assessment is closed."
                : "This assessment is not open yet. We will email you when it is."}
            </p>
          ) : state.kind === "done" ? (
            <p className={card}>
              Thank you, we have your answers. A person reads every result, and we will reply by email within three working days.
            </p>
          ) : state.kind === "used" ? (
            <p className={card}>
              This link has already been used to start the assessment. If something went wrong part way through, message us and we can send
              a new one.
            </p>
          ) : state.kind === "ready" ? (
            <div className={card}>
              <ul className="list-disc space-y-1.5 pl-5">
                <li>
                  {ASSESSMENT_QUESTIONS} multiple choice questions about skin, safety and how we work.
                </li>
                <li>{ASSESSMENT_MINUTES} minutes from the moment you press start. A timer shows what is left.</li>
                <li>Your answers save as you go. When the time runs out, what you have answered is sent.</li>
                <li>Please stay on this page. Leaving the tab is recorded, and a person reads every result.</li>
                <li>You can start once from this link, so begin when you have the time free.</li>
              </ul>
              {state.attemptNo > 1 ? <p className="mt-3 text-brand-gray">This is your second and final attempt.</p> : null}
              <div className="mt-5">
                <StartAssessmentButton a={a!} s={s!} />
              </div>
            </div>
          ) : (
            <AssessmentRunner
              a={a!}
              s={s!}
              attemptId={state.attemptId}
              expiresAt={state.expiresAt}
              questions={state.questions}
              initialAnswers={state.answers}
            />
          )}
          <WhatsAppHelpLine context="assessment" />
        </div>
      </main>
    </div>
  );
}
