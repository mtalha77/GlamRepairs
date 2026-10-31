import type { Metadata } from "next";
import Link from "next/link";

import AutoRefresh from "@/components/payments/AutoRefresh";
import PayByCardButton from "@/components/payments/PayByCardButton";
import {
  cardPaymentById,
  markCardPaymentCancelled,
  settleCardPayment,
  signCardPay,
  verifyReturnLink,
} from "@/lib/payments/cardCheckout";

/**
 * Where Safepay sends the client back (31 October 2026). Arriving here
 * proves nothing on its own: the page asks Safepay about the payment, the
 * same check the webhook makes, and whichever runs first marks it paid.
 * While Safepay is still processing, the page checks again every few
 * seconds.
 */
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Payment", robots: { index: false, follow: false } };

type Props = { searchParams: Promise<{ p?: string; s?: string; cancelled?: string }> };

function Shell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <main className="mx-auto max-w-lg px-5 py-16 sm:py-20">
      <h1 className="font-serif text-3xl leading-tight text-brand-primary">{title}</h1>
      <div className="mt-5 space-y-4 text-[15.5px] leading-relaxed text-brand-ink">{children}</div>
    </main>
  );
}

export default async function PaymentReturnPage({ searchParams }: Props) {
  const { p = "", s = "", cancelled } = await searchParams;
  const row = /^[0-9a-f-]{36}$/.test(p) && verifyReturnLink(p, s) ? await cardPaymentById(p) : null;
  if (!row) {
    return (
      <Shell title="We could not find this payment">
        <p>If you were charged, message us on WhatsApp with the time of the payment and we will sort it out.</p>
      </Shell>
    );
  }

  const tryAgain = <PayByCardButton leadId={row.lead_id} s={signCardPay(row.lead_id)} label="Try the card payment again" />;

  if (cancelled && row.status !== "paid") {
    // Safepay may still have taken the payment if the client cancelled late,
    // so ask before treating it as cancelled.
    const outcome = await settleCardPayment(row);
    if (outcome !== "paid") {
      await markCardPaymentCancelled(row.id);
      return (
        <Shell title="Payment not completed">
          <p>Nothing was charged. You can try again, or pay by bank transfer using the details in your confirmation email.</p>
          {tryAgain}
        </Shell>
      );
    }
  }

  const outcome = row.status === "paid" ? "paid" : await settleCardPayment(row);

  if (outcome === "paid") {
    return (
      <Shell title="Payment received">
        <p>Thank you. Your payment is confirmed and your assessment begins now. We have emailed you a confirmation with a link to your account.</p>
        <p>
          <Link href="/account" className="font-semibold text-brand-primary underline underline-offset-2">
            Go to your account
          </Link>
        </p>
      </Shell>
    );
  }
  if (outcome === "mismatch") {
    return (
      <Shell title="We need to check this payment">
        <p>Your payment reached us but did not match the amount for your assessment. We will check it and message you. Please do not pay again.</p>
      </Shell>
    );
  }
  return (
    <Shell title="Confirming your payment">
      <AutoRefresh />
      <p>Safepay is confirming your payment. This usually takes a few seconds, and this page will update on its own.</p>
      <p className="text-sm text-brand-gray">If it does not update within a few minutes, please do not pay again. Message us on WhatsApp and we will check.</p>
    </Shell>
  );
}
