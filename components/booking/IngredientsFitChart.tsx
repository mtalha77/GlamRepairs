"use client";

import { useEffect, useRef, useState } from "react";

// Geometry mirrors the Figma design (Frame 2 coordinate space).
const VIEWBOX = "74 120 492 348";

const AXIS_X = 91;
const AXIS_Y_TOP = 118;
const AXIS_Y_BOTTOM = 447;
const AXIS_X_RIGHT = 558;
const AXIS_COLOR = "#D9D9D9";

// Pie group offset within the Frame (Figma: x 589 - 405, y 263.649 - 121).
const PIE_TX = 184;
const PIE_TY = 142.649;

// Exact pie paths exported from Figma (pie-local 0-281 space).
// Purple = Glam repair circle with the bottom-right quarter removed.
const GLAM_PATH =
  "M275.432 137.716C275.432 108.647 266.234 80.3232 249.154 56.8008C232.074 33.2784 207.99 15.7638 180.348 6.76492C152.707 -2.23393 122.927 -2.25544 95.273 6.70346C67.6188 15.6624 43.5087 33.1422 26.3951 56.6399C9.28146 80.1376 0.0421408 108.448 0.000143723 137.517C-0.0418534 166.586 9.11562 194.923 26.1613 218.47C43.2069 242.017 67.2664 259.567 94.8946 268.605C122.523 277.644 152.303 277.709 179.97 268.79L137.716 137.716H275.432Z";
// Red = Skincare wedge, offset so a gap shows against the purple.
const SKINCARE_PATH =
  "M186.022 273.337C213.525 264.207 237.447 246.634 254.384 223.119C271.32 199.604 280.406 171.345 280.35 142.366L142.634 142.634L186.022 273.337Z";

const GLAM_COLOR = "#DFCAF4";
const SKINCARE_COLOR = "#FD372A";

const CENTER_X = PIE_TX + 137.716;
const CENTER_Y = PIE_TY + 137.716;

const SMOOTH_EASE = "cubic-bezier(0.4, 0, 0.2, 1)";

export default function IngredientsFitChart() {
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

  return (
    <div ref={containerRef} className="mx-auto w-full">
      <div className="aspect-[492/348] w-full">
        <svg
          viewBox={VIEWBOX}
          className="h-full w-full"
          preserveAspectRatio="xMidYMid meet"
          role="img"
          aria-label="Chart showing a large Glam repair program fit and a smaller skincare share"
        >
          {/* L-shaped axis */}
          <line
            x1={AXIS_X}
            y1={AXIS_Y_TOP}
            x2={AXIS_X}
            y2={AXIS_Y_BOTTOM}
            stroke={AXIS_COLOR}
            strokeWidth="1"
            style={{
              opacity: visible ? 1 : 0,
              transition: visible ? `opacity 500ms ${SMOOTH_EASE}` : "none",
            }}
          />
          <line
            x1={AXIS_X}
            y1={AXIS_Y_BOTTOM}
            x2={AXIS_X_RIGHT}
            y2={AXIS_Y_BOTTOM}
            stroke={AXIS_COLOR}
            strokeWidth="1"
            style={{
              opacity: visible ? 1 : 0,
              transition: visible ? `opacity 500ms ${SMOOTH_EASE}` : "none",
            }}
          />

          {/* Axis labels */}
          <text
            transform="rotate(-90 86 282)"
            x={86}
            y={282}
            textAnchor="middle"
            dominantBaseline="middle"
            className="fill-brand-ink font-serif"
            fontSize={24}
            style={{
              opacity: visible ? 1 : 0,
              transition: visible ? `opacity 500ms ${SMOOTH_EASE} 120ms` : "none",
            }}
          >
            Program fit
          </text>
          <text
            x={416}
            y={433}
            className="fill-brand-ink font-serif"
            fontSize={24}
            style={{
              opacity: visible ? 1 : 0,
              transition: visible ? `opacity 500ms ${SMOOTH_EASE} 120ms` : "none",
            }}
          >
            Ingredients fit
          </text>

          {/* Pie */}
          <g
            style={{
              opacity: visible ? 1 : 0,
              transform: visible ? "scale(1)" : "scale(0.92)",
              transformOrigin: `${CENTER_X}px ${CENTER_Y}px`,
              transition: visible
                ? `opacity 700ms ${SMOOTH_EASE} 180ms, transform 700ms ${SMOOTH_EASE} 180ms`
                : "none",
            }}
          >
            <g transform={`translate(${PIE_TX} ${PIE_TY})`}>
              <path d={GLAM_PATH} fill={GLAM_COLOR} />
              <path d={SKINCARE_PATH} fill={SKINCARE_COLOR} />
            </g>

            <text
              x={276.6}
              y={241.7}
              textAnchor="middle"
              dominantBaseline="middle"
              className="fill-white font-serif"
              fontSize={14}
            >
              Glam repair
            </text>
            <text
              x={398.8}
              y={322.1}
              textAnchor="middle"
              dominantBaseline="middle"
              className="fill-white font-serif"
              fontSize={14}
            >
              Skincare
            </text>
          </g>
        </svg>
      </div>
    </div>
  );
}
