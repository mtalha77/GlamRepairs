import type { Metadata } from "next";

import JoinForm from "@/components/join/JoinForm";
import { getWhatsAppChatLink } from "@/lib/funnel/whatsapp";
import { lookupInvite } from "@/lib/practitioners/join";

/**
 * /join, practitioner applications — HANDOVER-51 §4.1.
 *
 * Invite-only for now. noindex, follow: a hiring page has no business
 * competing with the service pages for crawl attention.
 */

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Apply to join",
  robots: { index: false, follow: true },
};

export default async function JoinPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  const invite = await lookupInvite(token);

  return (
    <main className="mx-auto max-w-2xl px-4 py-12 sm:px-6 sm:py-16">
      <p className="text-xs font-medium uppercase tracking-[0.12em] text-brand-accent">Practitioners</p>
      <h1 className="mt-2 font-serif text-3xl text-brand-primary sm:text-4xl">Apply to join GlamRepairs</h1>
      <p className="mt-4 text-base leading-relaxed text-brand-ink">
        We take practitioners with a relevant qualification and clinic experience. Every applicant reads three
        sample assessments before taking paid work, and a new practitioner&apos;s first reports are reviewed before
        they are sent.
      </p>

      {invite && token ? (
        <div className="mt-8">
          <JoinForm token={token} email={invite.email} kind={invite.kind} />
        </div>
      ) : (
        <div className="mt-8 rounded-2xl border border-brand-lavender/70 bg-white p-5 text-sm leading-relaxed text-brand-ink">
          {token ? (
            <p>This invitation link is no longer valid. It may have expired or already been used.</p>
          ) : (
            <p>Applications are by invitation at the moment.</p>
          )}
          <p className="mt-2">
            If you would like to be considered, message us on{" "}
            <a href={getWhatsAppChatLink("Hi, I'd like to apply to join GlamRepairs as a practitioner.")} className="text-brand-primary underline underline-offset-2">
              WhatsApp
            </a>
            .
          </p>
        </div>
      )}
    </main>
  );
}
