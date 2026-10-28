"use client";

import { useEffect, useRef, type RefObject } from "react";

/**
 * Left and right arrows drive a section only while it is in view
 * (HANDOVER-61 Part 0): at least 45% of it on screen, and never while focus
 * is in a text field. The key listener exists only while that is true, so
 * two components using this never both answer the same press.
 */
export function useSectionArrows(ref: RefObject<HTMLElement | null>, onPrev: () => void, onNext: () => void) {
  const handlers = useRef({ onPrev, onNext });
  useEffect(() => {
    handlers.current = { onPrev, onNext };
  }, [onPrev, onNext]);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;

    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
      if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
      const active = document.activeElement as HTMLElement | null;
      if (active && (active.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(active.tagName))) return;
      event.preventDefault();
      if (event.key === "ArrowLeft") handlers.current.onPrev();
      else handlers.current.onNext();
    };

    let listening = false;
    const observer = new IntersectionObserver(
      ([entry]) => {
        const inView = entry.intersectionRatio >= 0.45;
        if (inView && !listening) window.addEventListener("keydown", onKey);
        if (!inView && listening) window.removeEventListener("keydown", onKey);
        listening = inView;
      },
      { threshold: [0, 0.45, 1] },
    );
    observer.observe(el);
    return () => {
      observer.disconnect();
      if (listening) window.removeEventListener("keydown", onKey);
    };
  }, [ref]);
}
