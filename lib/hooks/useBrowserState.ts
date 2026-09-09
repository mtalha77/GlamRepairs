import { useSyncExternalStore } from "react";

/**
 * Two browser conditions that animated UI needs to read, as external stores.
 *
 * ── Why not useState + useEffect ─────────────────────────────────────────
 * Both of these are state owned by the browser, not by React, and the
 * useState-then-sync-in-an-effect version has three problems that
 * `useSyncExternalStore` does not: it renders once with a guessed value
 * before correcting itself, it trips `react-hooks/set-state-in-effect`, and
 * it needs an explicit answer for the server render. This hook takes a
 * `getServerSnapshot`, so the server value is stated rather than assumed.
 *
 * Both snapshots return booleans. That matters — `useSyncExternalStore`
 * compares snapshots by identity, so a hook returning a fresh object each
 * call would re-render forever.
 */

function subscribeToMediaQuery(query: string) {
  return (onStoreChange: () => void) => {
    const list = window.matchMedia(query);
    list.addEventListener("change", onStoreChange);
    return () => list.removeEventListener("change", onStoreChange);
  };
}

const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";
const subscribeToReducedMotion = subscribeToMediaQuery(REDUCED_MOTION);

/**
 * Live: subscribed rather than sampled once, because someone can change the
 * OS setting with the page open — and an auto-advancing carousel is exactly
 * the kind of thing they changed it for.
 *
 * Assumes false on the server. There is no way to know, and defaulting to
 * "reduce" would ship a motionless page to everyone who has JavaScript
 * disabled or slow to hydrate.
 */
export function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribeToReducedMotion,
    () => window.matchMedia(REDUCED_MOTION).matches,
    () => false,
  );
}

function subscribeToVisibility(onStoreChange: () => void) {
  document.addEventListener("visibilitychange", onStoreChange);
  return () => document.removeEventListener("visibilitychange", onStoreChange);
}

/**
 * True while the tab is in the background. Animation loops should stop on
 * this: requestAnimationFrame is already throttled when hidden, but a timer
 * left running still advances state nobody is watching, so the user returns
 * to a carousel that has silently cycled past everything.
 */
export function useDocumentHidden(): boolean {
  return useSyncExternalStore(
    subscribeToVisibility,
    () => document.hidden,
    () => false,
  );
}
