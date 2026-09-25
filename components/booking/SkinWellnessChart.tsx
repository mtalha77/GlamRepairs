"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useIntersectionAnimation } from "@/lib/hooks/useIntersectionAnimation";

const AREA_CLIP_ID = "skin-wellness-area-clip";
const AREA_FILL_ID = "skin-wellness-area-fill";

// Exact geometry exported from the Figma design (coordinate space 0 0 467 285).
const VIEWBOX = "14 28 444 240";

const GRID_X1 = 48.83;
const GRID_X2 = 452.04;
const GRID_YS = [72.95, 115.34, 157.73, 200.12];

// "Glam repair" — purple dotted line.
const GLAM_PATH =
  "M48.0391 216.253C48.0391 216.253 76.5275 204.34 98.0853 189.576C124.011 171.821 139.086 136.026 170.579 136.222C203.519 136.427 212.18 184.933 244.176 177.151C275.154 169.617 260.059 118.671 290.91 110.641C332.499 99.8163 324.158 187.178 367.084 189.576C414.467 192.223 452.089 103.332 452.089 103.332";

// "On average" — solid gray line.
const AVERAGE_PATH =
  "M49.8789 199.443C49.8789 199.443 70.8109 146.224 101.029 138.414C136.503 129.247 147.782 191.357 183.458 182.998C219.002 174.671 200.665 106.891 237.184 106.986C265.082 107.06 264.858 152.108 292.75 151.57C312.03 151.198 317.482 131.827 336.541 128.913C375.627 122.937 386.96 201.367 421.914 182.998C443.53 171.639 452.825 128.913 452.825 128.913";

// Filled area under the average line.
const AREA_PATH =
  "M101.029 138.414C70.8109 146.224 49.8789 199.443 49.8789 199.443V241.699H452.825V128.913C452.825 128.913 443.53 171.639 421.914 182.998C386.96 201.367 375.627 122.937 336.541 128.913C317.482 131.827 312.03 151.198 292.75 151.57C264.858 152.108 265.082 107.06 237.184 106.986C200.665 106.891 219.002 174.671 183.458 182.998C147.782 191.357 136.503 129.247 101.029 138.414Z";

const AREA_CLIP_X = 48;
const AREA_CLIP_Y = 100;
const AREA_CLIP_WIDTH = 406;
const AREA_CLIP_HEIGHT = 144;

const GLAM_LINE_DOT_PATTERN = "4 4";
const SMOOTH_EASE = "cubic-bezier(0.4, 0, 0.2, 1)";
const GRID_DURATION_MS = 500;
const AREA_DURATION_MS = 1400;
const LINE_DURATION_MS = 1500;
const GLAM_LINE_DELAY_MS = 450;

function setPathHidden(path: SVGPathElement, length: number) {
  path.style.strokeDasharray = `${length}`;
  path.style.strokeDashoffset = `${length}`;
}

