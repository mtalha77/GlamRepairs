"use client";

import ConsultationPicker from "@/components/consultation/ConsultationPicker";
import { useFunnelStore } from "@/lib/funnel/useFunnelStore";

/**
 * The consultation on the thank-you page — HANDOVER-50 §1.
 *
 * Shows the held time and how long it is held, right next to the payment
 * details, because paying before the hold lapses is what keeps it. If the
 * hold already lapsed (a long funnel, a slow upload), the picker is offered
 * again here rather than leaving the client to find out after paying.
 */
export default function ConsultationAfterSubmit({
  videoPlans,
  guidelinesHtml,
}: {
  videoPlans: Record<string, number>;
  guidelinesHtml: string;
}) {
  const sessionId = useFunnelStore((state) => state.sessionId);
  const selectedPlan = useFunnelStore((state) => state.selectedPlan);
  const minutes = selectedPlan ? videoPlans[selectedPlan] : undefined;
  if (!sessionId || minutes === undefined) return null;

  return (
    <div className="mt-6 text-left">
      <ConsultationPicker
        mode="funnel"
        sessionId={sessionId}
        selectedPlan={selectedPlan}
        minutes={minutes}
        guidelinesHtml={guidelinesHtml}
      />
      <p className="mt-2 text-xs leading-relaxed text-brand-gray">
        A held time is booked when your payment is confirmed. If the hold runs out first, the time may go to someone else,
        and we will ask you to choose again.
      </p>
    </div>
  );
}
