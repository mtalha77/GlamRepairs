import { NextResponse } from "next/server";

import { isFunnelPlanId } from "@/lib/funnel/plans";
import { saveFunnelProgress } from "@/lib/leads/insertLead";
import { getRequestPricingRegion } from "@/lib/pricing/geo";
import { formatRegionPrice } from "@/lib/pricing/regions";
import { PLAN_OPTIONS } from "@/lib/studio/constants";

type ProgressBody = {
  sessionId?: string;
  fullName?: string;
  email?: string;
  selectedPlan?: string | null;
  answers?: Record<string, unknown>;
  funnelStep?: number;
};

export async function POST(request: Request) {
  let body: ProgressBody;

  try {
    body = (await request.json()) as ProgressBody;
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const sessionId = body.sessionId?.trim();
  if (!sessionId) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const answerCount = body.answers ? Object.keys(body.answers).length : 0;
  const email = body.email?.trim() ?? "";
  const fullName = body.fullName?.trim() ?? "";
  if (!email && !fullName && answerCount < 2) {
    return NextResponse.json({ ok: true, skipped: true });
  }

  const plan = PLAN_OPTIONS.find((item) => item.id === body.selectedPlan);
  // HOTFIX-7 §1: price resolved from public.pricing_regions, not a
  // hardcoded PLAN_OPTIONS.price — that field no longer exists precisely
  // because it went stale the moment PK pricing last changed.
  const planPrice =
    plan && isFunnelPlanId(plan.id)
      ? formatRegionPrice(await getRequestPricingRegion(request), plan.id)
      : undefined;
  const leadId = await saveFunnelProgress({
    sessionId,
    fullName,
    email,
    selectedPlan: body.selectedPlan ?? null,
    planName: plan?.name,
    planPrice,
    answers: body.answers,
    funnelStep: body.funnelStep ?? null,
  });

  return NextResponse.json({ ok: true, leadId });
}
