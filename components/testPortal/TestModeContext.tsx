"use client";

import { createContext, useContext, type ReactNode } from "react";

/**
 * Whether this request carries a valid test portal session (Handover 63).
 * Decided on the server from the signed cookie and handed down; the client
 * never decides it, and every server path checks the cookie again.
 */
const TestModeContext = createContext(false);

export function TestModeProvider({ value, children }: { value: boolean; children: ReactNode }) {
  return <TestModeContext.Provider value={value}>{children}</TestModeContext.Provider>;
}

export const useTestMode = () => useContext(TestModeContext);
