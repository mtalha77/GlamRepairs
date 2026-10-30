"use client";

import { useCallback, useRef, useState, type PointerEvent } from "react";

import PractitionerCard from "@/components/practitioners/PractitionerCard";
import { useSectionArrows } from "@/lib/hooks/useSectionArrows";
import type { CardPractitioner } from "@/lib/practitioners/card";

/**
 * The homepage deck (Handover 61 Part 1, placed by Handover 63 Part 1).
 *
 * A stack in Z. Throw the top card left for the next, right for the
 * previous, or use the dots, the buttons or the arrow keys (only while the
 * deck is in view, through the shared hook). The card that leaves rejoins at
 * the back, so the deck never ends.
 *
 * - Pointer events, so one path covers mouse and finger; `touch-action:
 *   pan-y` keeps a vertical swipe scrolling the page.
 * - Only the top card takes input. Four are painted; the rest sit at
 *   opacity 0 so a long deck does not paint every card every frame.
 * - `busy` blocks input for the 400ms exit, so fast clicks cannot desync
 *   the order.
 */

const VISIBLE = 4;
const THROW_PX = 70;
const EXIT_MS = 400;

export default function PractitionerDeck({
  practitioners,
}: {
  practitioners: CardPractitioner[];
}) {
  const n = practitioners.length;
  const [order, setOrder] = useState(() => practitioners.map((_, i) => i));
  const [leaving, setLeaving] = useState<number | null>(null);
  const [drag, setDrag] = useState<{ id: number; dx: number } | null>(null);
  const busy = useRef(false);
  const start = useRef<number | null>(null);
  const moved = useRef(false);
  const root = useRef<HTMLDivElement>(null);

  const next = useCallback(() => {
    if (busy.current || n < 2) return;
    busy.current = true;
    setLeaving(order[0]);
    window.setTimeout(() => {
      setOrder((o) => [...o.slice(1), o[0]]);
      setLeaving(null);
      busy.current = false;
    }, EXIT_MS);
  }, [n, order]);

  const prev = useCallback(() => {
    if (busy.current || n < 2) return;
    setOrder((o) => [o[o.length - 1], ...o.slice(0, -1)]);
  }, [n]);

  const goTo = (id: number) => {
    if (busy.current) return;
    setOrder((o) => {
      const at = o.indexOf(id);
      return [...o.slice(at), ...o.slice(0, at)];
    });
  };

  useSectionArrows(root, prev, next);

  const onDown = (e: PointerEvent<HTMLDivElement>) => {
    if (busy.current || (e.target as HTMLElement).closest("a,button")) return;
    start.current = e.clientX;
    moved.current = false;
    e.currentTarget.setPointerCapture(e.pointerId);
    setDrag({ id: order[0], dx: 0 });
  };
  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    if (start.current === null) return;
    const dx = e.clientX - start.current;
    if (Math.abs(dx) > 4) moved.current = true;
    setDrag({ id: order[0], dx });
  };
  const onUp = (e: PointerEvent<HTMLDivElement>) => {
    if (start.current === null) return;
    const dx = e.clientX - start.current;
    start.current = null;
    setDrag(null);
    if (dx < -THROW_PX) next();
    else if (dx > THROW_PX) prev();
    else if (!moved.current && !(e.target as HTMLElement).closest("a,button"))
      next();
  };

  const top = order[0];

  return (
    <div ref={root}>
      <div
        className="relative h-[712px] w-[min(348px,calc(100vw-2rem))] touch-pan-y select-none [perspective:1400px]"
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        role="region"
        aria-roledescription="carousel"
        aria-label="Practitioners"
      >
        {practitioners.map((p, id) => {
          const i = order.indexOf(id);
          let transform = `translate3d(${i * 14}px, ${-i * 11}px, ${-i * 62}px) rotateZ(${i * 2.2}deg) scale(${1 - i * 0.035})`;
          let opacity = i === 0 ? 1 : i < VISIBLE ? 1 - i * 0.18 : 0;
          let transition =
            "transform .55s cubic-bezier(.3,.9,.3,1), opacity .5s";
          if (leaving === id) {
            transform = "translate3d(-430px, -34px, 140px) rotateZ(-17deg)";
            opacity = 0;
          } else if (drag?.id === id) {
            transform = `translate3d(${drag.dx}px, 0, 60px) rotateZ(${drag.dx * 0.045}deg)`;
            transition = "none";
          }
          return (
            <div
              key={p.slug}
              aria-hidden={i !== 0}
              inert={i !== 0}
              className="absolute inset-0 cursor-grab will-change-transform active:cursor-grabbing motion-reduce:!transition-none"
              style={{
                transform,
                opacity,
                transition,
                zIndex: n - i,
                pointerEvents: i === 0 ? "auto" : "none",
              }}
            >
              <PractitionerCard
                p={p}
                className="h-full"
                actions={{
                  chooseHref: `/onboarding?practitioner=${encodeURIComponent(p.slug)}`,
                  profileHref: `/practitioners/${p.slug}`,
                }}
              />
            </div>
          );
        })}
      </div>

      {n > 1 ? (
        <div className="mt-7 flex items-center justify-center gap-2.5">
          <button
            type="button"
            onClick={prev}
            aria-label="Previous practitioner"
            className="flex h-[42px] w-[42px] items-center justify-center rounded-full border border-brand-lavender bg-white text-lg text-brand-primary transition hover:bg-brand-purple-soft"
          >
            ‹
          </button>
          <div className="flex gap-[7px]">
            {practitioners.map((p, id) => (
              <button
                key={p.slug}
                type="button"
                onClick={() => goTo(id)}
                aria-label={`Show ${p.name}`}
                aria-current={id === top}
                className={`h-[7px] rounded-full transition-all ${id === top ? "w-[22px] bg-brand-primary" : "w-[7px] bg-brand-lavender"}`}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={next}
            aria-label="Next practitioner"
            className="flex h-[42px] w-[42px] items-center justify-center rounded-full border border-brand-lavender bg-white text-lg text-brand-primary transition hover:bg-brand-purple-soft"
          >
            ›
          </button>
        </div>
      ) : null}
    </div>
  );
}
