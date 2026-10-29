"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { SAMPLE_ANSWERS, SAMPLE_CONTACT, SAMPLE_JUMP_STEP } from "@/components/testPortal/sampleData";
import { useTestMode } from "@/components/testPortal/TestModeContext";
import { useFunnelStore } from "@/lib/funnel/useFunnelStore";

/**
 * The stripe across every funnel page in a test session (Handover 63), and
 * the "fill with sample answers" button: without it nobody sits through
 * twenty-five steps in a demo. It fills the real answers the real steps
 * read, then opens the photo step. Nothing renders outside test mode.
 */
export default function TestBanner() {
  const testMode = useTestMode();
  const router = useRouter();
  if (!testMode) return null;

  const fill = () => {
    const store = useFunnelStore.getState();
    for (const [key, value] of Object.entries(SAMPLE_ANSWERS)) store.setAnswer(key, value);
    store.setContact(SAMPLE_CONTACT);
    store.setSelectedPlan("transform");
    store.setPlanPreselected(true);
    store.unlockFlowStep("onboarding", SAMPLE_JUMP_STEP);
    router.push(`/onboarding/step/${SAMPLE_JUMP_STEP}`);
  };

  return (
    <div
      role="status"
      className="fixed inset-x-0 top-0 z-[60] flex flex-wrap items-center gap-x-3 gap-y-1.5 border-b border-brand-accent bg-brand-cream px-4 py-2 text-[12.5px] font-semibold text-brand-ink"
    >
      <span className="rounded bg-brand-ink px-2 py-0.5 text-[10.5px] tracking-[0.08em] text-white">TEST MODE</span>
      <span className="hidden sm:inline">No real payment · Nothing reaches a practitioner · Photos are deleted on sign-out</span>
      <span className="ml-auto flex items-center gap-3">
        <button type="button" onClick={fill} className="rounded-full bg-brand-primary px-3 py-1 text-white">
          Fill with sample answers
        </button>
        <Link href="/test" className="text-brand-primary underline">
          Test portal
        </Link>
      </span>
    </div>
  );
}
