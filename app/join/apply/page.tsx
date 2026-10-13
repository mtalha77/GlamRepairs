import type { Metadata } from "next";
import Link from "next/link";

import Logo from "@/components/home/Logo";
import ApplicationSteps from "@/components/join/ApplicationSteps";
import StartApplication from "@/components/join/StartApplication";
import { loadDraft, lookupInvite } from "@/lib/practitioners/join";

/**
 * /join/apply — the application itself (HANDOVER-52 §4.1).
 *
 * With a valid link it is the five steps, resumed where they were left.
 * Without one, it asks for an email and sends a link.
 */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Practitioner application",
  robots: { index: false, follow: false },
};

export default async function ApplyPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  const invite = await lookupInvite(token);
  const draft = invite?.applicationId ? await loadDraft(invite.applicationId) : null;

  return (
    <div className="min-h-dvh bg-white text-brand-ink">
      <nav className="flex items-center justify-between border-b border-brand-lavender/60 px-4 py-3 sm:px-8">
        <Link href="/join" aria-label="GlamRepairs, for practitioners">
          <Logo variant="color" className="block h-9" />
        </Link>
        <span className="text-xs text-brand-gray sm:text-sm">Practitioner application</span>
      </nav>
      <main className="mx-auto max-w-2xl px-4 py-8 sm:px-8 sm:py-10">
        {invite && token ? (
          <ApplicationSteps token={token} email={invite.email} kind={invite.kind} initial={draft} />
        ) : (
          <>
            <h1 className="font-serif text-3xl italic text-brand-primary">Apply to join GlamRepairs</h1>
            <p className="mt-3 text-sm leading-relaxed text-brand-gray">
              {token
                ? "That link has expired or the application has already been sent. Ask for a new one below; anything you had saved comes with it."
                : "Five short steps. We email you a link first, so you can stop at any point and come back to where you left off."}
            </p>
            <div className="mt-6">
              <StartApplication />
            </div>
          </>
        )}
      </main>
      <footer className="border-t border-brand-lavender/60 bg-brand-purple-tint px-4 py-5 text-xs text-brand-gray sm:px-8">
        Your progress is saved after every step. You can close this and come back.
      </footer>
    </div>
  );
}
