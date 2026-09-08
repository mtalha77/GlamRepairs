"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useIntersectionAnimation } from "@/lib/hooks/useIntersectionAnimation";

type AnimatedSlideInProps = {
  children: ReactNode;
  direction?: "left" | "right" | "up" | "down";
  delay?: number;
  className?: string;
  threshold?: number;
};

/**
 * HANDOVER-11 §3.2 — "up" is the scroll reveal and moves 16px (translate-y-4),
 * not the 64px it used to. A 64px rise on every section made the page feel
 * like it was assembling itself as you scrolled; 16px reads as the content
 * settling. The horizontal directions keep their longer 64px travel: those
 * are used on a handful of hero blocks where the slide is the point.
 */
function getHiddenClasses(direction: "left" | "right" | "up" | "down") {
  if (direction === "right") return "translate-x-16 opacity-0";
  if (direction === "up") return "translate-y-4 opacity-0";
  if (direction === "down") return "-translate-y-4 opacity-0";
  return "-translate-x-16 opacity-0";
}

export default function AnimatedSlideIn({
  children,
  direction = "left",
  delay = 0,
  className = "",
  threshold = 0.2,
}: AnimatedSlideInProps) {
  const [ref, inView] = useIntersectionAnimation({ threshold });
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Animate once: reveal when first in view and keep it revealed so scrolling
    // up/down does not repeatedly re-trigger the slide-in (which feels janky).
    if (!inView || visible) return;

    const timer = window.setTimeout(() => {
      requestAnimationFrame(() => setVisible(true));
    }, delay);

    return () => window.clearTimeout(timer);
  }, [inView, delay, visible]);

  return (
    <div ref={ref} className={className}>
      <div
        className={`will-change-transform transform motion-reduce:transform-none motion-reduce:opacity-100 motion-reduce:transition-none transition-all duration-[400ms] ease-[cubic-bezier(0.2,0.7,0.3,1)] ${
          visible
            ? "translate-x-0 translate-y-0 opacity-100"
            : getHiddenClasses(direction)
        }`}
      >
        {children}
      </div>
    </div>
  );
}
