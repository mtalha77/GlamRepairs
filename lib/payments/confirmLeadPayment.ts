import "server-only";

import { metaConfigured, sendMetaServerEvent } from "@/lib/analytics/metaServer";
import { sendPaymentConfirmedEmail } from "@/lib/clients/paymentConfirmed";
import { bookConsultationForLead } from "@/lib/consultation/booking";
import { getPublicAppUrl } from "@/lib/leads/photoShortLink";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

/**
 * Everything that follows a confirmed payment, in one place, so a bank
 * transfer the studio verifies and a card payment Safepay confirms do
 * exactly the same thing (31 October 2026):
 *
 *   payment_status -> verified, with the method and reference
 *   the held consultation time becomes a booking (HANDOVER-50 §6)
 *   the "payment confirmed" email with the sign-in link (HANDOVER-60)
 *   the Meta Purchase event, server side, once per lead (Handover 64 §6.4)
 *
 * Safe to call twice: the email and the Purchase go only on the change to
 * verified, and booking a lead that is already booked is a no-op there.
 * Returns the booking outcome the studio shows.
 */
export async function confirmLeadPayment(
  leadId: string,
  opts: { actorId: string | null; method: "bank_transfer" | "card"; reference?: string | null },
): Promise<{ ok: boolean; booking: string; changed: boolean }> {
  const admin = createAdminSupabaseClient();
  const { data: before } = await admin.from("leads").select("payment_status").eq("id", leadId).maybeSingle();
  if (!before) return { ok: false, booking: "", changed: false };
  const changed = before.payment_status !== "verified";

  const { error } = await admin
    .from("leads")
    .update({
      payment_status: "verified",
      payment_method: opts.method,
      ...(opts.reference ? { payment_reference: opts.reference.slice(0, 120) } : {}),
      ...(changed ? { payment_verified_at: new Date().toISOString(), payment_verified_by: opts.actorId } : {}),
      updated_at: new Date().toISOString(),
    })
    .eq("id", leadId);
  if (error) {
    console.error("[confirmLeadPayment]", error.message);
    return { ok: false, booking: "", changed: false };
  }

  // A failure here never undoes the payment above.
  let booking = "";
  try {
    const outcome = await bookConsultationForLead(leadId, { appBase: getPublicAppUrl(), actorId: opts.actorId });
    booking = outcome.kind === "booked" ? (outcome.linkMissing ? "booked_no_link" : "booked") : outcome.kind;
  } catch (err) {
    console.error("[confirmLeadPayment] booking", (err as Error).message);
    booking = "error";
  }

  if (changed) await sendPaymentConfirmedEmail(leadId, booking);

  if (changed && metaConfigured()) {
    const { data: paid } = await admin
      .from("leads")
      .select("email, phone_e164, final_price, currency, is_test")
      .eq("id", leadId)
      .maybeSingle();
    if (paid && !paid.is_test && Number(paid.final_price ?? 0) > 0) {
      await sendMetaServerEvent({
        event: "Purchase",
        eventId: `purchase-${leadId}`,
        email: paid.email,
        phone: paid.phone_e164,
        value: Number(paid.final_price),
        currency: paid.currency ?? "PKR",
        actionSource: "system_generated",
      });
    }
  }

  return { ok: true, booking, changed };
}