export default function SkinWellnessChart() {
  const clipRectRef = useRef<SVGRectElement>(null);
  const averageLineRef = useRef<SVGPathElement>(null);
  const glamLineRef = useRef<SVGPathElement>(null);
  const [containerRef, inView] = useIntersectionAnimation({ threshold: 0.35 });
  const [visible, setVisible] = useState(false);
  const [legendVisible, setLegendVisible] = useState(false);
  const [glamDashed, setGlamDashed] = useState(false);

  useEffect(() => {
    if (!inView) {
      setVisible(false);
      setLegendVisible(false);
      setGlamDashed(false);
      return;
    }

    const timer = window.setTimeout(() => setVisible(true), 0);
    return () => window.clearTimeout(timer);
  }, [inView]);

  useLayoutEffect(() => {
    const averageLine = averageLineRef.current;
    const glamLine = glamLineRef.current;
    const clipRect = clipRectRef.current;

    if (!averageLine || !glamLine || !clipRect) return;

    const averageLength = averageLine.getTotalLength();
    const glamLength = glamLine.getTotalLength();

    [averageLine, glamLine, clipRect].forEach((node) => {
      node.getAnimations().forEach((animation) => animation.cancel());
    });

    if (!visible) {
      setPathHidden(averageLine, averageLength);
      setPathHidden(glamLine, glamLength);
      glamLine.style.strokeDasharray = `${glamLength}`;
      clipRect.setAttribute("width", "0");
      setLegendVisible(false);
      setGlamDashed(false);
      return;
    }

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    if (prefersReducedMotion) {
      averageLine.style.strokeDasharray = "none";
      averageLine.style.strokeDashoffset = "0";
      glamLine.style.strokeDasharray = GLAM_LINE_DOT_PATTERN;
      glamLine.style.strokeDashoffset = "0";
      clipRect.setAttribute("width", String(AREA_CLIP_WIDTH));
      setLegendVisible(true);
      setGlamDashed(true);
      return;
    }

    setPathHidden(averageLine, averageLength);
    setPathHidden(glamLine, glamLength);
    glamLine.style.strokeDasharray = `${glamLength}`;
    clipRect.setAttribute("width", "0");
    setLegendVisible(false);
    setGlamDashed(false);

    let averageAnimation: Animation | undefined;
    let areaAnimation: Animation | undefined;
    let glamAnimation: Animation | undefined;
    let legendTimer: number | undefined;
    let frameOne = 0;
    let frameTwo = 0;

    frameOne = requestAnimationFrame(() => {
      frameTwo = requestAnimationFrame(() => {
        areaAnimation = clipRect.animate(
          [{ width: 0 }, { width: AREA_CLIP_WIDTH }],
          {
            duration: AREA_DURATION_MS,
            easing: SMOOTH_EASE,
            fill: "forwards",
          },
        );

        averageAnimation = averageLine.animate(
          [{ strokeDashoffset: averageLength }, { strokeDashoffset: 0 }],
          {
            duration: LINE_DURATION_MS,
            easing: SMOOTH_EASE,
            fill: "forwards",
          },
        );

        glamAnimation = glamLine.animate(
          [{ strokeDashoffset: glamLength }, { strokeDashoffset: 0 }],
          {
            duration: LINE_DURATION_MS,
            delay: GLAM_LINE_DELAY_MS,
            easing: SMOOTH_EASE,
            fill: "forwards",
          },
        );

        legendTimer = window.setTimeout(() => {
          setLegendVisible(true);
          setGlamDashed(true);
        }, GLAM_LINE_DELAY_MS + LINE_DURATION_MS - 120);
      });
    });

    return () => {
      cancelAnimationFrame(frameOne);
      cancelAnimationFrame(frameTwo);
      averageAnimation?.cancel();
      areaAnimation?.cancel();
      glamAnimation?.cancel();
      if (legendTimer !== undefined) window.clearTimeout(legendTimer);
    };
  }, [visible]);

  useEffect(() => {
    const glamLine = glamLineRef.current;
    if (!glamLine || !glamDashed) return;
    glamLine.style.strokeDasharray = GLAM_LINE_DOT_PATTERN;
    glamLine.style.strokeDashoffset = "0";
  }, [glamDashed]);

  return (
    <div ref={containerRef} className="mx-auto w-full max-w-[26rem] sm:max-w-[30rem]">
      <div className="aspect-[444/240] w-full">
        <svg
          viewBox={VIEWBOX}
          className="h-full w-full"
          preserveAspectRatio="xMidYMid meet"
          role="img"
          aria-label="Chart comparing Glam repair skin wellness progress against the average over time"
        >
          <defs>
            <linearGradient
              id={AREA_FILL_ID}
              x1="0"
              y1="106.986"
              x2="0"
              y2="241.699"
              gradientUnits="userSpaceOnUse"
            >
              <stop offset="0%" stopColor="#4169E1" stopOpacity="0.12" />
              <stop offset="100%" stopColor="#4169E1" stopOpacity="0.01" />
            </linearGradient>
            <clipPath id={AREA_CLIP_ID}>
              <rect
                ref={clipRectRef}
                x={AREA_CLIP_X}
                y={AREA_CLIP_Y}
                height={AREA_CLIP_HEIGHT}
                width={0}
              />
            </clipPath>
          </defs>

          {/* Vertical Y-axis label */}
          <text
            transform="rotate(-90 26 124)"
            x={26}
            y={124}
            textAnchor="middle"
            dominantBaseline="middle"
            className="fill-brand-ink font-serif"
            fontSize={23}
          >
            Skin wellness level
          </text>

          {/* Grid lines */}
          {GRID_YS.map((y, index) => (
            <line
              key={y}
              x1={GRID_X1}
              y1={y}
              x2={GRID_X2}
              y2={y}
              stroke="#B7B8C1"
              strokeWidth="0.5"
              className="motion-reduce:opacity-100 motion-reduce:transition-none"
              style={{
                opacity: visible ? 1 : 0,
                transition: visible
                  ? `opacity ${GRID_DURATION_MS}ms ${SMOOTH_EASE} ${index * 80}ms`
                  : "none",
              }}
            />
          ))}

          {/* Area fill under the average line */}
          <path
            d={AREA_PATH}
            fill={`url(#${AREA_FILL_ID})`}
            clipPath={`url(#${AREA_CLIP_ID})`}
          />

          {/* On average — solid gray */}
          <path
            ref={averageLineRef}
            d={AVERAGE_PATH}
            fill="none"
            stroke="#C1C1C1"
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Glam repair — purple dotted */}
          <path
            ref={glamLineRef}
            d={GLAM_PATH}
            fill="none"
            stroke="#662D91"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray={glamDashed ? GLAM_LINE_DOT_PATTERN : undefined}
          />

          {/* Time label */}
          <text
            x={44}
            y={233}
            className="fill-black"
            fontSize={12}
          >
            Time
          </text>

          {/* Legend */}
          <g
            style={{
              opacity: legendVisible ? 1 : 0,
              transition: legendVisible
                ? `opacity 500ms ${SMOOTH_EASE}`
                : "none",
            }}
          >
            <circle cx={109} cy={253} r={6} fill="#662D91" />
            <text x={125} y={258} className="fill-black" fontSize={16}>
              Glam repair
            </text>
            <circle cx={260} cy={253} r={6} fill="#C1C1C1" />
            <text x={277} y={258} className="fill-black" fontSize={16}>
              On average
            </text>
          </g>
        </svg>
      </div>
    </div>
  );
}
