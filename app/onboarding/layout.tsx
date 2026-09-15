import { OfferedPlansProvider } from "@/components/onboarding/OfferedPlansContext";
import { getServerPricingRegion } from "@/lib/pricing/geo";
import {
  listOfferedPlans,
  PAID_PLAN_KEY,
  type PlanKey,
} from "@/lib/plans/plansPublic";

/**
 * Funnel layout — HANDOVER-27 §1.3 and §1.4.
 *
 * Its only job is to resolve, on the server, which plans `?plan=` is allowed
 * to set, and hand that list to the client tree. Everything else about the
 * funnel's chrome is still OnboardingShell's.
 *
 * ── Why the gate lives here ──────────────────────────────────────────────
 * Two query values have to stop working, and neither can be handled by a
 * pricing card that stops rendering:
 *
 *   ?plan=clarity  A retired plan. The links are live in old messages and
 *                  possibly in Google's index, so it must redirect to the
 *                  paid plan rather than error — §1.4.
 *   ?plan=free     A limited-time offer. Once `available_until` passes,
 *                  `currently_offered` goes false and this list stops
 *                  containing it, so the funnel refuses it — §1.3, which
 *                  says in terms not to rely on hiding the card.
 *
 * Resolving it once per request here, rather than per step, also means the
 * database is read once for the whole funnel instead of on every screen.
 *
 * ── This makes the funnel dynamic, which it already was ──────────────────
 * `getServerPricingRegion()` reads cookies()/headers(). The funnel steps
 * that show a price already call it for the same reason, so this adds no
 * new caching constraint — and a statically cached funnel would serve one
 * visitor's currency and one moment's offer state to everyone, which is the
 * exact failure this is meant to prevent.
 */
export default async function OnboardingLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const region = await getServerPricingRegion();
  const plans = await listOfferedPlans(region.code);

  const offered: PlanKey[] = plans.map((p) => p.planKey);

  return (
    <OfferedPlansProvider
      // If the database is unreachable `listOfferedPlans` returns the paid
      // plan alone, so `offered` is never empty and never wrongly contains
      // the free tier. Falling back to "you can pay" is the safe direction.
      offered={offered.length ? offered : [PAID_PLAN_KEY]}
      fallback={PAID_PLAN_KEY}
    >
      {children}
    </OfferedPlansProvider>
  );
}
