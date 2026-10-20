"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { fallbackStepPath } from "@/lib/funnel/funnelProgress";
import { useFunnelStore } from "@/lib/funnel/useFunnelStore";

/**
 * Restores a saved, unfinished assessment into this browser and goes to the
 * step it stopped at (20 October 2026). The same session id is reused, so
 * the next progressive save updates the same lead instead of starting a
 * second one. Photographs are never saved part-way, so they are retaken.
 */
export default function ResumeFunnel({
  saved,
}: {
  saved: {
    sessionId: string;
    fullName: string;
    email: string;
    phone: string;
    selectedPlan: string | null;
    giftCode: string | null;
    answers: Record<string, unknown>;
    step: number;
  };
}) {
  const router = useRouter();

  useEffect(() => {
    const restore = () => {
      const step = Math.max(1, saved.step);
      useFunnelStore.setState({
        sessionId: saved.sessionId,
        fullName: saved.fullName,
        email: saved.email,
        phone: saved.phone,
        selectedPlan: saved.selectedPlan,
        giftCode: saved.giftCode,
        answers: saved.answers,
        onboardingUnlockedStep: step,
        paymentOutcome: null,
      });
      router.replace(fallbackStepPath("onboarding", step));
    };
    if (useFunnelStore.persist.hasHydrated()) restore();
    else return useFunnelStore.persist.onFinishHydration(restore);
  }, [saved, router]);

  return (
    <main className="mx-auto max-w-xl px-4 py-16 text-center sm:px-6">
      <p className="text-sm text-brand-gray">Opening your saved assessment…</p>
    </main>
  );
}
