"use client";

import Image from "next/image";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";

type BeforeAfterSliderProps = {
  beforeLabel?: string;
  afterLabel?: string;
  beforeSrc?: string;
  afterSrc?: string;
  imageAlt?: string;
  initialPosition?: number;
  className?: string;
  showLabels?: boolean;
  handleVariant?: "chevrons" | "arrow-right";
  contentScale?: number;
  imagePosition?: "bottom" | "center";
  priority?: boolean;
  unoptimized?: boolean;
  roundedClassName?: string;
  handleClassName?: string;
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const imagePositionClassName = {
  bottom: "object-bottom",
  center: "object-center",
} as const;

export default function BeforeAfterSlider({
  beforeLabel = "Before",
  afterLabel = "After",
  beforeSrc = "/images/skin-comparison/after.png",
  afterSrc = "/images/skin-comparison/before.png",
  imageAlt = "Before and after skin comparison",
  initialPosition = 50,
  className = "",
  showLabels = true,
  handleVariant = "chevrons",
  contentScale = 0.94,
  imagePosition = "bottom",
  priority = false,
  unoptimized = false,
  roundedClassName = "rounded-[20px]",
  handleClassName = "h-14 w-14",
}: BeforeAfterSliderProps) {
  const imageClassName = `pointer-events-none absolute inset-0 h-full w-full select-none object-cover ${imagePositionClassName[imagePosition]}`;
  const contentScaleStyle =
    contentScale === 1
      ? undefined
      : { transform: `scale(${contentScale})`, transformOrigin: "bottom" };
  const containerRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState(initialPosition);
  const [containerWidth, setContainerWidth] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateWidth = () => {
      setContainerWidth(container.offsetWidth);
    };

    updateWidth();

    const observer = new ResizeObserver(updateWidth);
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  const updatePositionFromClientX = useCallback((clientX: number) => {
    const container = containerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    if (rect.width <= 0) return;

    const next = ((clientX - rect.left) / rect.width) * 100;
    setPosition(clamp(next, 0, 100));
  }, []);

  const handlePointerDown = (event: ReactPointerEvent<HTMLElement>) => {
    event.preventDefault();
    setIsDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
    updatePositionFromClientX(event.clientX);
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLElement>) => {
    if (!isDragging) return;
    updatePositionFromClientX(event.clientX);
  };

  const endDrag = (event: ReactPointerEvent<HTMLElement>) => {
    if (!isDragging) return;
    setIsDragging(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      setPosition((prev) => clamp(prev - 2, 0, 100));
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      setPosition((prev) => clamp(prev + 2, 0, 100));
    } else if (event.key === "Home") {
      event.preventDefault();
      setPosition(0);
    } else if (event.key === "End") {
      event.preventDefault();
      setPosition(100);
    }
  };

  useEffect(() => {
    const handleWindowPointerUp = () => setIsDragging(false);
    window.addEventListener("pointerup", handleWindowPointerUp);
    return () => window.removeEventListener("pointerup", handleWindowPointerUp);
  }, []);

  const afterMaskWidth = clamp(100 - position, 0, 100);
  const afterImageOffset =
    containerWidth > 0 ? -(position / 100) * containerWidth : 0;

  const motionClass = isDragging
    ? ""
    : "transition-[width,left] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none";

  return (
    <div
      ref={containerRef}
      className={`relative h-full w-full overflow-hidden bg-brand-lavender ${roundedClassName} ${className}`}
    >
      <div className="absolute inset-0" style={contentScaleStyle}>
        <Image
          src={beforeSrc}
          alt={imageAlt}
          fill
          draggable={false}
          priority={priority}
          unoptimized={unoptimized}
          sizes="(max-width: 1024px) 100vw, 400px"
          className={imageClassName}
        />

        <div
          className={`absolute inset-y-0 z-[1] overflow-hidden ${motionClass}`}
          style={{
            left: `${position}%`,
            width: `${afterMaskWidth}%`,
          }}
          aria-hidden="true"
        >
          {containerWidth > 0 && (
            <div
              className="relative h-full"
              style={{
                width: containerWidth,
                marginLeft: afterImageOffset,
              }}
            >
              <Image
                src={afterSrc}
                alt=""
                fill
                draggable={false}
                unoptimized={unoptimized}
                sizes="(max-width: 1024px) 100vw, 400px"
                className={imageClassName}
              />
            </div>
          )}
        </div>
      </div>

      {showLabels && (
        <div className="pointer-events-none absolute inset-x-0 top-0 z-[2] flex justify-between px-4 pt-4 sm:px-7 sm:pt-7">
          <span className="font-serif text-lg font-bold leading-none tracking-[0.01em] text-white sm:text-[1.375rem]">
            {beforeLabel}
          </span>
          <span className="font-serif text-lg font-bold leading-none tracking-[0.01em] text-white sm:text-[1.375rem]">
            {afterLabel}
          </span>
        </div>
      )}

      <div
        className={`pointer-events-none absolute top-0 bottom-0 z-[3] w-[2px] -translate-x-1/2 bg-white ${motionClass}`}
        style={{ left: `${position}%` }}
        aria-hidden="true"
      />

      <div
        className="absolute inset-0 z-[4] cursor-ew-resize touch-none"
        aria-hidden="true"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      />

      <button
        type="button"
        role="slider"
        aria-label="Before and after comparison"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(position)}
        className={`pointer-events-none absolute z-[5] flex ${handleClassName} -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-0 bg-white p-0 shadow-[0_2px_12px_rgba(0,0,0,0.14)] outline-none select-none focus-visible:pointer-events-auto focus-visible:cursor-ew-resize focus-visible:ring-2 focus-visible:ring-white/80 focus-visible:ring-offset-2 focus-visible:ring-offset-brand-lavender ${motionClass}`}
        style={{ left: `${position}%`, top: "50%" }}
        onKeyDown={handleKeyDown}
        tabIndex={0}
      >
        {handleVariant === "arrow-right" ? (
          <svg
            width="14"
            height="12"
            viewBox="0 0 14 12"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="text-brand-ink"
            aria-hidden="true"
          >
            <path
              d="M1.5 6H11.5M11.5 6L7 1.5M11.5 6L7 10.5"
              stroke="currentColor"
              strokeWidth="1.25"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        ) : (
          <svg
            width="18"
            height="10"
            viewBox="0 0 18 10"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="text-brand-ink"
            aria-hidden="true"
          >
            <path
              d="M5.75 1L1.25 5L5.75 9"
              stroke="currentColor"
              strokeWidth="1.25"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M12.25 1L16.75 5L12.25 9"
              stroke="currentColor"
              strokeWidth="1.25"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </button>

    </div>
  );
}
