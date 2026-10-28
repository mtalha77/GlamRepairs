import { formatPlanPrice, type PublicPlan } from "@/lib/plans/plansPublic";
import type { FaqProofData } from "@/lib/faq";

/**
 * The FAQ proof blocks' figures, from the plan the visitor would actually
 * buy (HANDOVER-61 Part 3b). The price is plans_public for their region, the
 * same number checkout charges, so the receipt shows pounds in the UK
 * without anyone touching code. Nothing here is typed in by hand.
 */
const RECEIPT_LINES = 8;

export function faqProofsFromPlan(plan: PublicPlan | null): FaqProofData | undefined {
  if (!plan) return undefined;
  const extra = plan.features.length - RECEIPT_LINES;
  return {
    receipt: {
      planLabel: plan.label,
      price: formatPlanPrice(plan),
      lines: [...plan.features.slice(0, RECEIPT_LINES), ...(extra > 0 ? [`and ${extra} more, listed on the plan`] : [])],
    },
    timeline: {
      checkIns: plan.features.some((f) => /check-in/i.test(f)),
      supportDays: plan.includesWhatsapp ? plan.supportDays : null,
    },
  };
}
