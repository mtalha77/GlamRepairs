"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import { useOfferedPlans } from "@/components/onboarding/OfferedPlansContext";
import { useFunnelStore } from "@/lib/funnel/useFunnelStore";
import { isPlanKey, type PlanKey } from "@/lib/plans/plansPublic";

/**
 * Applies `?plan=...` from a pricing CTA into the funnel store, so photo
 * limits and lead data use the chosen plan and the plan step can be skipped.
 *
 * ── It no longer trusts the query string — HANDOVER-27 §1.3, §1.4 ────────
 * It used to accept any of free|clarity|transform, because all three were
 * live. Two of those are now wrong to accept:
 *
 *   clarity  Retired. Old links are in circulation and possibly indexed, so
 *            they must land on the paid plan rather than error.
 *   free     A limited-time offer. Once it closes, an old `?plan=free` link
 *            would otherwise walk straight past the hidden card.
 *
 * What may be accepted comes from the server via OfferedPlansContext, which
 * is the point: this component cannot ask the database, so it is handed the
 * answer rather than guessing. Anything not on the list resolves to the
 * fallback, never to an error and never to nothing.
 */
export default function ApplyPlanFromQuery() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const { offered, fallback } = useOfferedPlans();
  const setSelectedPlan = useFunnelStore((state) => state.setSelectedPlan);
  const setPlanPreselected = useFunnelStore(
    (state) => state.setPlanPreselected,
  );
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const finish = () => setHydrated(true);
    if (useFunnelStore.persist.hasHydrated()) {
      finish();
      return;
    }
    return useFunnelStore.persist.onFinishHydration(finish);
  }, []);

  useEffect(() => {
    if (!hydrated) return;

    const planParam = searchParams.get("plan");
    // A `?plan=` we do not recognise at all (a typo, a truncated link) is
    // left alone rather than redirected: the visitor simply chooses on the
    // plan step, which is the same thing that happens with no param.
    if (!isPlanKey(planParam)) return;

    // Retired or expired resolves to the paid plan rather than erroring.
    const resolved: PlanKey = offered.includes(planParam)
      ? planParam
      : fallback;

    setSelectedPlan(resolved);
    setPlanPreselected(true);

    const params = new URLSearchParams(searchParams.toString());
    params.delete("plan");
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }, [
    hydrated,
    searchParams,
    pathname,
    router,
    offered,
    fallback,
    setSelectedPlan,
    setPlanPreselected,
  ]);

  return null;
}
