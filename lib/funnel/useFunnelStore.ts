"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type FunnelFlow = "onboarding" | "booking";

type FunnelState = {
  /** Anonymous identifier that links every step answer to a single user. */
  sessionId: string;
  /** All collected answers keyed by a stable step key (e.g. "onboarding.skinZones"). */
  answers: Record<string, unknown>;
  /**
   * Contact details, captured on step 1 — see ContactStep for why they moved
   * to the front. `phone` is stored exactly as typed; a database trigger
   * derives phone_e164, so the app never parses a number itself.
   */
  email: string;
  fullName: string;
  phone: string;
  /** Plan the user selected (free | clarity | transform), saved on pick. */
  selectedPlan: string | null;
  /**
   * HANDOVER-20 Part 2 — a gift code carried from /gift/[code].
   *
   * Persisted so it survives abandonment: someone who opens a gift link,
   * gets as far as the photo step and comes back tomorrow must not lose the
   * gift. It is sent with every progressive save for the same reason.
   *
   * This is a claim, not a grant. The database trigger validates it on
   * insert and silently drops it if invalid, so nothing here can conjure a
   * free assessment by writing to localStorage.
   */
  giftCode: string | null;
  /**
   * True when the plan was chosen on pricing before the funnel.
   * Skips the in-funnel plan selection step.
   */
  planPreselected: boolean;
  /** Public selfie URL after upload (Supabase Storage); used in WhatsApp message. */
  selfieUrl: string | null;
  /**
   * Farthest booking step the user may open (1–59 form, 60 = report).
   * Advanced only when they successfully continue from an earlier card.
   */
  bookingUnlockedStep: number;
  /**
   * Farthest onboarding step the user may open (1–10 form, 11 = complete).
   */
  onboardingUnlockedStep: number;
  /**
   * Whether the currently mounted step has a valid answer. Ephemeral UI state,
   * not persisted. Defaults to true so informational steps are never blocked.
   */
  currentStepValid: boolean;
  /**
   * Set when the user tries to continue on an invalid gated step.
   * Ephemeral UI state used to reveal field-level errors.
   */
  stepValidationAttempted: boolean;

  ensureSessionId: () => void;
  setAnswer: (key: string, value: unknown) => void;
  setContact: (contact: { email?: string; fullName?: string; phone?: string }) => void;
  setSelectedPlan: (plan: string | null) => void;
  setGiftCode: (code: string | null) => void;
  setPlanPreselected: (preselected: boolean) => void;
  setSelfieUrl: (url: string | null) => void;
  unlockFlowStep: (flow: FunnelFlow, step: number) => void;
  setCurrentStepValid: (valid: boolean) => void;
  requestStepValidation: () => void;
  clearStepValidationAttempt: () => void;
  reset: () => void;
};

function createSessionId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `sess_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

export const useFunnelStore = create<FunnelState>()(
  persist(
    (set, get) => ({
      sessionId: "",
      answers: {},
      email: "",
      fullName: "",
      phone: "",
      selectedPlan: null,
      giftCode: null,
      planPreselected: false,
      selfieUrl: null,
      bookingUnlockedStep: 1,
      onboardingUnlockedStep: 1,
      currentStepValid: true,
      stepValidationAttempted: false,

      ensureSessionId: () => {
        if (!get().sessionId) {
          set({ sessionId: createSessionId() });
        }
      },
      setAnswer: (key, value) =>
        set((state) => ({ answers: { ...state.answers, [key]: value } })),
      setContact: (contact) =>
        set((state) => ({
          email: contact.email ?? state.email,
          fullName: contact.fullName ?? state.fullName,
          phone: contact.phone ?? state.phone,
        })),
      setSelectedPlan: (plan) => set({ selectedPlan: plan }),
      setGiftCode: (code) => set({ giftCode: code }),
      setPlanPreselected: (preselected) => set({ planPreselected: preselected }),
      setSelfieUrl: (url) => set({ selfieUrl: url }),
      unlockFlowStep: (flow, step) =>
        set((state) => {
          if (flow === "booking") {
            return {
              bookingUnlockedStep: Math.max(state.bookingUnlockedStep, step),
            };
          }
          return {
            onboardingUnlockedStep: Math.max(
              state.onboardingUnlockedStep,
              step,
            ),
          };
        }),
      setCurrentStepValid: (valid) => set({ currentStepValid: valid }),
      requestStepValidation: () => set({ stepValidationAttempted: true }),
      clearStepValidationAttempt: () => set({ stepValidationAttempted: false }),
      reset: () =>
        set({
          answers: {},
          email: "",
          fullName: "",
          phone: "",
          selectedPlan: null,
          // Cleared on reset. A code left behind would be re-sent with the
          // next assessment, where the trigger would reject it as already
          // used — harmless, but it would show the wrong thing in the funnel.
          giftCode: null,
          planPreselected: false,
          selfieUrl: null,
          bookingUnlockedStep: 1,
          onboardingUnlockedStep: 1,
          stepValidationAttempted: false,
        }),
    }),
    {
      name: "glam-funnel",
      version: 3,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        sessionId: state.sessionId,
        answers: state.answers,
        email: state.email,
        fullName: state.fullName,
        phone: state.phone,
        selectedPlan: state.selectedPlan,
        giftCode: state.giftCode,
        planPreselected: state.planPreselected,
        selfieUrl: state.selfieUrl,
        bookingUnlockedStep: state.bookingUnlockedStep,
        onboardingUnlockedStep: state.onboardingUnlockedStep,
      }),
      migrate: (persisted, version) => {
        const state = (persisted ?? {}) as Partial<FunnelState>;
        let bookingUnlocked = state.bookingUnlockedStep ?? 1;

        // v2: booking URLs renumbered after removing PDRN (old 17+ → −3).
        if (version < 2 && bookingUnlocked > 16) {
          bookingUnlocked = Math.max(1, bookingUnlocked - 3);
        }

        return {
          ...state,
          bookingUnlockedStep: bookingUnlocked,
          onboardingUnlockedStep: state.onboardingUnlockedStep ?? 1,
          planPreselected: state.planPreselected ?? false,
        };
      },
    },
  ),
);
