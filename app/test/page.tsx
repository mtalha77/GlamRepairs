import Link from "next/link";

import FreshFunnel, { StartQuestionnaire } from "@/components/testPortal/FreshFunnel";
import TestSignIn from "@/components/testPortal/TestSignIn";
import { leaveTestPortal } from "@/lib/testPortal/actions";
import { getTestSession, testPortalConfigured } from "@/lib/testPortal/session";

/**
 * /test (Handover 63 Part 3): the whole journey, none of the consequences.
 * The real application with a flag on the session, not a separate build.
 */

const STEPS = [
  { n: 2, title: "Pick a practitioner", body: "The directory, showing the sample profiles. The SAMPLE badge stays visible." },
  { n: 3, title: "The questionnaire", body: "The real funnel. The stripe at the top has a button that fills every answer and jumps to the photographs." },
  { n: 4, title: "Photographs", body: "Use the sample close-ups with one tap, or upload your own. The real photo checker runs either way." },
  { n: 5, title: "Payment", body: "The real completion screen and bank block, with a button that marks it paid. No money moves and no payment is recorded." },
  { n: 6, title: "The report", body: "The same report component /sample-assessment renders, with demonstration content." },
];

export default async function TestPortalPage({
  searchParams,
}: {
  searchParams: Promise<{ started?: string; ended?: string }>;
}) {
  const [{ started, ended }, test, configured] = await Promise.all([searchParams, getTestSession(), testPortalConfigured()]);

  return (
    <main className="mx-auto max-w-2xl">
      <FreshFunnel when={Boolean(started || ended)} />
      <div className="rounded-xl border border-brand-accent bg-brand-cream px-4 py-2.5 text-[12.5px] font-semibold text-brand-ink">
        <span className="mr-2 rounded bg-brand-ink px-2 py-0.5 text-[10.5px] tracking-[0.08em] text-white">TEST MODE</span>
        No real payment is taken · Nothing here reaches a practitioner · Photographs are deleted on sign-out
      </div>
      <h1 className="mt-6 font-sans text-[1.6rem] font-semibold leading-tight text-brand-ink">
        The whole journey, <span className="font-serif italic text-brand-primary">none of the consequences.</span>
      </h1>

      {!configured ? (
        <p className="mt-4 text-[15px] leading-relaxed text-brand-gray">
          The test portal is off. A super admin turns it on by setting a passphrase in Studio → Settings.
        </p>
      ) : !test ? (
        <>
          <p className="mt-3 text-[15px] leading-relaxed text-brand-gray">
            {ended ? "Signed out. This session's test assessment and photographs have been deleted." : "Sign in with the passphrase you were given."}
          </p>
          <TestSignIn />
        </>
      ) : (
        <>
          <ol className="mt-6 space-y-3">
            <li className="rounded-2xl border border-brand-lavender/70 bg-white p-4">
              <p className="text-sm font-semibold text-brand-ink">1. Signed in as the demo account</p>
            </li>
            {STEPS.map((s) => (
              <li key={s.n} className="rounded-2xl border border-brand-lavender/70 bg-white p-4">
                <p className="text-sm font-semibold text-brand-ink">
                  {s.n}. {s.title}
                </p>
                <p className="mt-1 text-[13.5px] leading-relaxed text-brand-gray">{s.body}</p>
                {s.n === 2 ? (
                  <Link href="/test/practitioners" className="mt-3 inline-block rounded-full bg-brand-primary px-4 py-2 text-sm font-semibold text-white">
                    Open the directory
                  </Link>
                ) : s.n === 3 ? (
                  <div className="mt-3">
                    <StartQuestionnaire />
                  </div>
                ) : s.n === 6 ? (
                  <Link href="/test/report" className="mt-3 inline-block text-sm font-semibold text-brand-primary underline">
                    Open the report
                  </Link>
                ) : null}
              </li>
            ))}
          </ol>
          <form action={leaveTestPortal} className="mt-6">
            <button className="rounded-full border border-brand-lavender bg-white px-5 py-2.5 text-sm font-semibold text-brand-primary">
              Sign out and delete this demo
            </button>
          </form>
        </>
      )}
    </main>
  );
}
