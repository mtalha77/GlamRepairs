import type { Metadata } from "next";

import ApplicationSteps from "@/components/join/ApplicationSteps";
import { getWhatsAppChatLink } from "@/lib/funnel/whatsapp";
import { loadDraft, lookupInvite } from "@/lib/practitioners/join";

/**
 * /join — HANDOVER-52 Part 5 (the page) and §4.1 (the five steps).
 *
 * Written for a working aesthetician deciding, not applying: the five
 * questions she has, in her order, before any form. With an invitation
 * link it becomes the application itself. noindex, follow: a hiring page
 * has no business competing with the service pages for crawl attention.
 */

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Work with GlamRepairs",
  description: "Read skin photographs and take video consultations from home, on your own hours. Rs 2,000 per 15 minute consultation.",
  robots: { index: false, follow: true },
};

const ANSWERS = [
  { q: "What will I earn?", a: "Rs 2,000 per 15 minute consultation." },
  { q: "When do I get paid?", a: "Monthly, by the 5th, by bank transfer." },
  { q: "How much time?", a: "You set your own hours. Two evenings a week is a good start." },
  { q: "Do I need my own clinic?", a: "No. You work from home, on your phone." },
  { q: "What do I do?", a: "Read the client's photographs, take the video call, and write a short note." },
];

const FAQ = [
  { q: "Do I need to be a doctor?", a: "No. Ayma, who co-founded GlamRepairs, is not one either." },
  { q: "Is it exclusive?", a: "No. Keep working at your clinic as well." },
  { q: "What if I cannot make a slot?", a: "Cancel with 12 hours notice and there is no penalty." },
  { q: "What if a client does not show?", a: "You are still paid in full." },
  { q: "Who sees my documents?", a: "Only the studio's administrator. They are stored privately and never published." },
  {
    q: "Can I stop?",
    a: "Yes. Close your hours whenever you like. If you leave, your booked consultations are handed to Ayma, and everything you have earned is still paid.",
  },
];

export default async function JoinPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  const invite = await lookupInvite(token);

  if (invite && token) {
    const draft = invite.applicationId ? await loadDraft(invite.applicationId) : null;
    return (
      <main className="mx-auto max-w-2xl px-4 py-10 sm:px-6 sm:py-14">
        <p className="text-xs font-medium uppercase tracking-[0.12em] text-brand-accent">Practitioners</p>
        <h1 className="mt-2 font-serif text-3xl italic text-brand-primary sm:text-4xl">Apply to join GlamRepairs</h1>
        <p className="mt-3 text-sm leading-relaxed text-brand-gray">Five short steps. You can stop at any point and come back with the same link.</p>
        <div className="mt-6">
          <ApplicationSteps token={token} email={invite.email} kind={invite.kind} initial={draft} />
        </div>
      </main>
    );
  }

  const whatsapp = getWhatsAppChatLink("Hi, I'd like to apply to join GlamRepairs as a practitioner.");

  return (
    <main className="mx-auto max-w-3xl space-y-10 px-4 py-10 sm:px-6 sm:py-14">
      <header>
        <p className="text-xs font-medium uppercase tracking-[0.12em] text-brand-accent">For aestheticians</p>
        <h1 className="mt-2 font-serif text-3xl italic leading-tight text-brand-primary sm:text-5xl">
          Your skill, from your sofa, in the evening
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-brand-ink">
          You already have the expertise. Right now it only earns when somebody walks into your clinic. With GlamRepairs
          the same expertise reaches clients you would never otherwise meet, on the hours you choose.
        </p>
        {token ? (
          <p role="alert" className="mt-4 rounded-2xl bg-brand-purple-soft px-4 py-3 text-sm text-brand-ink">
            This invitation link is no longer valid. It may have expired, or the application has already been sent.
          </p>
        ) : null}
      </header>

      <section aria-labelledby="answers" className="rounded-2xl bg-brand-cream-card p-5 sm:p-7">
        <h2 id="answers" className="font-serif text-2xl italic text-brand-primary">
          What you will want to know first
        </h2>
        <dl className="mt-4 divide-y divide-brand-lavender/60">
          {ANSWERS.map((x) => (
            <div key={x.q} className="grid gap-1 py-3 sm:grid-cols-[14rem_1fr] sm:gap-4">
              <dt className="text-sm font-medium text-brand-ink">{x.q}</dt>
              <dd className="text-sm leading-relaxed text-brand-ink">{x.a}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="rounded-2xl bg-brand-purple-soft p-5 sm:p-7">
        <h2 className="font-serif text-2xl italic text-brand-primary">If a client does not show, you are still paid in full</h2>
        <p className="mt-2 text-sm leading-relaxed text-brand-ink">
          You kept the time free. That is what you are paid for.
        </p>
      </section>

      <section aria-labelledby="bar">
        <h2 id="bar" className="font-serif text-2xl italic text-brand-primary">
          Who we take
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-brand-ink">
          Practitioners with a relevant qualification and clinic experience. Every new practitioner&apos;s first five
          assessments are reviewed before they are sent.
        </p>
      </section>

      <section aria-labelledby="faq" className="rounded-2xl bg-brand-cream-card p-5 sm:p-7">
        <h2 id="faq" className="font-serif text-2xl italic text-brand-primary">
          Questions practitioners ask
        </h2>
        <div className="mt-3 divide-y divide-brand-lavender/60">
          {FAQ.map((x) => (
            <details key={x.q} className="group py-1">
              <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 text-sm font-medium text-brand-ink">
                {x.q}
                <span aria-hidden className="text-brand-primary transition-transform group-open:rotate-45">
                  +
                </span>
              </summary>
              <p className="pb-3 text-sm leading-relaxed text-brand-ink">{x.a}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-brand-lavender/70 bg-white p-5 sm:p-7">
        <h2 className="font-serif text-2xl italic text-brand-primary">How to apply</h2>
        <p className="mt-2 text-sm leading-relaxed text-brand-ink">
          Applications are by invitation at the moment. Message us and we will send you a link. The application takes five
          short steps: who you are, your qualification, your documents, a photograph, and how you are paid. We reply within
          3 working days.
        </p>
        <a href={whatsapp} className="mt-4 inline-flex min-h-12 items-center justify-center rounded-full bg-brand-primary px-6 text-sm font-medium text-white">
          Message us on WhatsApp
        </a>
      </section>
    </main>
  );
}
