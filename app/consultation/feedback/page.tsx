import type { Metadata } from "next";

import FeedbackForm from "@/components/consultation/FeedbackForm";
import { feedbackTarget, verifyFeedback } from "@/lib/consultation/feedback";
import { formatSlot } from "@/lib/consultation/format";

/** Feedback on a consultation, from the emailed link — HANDOVER-52 §3.6. */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "How was your consultation?",
  robots: { index: false, follow: false },
};

export default async function ConsultationFeedbackPage({ searchParams }: { searchParams: Promise<{ a?: string; k?: string }> }) {
  const { a = "", k = "" } = await searchParams;
  const target = verifyFeedback(a, k) ? await feedbackTarget(a) : null;

  return (
    <main className="mx-auto max-w-xl px-4 py-12 sm:px-6 sm:py-16">
      <h1 className="font-serif text-3xl italic text-brand-primary">How was your consultation?</h1>
      {!target ? (
        <p className="mt-4 text-sm leading-relaxed text-brand-ink">This link is not valid, or there is no consultation to rate yet.</p>
      ) : target.answered ? (
        <p className="mt-4 text-sm leading-relaxed text-brand-ink">Thank you, we already have your feedback.</p>
      ) : (
        <>
          <p className="mt-3 text-sm leading-relaxed text-brand-gray">
            Your consultation with {target.practitionerName} on {formatSlot(target.startsAt)}. It takes under a minute.
          </p>
          <div className="mt-6">
            <FeedbackForm a={a} k={k} />
          </div>
        </>
      )}
    </main>
  );
}
