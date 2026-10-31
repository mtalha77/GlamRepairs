import { cardEligibility, cardPayUrl } from "@/lib/payments/cardCheckout";
import { formatMoney } from "@/lib/pricing/money";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { formatStudioDateTime } from "@/lib/studio/formatDate";

import CopyText from "@/components/studio/CopyText";

const STATUS: Record<string, string> = {
  created: "Started, not paid",
  paid: "Paid",
  failed: "Could not start",
  cancelled: "Cancelled by the client",
  mismatch: "Amount did not match, check in Safepay",
};

/**
 * Card payments on the customer page (31 October 2026): how this client
 * paid, every Safepay attempt with its tracker, and a signed card payment
 * link to send when they have not paid yet.
 */
export default async function CardPaymentPanel({ leadId }: { leadId: string }) {
  const admin = createAdminSupabaseClient();
  const [{ data: lead }, { data: attempts }, eligible] = await Promise.all([
    admin.from("leads").select("payment_method, payment_reference").eq("id", leadId).maybeSingle(),
    admin
      .from("card_payments")
      .select("id, tracker, amount_minor, currency, status, created_at, paid_at, environment")
      .eq("lead_id", leadId)
      .order("created_at", { ascending: false })
      .limit(10),
    cardEligibility(leadId),
  ]);

  return (
    <div className="mt-4 space-y-3 border-t border-brand-lavender/60 pt-4 text-sm">
      {lead?.payment_method ? (
        <p className="text-brand-ink">
          Paid by {lead.payment_method === "card" ? "card" : "bank transfer"}
          {lead.payment_reference ? <span className="text-brand-gray"> · {lead.payment_reference}</span> : null}
        </p>
      ) : null}
      {eligible.ok ? (
        <div>
          <p className="text-brand-gray">Card payment link for this client:</p>
          <CopyText value={cardPayUrl(leadId)} />
        </div>
      ) : null}
      {attempts?.length ? (
        <div>
          <p className="font-medium text-brand-ink">Card attempts</p>
          <ul className="mt-1 space-y-1 text-brand-gray">
            {attempts.map((a) => (
              <li key={a.id}>
                {formatStudioDateTime(a.created_at)} · {formatMoney(Number(a.amount_minor), a.currency, 2)} ·{" "}
                {STATUS[a.status] ?? a.status}
                {a.environment === "sandbox" ? " · sandbox" : ""}
                {a.tracker ? <span className="block break-all text-xs">Tracker {a.tracker}</span> : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
