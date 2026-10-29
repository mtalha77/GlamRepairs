"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { useFunnelStore } from "@/lib/funnel/useFunnelStore";

/**
 * Entering or leaving test mode starts the funnel afresh in this browser:
 * a new session id and no answers, so a demo never continues a real
 * client's half-finished assessment, and a real one never inherits a demo.
 */
export function resetFunnel() {
  useFunnelStore.getState().reset();
  useFunnelStore.setState({ sessionId: "", paymentOutcome: null });
  useFunnelStore.getState().ensureSessionId();
}

export default function FreshFunnel({ when }: { when: boolean }) {
  const router = useRouter();
  useEffect(() => {
    if (!when) return;
    resetFunnel();
    router.replace("/test", { scroll: false });
  }, [when, router]);
  return null;
}

export function StartQuestionnaire() {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={() => {
        resetFunnel();
        router.push("/onboarding/step/1");
      }}
      className="rounded-full bg-brand-primary px-4 py-2 text-sm font-semibold text-white"
    >
      Start the questionnaire
    </button>
  );
}
