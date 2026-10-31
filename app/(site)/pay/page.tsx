import type { Metadata } from "next";
import Link from "next/link";

import PayByCardButton from "@/components/payments/PayByCardButton";
import { cardEligibility, verifyCardPayLink } from "@/lib/payments/cardCheckout";
import { formatMoney } from "@/lib/pricing/money";

/**
 * /pay?l=<lead>&s=<signature>: pay for an assessment by card from a link
 * (the confirmation email, or one the studio sends). Not indexed. The
 * signature ties the link to one assessment; the amount comes from it.
 */
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Pay for your assessment", robots: { index: false, follow: false } };

type Props = { searchParams: Promise<{ l?: string; s?: string }> };

function Shell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <main className="mx-auto max-w-lg px-5 py-16 sm:py-20">
      <h1 className="font-serif text-3xl leading-tight text-brand-primary">{title}</h1>
      <div className="mt-5 space-y-4 text-[15.5px] leading-relaxed text-brand-ink">{children}</div>
    </main>
  );
}

export default async function PayPage({ searchParams }: Props) {
  const { l = "", s = "" } = await searchParams;
  if (!/^[0-9a-f-]{36}$/.test(l) || !verifyCardPayLink(l, s)) {
    return (
      <Shell title="This payment link is not valid">
        <p>Please use the link from your email, or message us on WhatsApp and we will send a new one.</p>
      </Shell>
    );
  }
  const eligible = await cardEligibility(l);
  if (!eligible.ok) {
    const message =
      eligible.reason === "already_paid"
        ? "This assessment is already paid. Thank you."
        : eligible.reason === "nothing_to_pay"
          ? "There is nothing to pay for this assessment."
          : "Card payment is not available for this assessment yet. The bank transfer details are in your confirmation email.";
    return (
      <Shell title={eligible.reason === "already_paid" ? "Already paid" : "Payment"}>
        <p>{message}</p>
        <p>
          <Link href="/account" className="font-semibold text-brand-primary underline underline-offset-2">
            Go to your account
          </Link>
        </p>
      </Shell>
    );
  }
  return (
    <Shell title="Pay for your assessment">
      <div className="rounded-2xl border border-brand-lavender/70 bg-white p-5">
        <p className="text-sm text-brand-gray">{eligible.planName ?? "Skin assessment"}</p>
        <p className="mt-1 font-serif text-3xl text-brand-ink">{formatMoney(eligible.amountMinor, eligible.currency, 2)}</p>
        <p className="mt-1 text-sm text-brand-gray">One payment, not a subscription.</p>
        <div className="mt-5">
          <PayByCardButton leadId={l} s={s} />
        </div>
      </div>
      <p className="text-sm text-brand-gray">
        You will pay on Safepay&apos;s secure page and come straight back here. We never see or store your card details.
      </p>
    </Shell>
  );
}
