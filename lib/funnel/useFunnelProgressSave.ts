"use client";

import { useEffect, useRef } from "react";

import { hasUserEnteredValue } from "@/lib/funnel/autoAnswers";
import { useFunnelStore } from "@/lib/funnel/useFunnelStore";

function payloadFromStore() {
  const state = useFunnelStore.getState();
  return {
    sessionId: state.sessionId,
    fullName: state.fullName,
    email: state.email,
    phone: state.phone,
    selectedPlan: state.selectedPlan,
    // HANDOVER-20 Part 2 — carried so the gift survives abandonment.
    giftCode: state.giftCode,
    answers: state.answers,
    // HANDOVER-18 §2 — the client's free-text note from the photo step.
    // Kept in `answers` like every other step value, but lifted to its own
    // column so the studio can badge it and the practitioner view can redact
    // it without parsing a JSON blob.
    clientNotes:
      typeof state.answers["onboarding.clientNotes"] === "string"
        ? (state.answers["onboarding.clientNotes"] as string)
        : null,
    funnelStep: Math.max(
      state.onboardingUnlockedStep,
      state.bookingUnlockedStep,
    ),
    // Handover 70 §1.6: a session opened with ?test=1. Only ever true.
    markTest: state.markTest,
  };
}

/**
 * Handover 70 Part 1: no row on page view. The store is the only record
 * until the visitor has submitted the first step (which unlocks step 2) AND
 * typed something. Auto-captured answers (timezone, practitioner, referral)
 * ride along with that first write but never cause one. The old rule, "two
 * answers", was met on mount by timezone plus the practitioner from a card
 * link, which is how six page views became six clients.
 */
function shouldSave(payload: ReturnType<typeof payloadFromStore>) {
  if (!payload.sessionId) return false;
  if (payload.funnelStep < 2) return false;
  return hasUserEnteredValue(payload);
}

async function postProgress() {
  const payload = payloadFromStore();
  if (!shouldSave(payload)) return;
  try {
    await fetch("/api/leads/progress", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true,
    });
  } catch {
    // Progress save is best-effort.
  }
}

export function useFunnelProgressSave() {
  const timer = useRef<number | null>(null);
  const lastKey = useRef("");
  const lastStep = useRef<number | null>(null);

  useEffect(() => {
    const schedule = () => {
      if (timer.current) window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => {
        void postProgress();
      }, 4000);
    };

    const unsubscribe = useFunnelStore.subscribe((state) => {
      const key = [
        state.sessionId,
        state.email,
        state.fullName,
        state.phone,
        state.selectedPlan ?? "",
        state.giftCode ?? "",
        String(state.onboardingUnlockedStep),
        Object.keys(state.answers).sort().join(","),
        // The key is otherwise a list of answer *names*, so editing the note
        // after the first keystroke would never change it and the save would
        // never be scheduled. Same bug class as the phone field in
        // HANDOVER-14.
        String(state.answers["onboarding.clientNotes"] ?? ""),
      ].join("|");
      if (key === lastKey.current) return;
      lastKey.current = key;
      // Submitting step 1 is the moment the lead is created: write it now
      // rather than four seconds later, when the visitor may have gone.
      const step = Math.max(state.onboardingUnlockedStep, state.bookingUnlockedStep);
      const crossed = lastStep.current !== null && lastStep.current < 2 && step >= 2;
      lastStep.current = step;
      if (crossed) {
        if (timer.current) window.clearTimeout(timer.current);
        void postProgress();
        return;
      }
      schedule();
    });
    const onHide = () => {
      void postProgress();
    };
    window.addEventListener("pagehide", onHide);

    return () => {
      unsubscribe();
      window.removeEventListener("pagehide", onHide);
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, []);
}
