import type { Metadata } from "next";

import { verifyUnsubscribeToken } from "@/lib/outreach/render";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Unsubscribe", robots: { index: false, follow: false } };

/** The visible unsubscribe link lands here; pressing the button is what unsubscribes. */
export default async function UnsubscribePage({ searchParams }: { searchParams: Promise<{ c?: string; t?: string; done?: string }> }) {
  const { c = "", t, done } = await searchParams;
  const valid = verifyUnsubscribeToken(c, t);
  return (
    <main className="flex min-h-[100dvh] items-center justify-center bg-brand-purple-soft px-4">
      <div className="w-full max-w-md rounded-[2rem] border border-brand-lavender/60 bg-white px-7 py-8 text-center shadow-sm">
        <h1 className="font-serif text-2xl text-brand-primary">{done ? "You are unsubscribed" : "Unsubscribe"}</h1>
        {done ? (
          <p className="mt-3 text-sm text-brand-gray">You will not receive any more emails from these Glam Repairs campaigns.</p>
        ) : valid ? (
          <form action={`/api/outreach/unsubscribe?c=${encodeURIComponent(c)}&t=${encodeURIComponent(t ?? "")}&from=page`} method="post" className="mt-5">
            <p className="mb-5 text-sm text-brand-gray">Stop all further emails from Glam Repairs campaigns to this address.</p>
            <button type="submit" className="w-full rounded-full bg-brand-primary px-5 py-3 text-sm font-medium text-white">
              Unsubscribe me
            </button>
          </form>
        ) : (
          <p className="mt-3 text-sm text-brand-gray">This link is not valid. Reply to the email with &quot;unsubscribe&quot; and we will remove you.</p>
        )}
      </div>
    </main>
  );
}
