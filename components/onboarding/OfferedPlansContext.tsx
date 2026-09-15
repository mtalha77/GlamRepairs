"use client";

import { createContext, useContext, type ReactNode } from "react";

import { PAID_PLAN_KEY, type PlanKey } from "@/lib/plans/plansPublic";

/**
 * Which plans the funnel will accept, resolved on the SERVER.
 *
 * ── Why this is a context and not a client-side check ────────────────────
 * HANDOVER-27 §1.3 is explicit that hiding the free card is not the gate:
 * "stop rendering the card AND reject `?plan=free`... Do not rely on hiding
 * the card alone." A pricing card that stops rendering does nothing about
 * the links already in circulation, in someone's WhatsApp history, or in
 * Google's index.
 *
 * `ApplyPlanFromQuery` is a client component — it has to be, it writes to
 * the zustand store — so it cannot ask the database whether the offer is
 * still open. Resolving that in `app/onboarding/layout.tsx` and passing the
 * answer down means the client can only ever apply a plan the server has
 * already said is currently offered. The list is the gate.
 *
 * The default is the paid plan alone. If the provider is somehow missing,
 * the funnel accepts the paid plan and nothing else — which is the safe
 * direction to fail: a visitor is asked to pay, rather than silently handed
 * a free assessment the business has stopped offering.
 */
type OfferedPlans = {
  /** Plan keys `?plan=` may set. Excludes retired and expired plans. */
  offered: PlanKey[];
  /** Where a rejected or retired `?plan=` value lands instead. */
  fallback: PlanKey;
};

const OfferedPlansContext = createContext<OfferedPlans>({
  offered: [PAID_PLAN_KEY],
  fallback: PAID_PLAN_KEY,
});

export function OfferedPlansProvider({
  offered,
  fallback,
  children,
}: OfferedPlans & { children: ReactNode }) {
  return (
    <OfferedPlansContext.Provider value={{ offered, fallback }}>
      {children}
    </OfferedPlansContext.Provider>
  );
}

export function useOfferedPlans(): OfferedPlans {
  return useContext(OfferedPlansContext);
}
