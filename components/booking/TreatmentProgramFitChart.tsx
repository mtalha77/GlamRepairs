"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";

// Geometry mirrors the Figma design (Frame 2 coordinate space).
const VIEWBOX = "86 128 588 368";

// Gap between a circle marker and the start of its label.
const LABEL_GAP = 16;

const BAR_X = 90;
const BAR_H = 67;
const BAR_R = 15;
const BORDER = "#a88ec3";
const PURPLE = "#662d91";
const GREEN = "#45b87c";
const GRID_COLOR = "#E8E8E8";

const GRID_TOP = 157;
const GRID_BOTTOM = 486;
const GRID_XS = [91, 248, 402, 558];

type Bar = {
  y: number;
  trackW: number;
  fillW: number;
  fill: string;
  cx: number;
  cy: number;
  label: string[];
};

const bars: Bar[] = [
  { y: 157, trackW: 157, fillW: 79, fill: PURPLE, cx: 268.5, cy: 144.5, label: ["Smoother skin"] },
  { y: 244, trackW: 246, fillW: 109, fill: PURPLE, cx: 352.5, cy: 230.5, label: ["Reversing wrinkles"] },
  { y: 331, trackW: 311, fillW: 258, fill: GREEN, cx: 433.5, cy: 313.5, label: ["Your best", "skin"] },
  { y: 418, trackW: 452, fillW: 377, fill: GREEN, cx: 526.5, cy: 408.5, label: ["Long-lasting", "look"] },
];

const SMOOTH_EASE = "cubic-bezier(0.4, 0, 0.2, 1)";

export default function TreatmentProgramFitChart() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          requestAnimationFrame(() => {
            requestAnimationFrame(() => setVisible(true));
          });
        } else {
          setVisible(false);
        }
      },
      { threshold: 0.35 },
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const fadeAfter = (delay: number): CSSProperties => ({
    opacity: visible ? 1 : 0,
    transition: visible ? `opacity 500ms ${SMOOTH_EASE} ${delay}ms` : "none",
  });

  return (
    <div ref={containerRef} className="mx-auto w-full">
      <div className="aspect-[560/368] w-full">
        <svg
          viewBox={VIEWBOX}
          className="h-full w-full"
          preserveAspectRatio="xMidYMid meet"
          role="img"
          aria-label="Chart showing skin improvement milestones increasing over time"
        >
          {/* Vertical grid lines */}
          {GRID_XS.map((x) => (
            <line
              key={x}
              x1={x}
              y1={GRID_TOP}
              x2={x}
              y2={GRID_BOTTOM}
              stroke={GRID_COLOR}
              strokeWidth="1"
              style={fadeAfter(0)}
            />
          ))}
          {/* Horizontal axis */}
          <line
            x1={GRID_XS[0]}
            y1={GRID_BOTTOM}
            x2={558}
            y2={GRID_BOTTOM}
            stroke={GRID_COLOR}
            strokeWidth="1"
            style={fadeAfter(0)}
          />

          {/* Bars: white track + colored fill */}
          {bars.map((bar, index) => (
            <g key={bar.y}>
              <rect
                x={BAR_X}
                y={bar.y}
                width={bar.trackW}
                height={BAR_H}
                rx={BAR_R}
                fill="white"
                stroke={BORDER}
                strokeWidth="2"
                style={fadeAfter(index * 120)}
              />
              <rect
                x={BAR_X}
                y={bar.y}
                width={bar.fillW}
                height={BAR_H}
                rx={BAR_R}
                fill={bar.fill}
                stroke={BORDER}
                strokeWidth="2"
                style={{
                  transform: visible ? "scaleX(1)" : "scaleX(0)",
                  transformOrigin: `${BAR_X}px ${bar.y + BAR_H / 2}px`,
                  transition: visible
                    ? `transform 700ms ${SMOOTH_EASE} ${index * 120}ms`
                    : "none",
                }}
              />
            </g>
          ))}

          {/* Diagonal trend line through the markers */}
          <line
            x1={240.5}
            y1={115.9}
            x2={554.5}
            y2={437.1}
            stroke="#e4e1e1"
            strokeWidth="4"
            strokeLinecap="round"
            style={fadeAfter(360)}
          />

          {/* Circle markers */}
          {bars.map((bar) => (
            <circle
              key={`dot-${bar.y}`}
              cx={bar.cx}
              cy={bar.cy}
              r={8.5}
              fill="white"
              stroke={PURPLE}
              strokeWidth="2"
              style={fadeAfter(420)}
            />
          ))}

          {/* Labels (left-aligned just right of each circle) */}
          {bars.map((bar) => {
            const labelX = bar.cx + 8.5 + LABEL_GAP;
            return (
              <text
                key={`label-${bar.y}`}
                x={labelX}
                y={bar.cy}
                textAnchor="start"
                dominantBaseline="middle"
                className="fill-brand-ink"
                fontSize={20}
                style={fadeAfter(480)}
              >
                {bar.label.length === 1 ? (
                  bar.label[0]
                ) : (
                  <>
                    <tspan x={labelX} dy="-0.6em">
                      {bar.label[0]}
                    </tspan>
                    <tspan x={labelX} dy="1.2em">
                      {bar.label[1]}
                    </tspan>
                  </>
                )}
              </text>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
