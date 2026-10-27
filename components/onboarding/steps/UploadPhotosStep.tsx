"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import CameraUploadIcon from "@/components/onboarding/CameraUploadIcon";
import ClientNotesField from "@/components/onboarding/ClientNotesField";
import UploadSupportNote from "@/components/onboarding/UploadSupportNote";
import { StepHeader, StepRequiredError } from "@/components/steps";
import { resolveUnlockTarget } from "@/lib/funnel/funnelProgress";
import { processPhoto } from "@/lib/funnel/image";
import {
  PHOTO_CHECKS_ANSWER_KEY,
  PHOTO_HINTS,
  slotHint,
  type PhotoCheck,
} from "@/lib/funnel/photoCheck";
import { useFunnelStore } from "@/lib/funnel/useFunnelStore";
import {
  useStepAnswer,
  useStepRequiredError,
} from "@/lib/funnel/useStepAnswer";

type PlanId = "free" | "clarity" | "transform";

const PHOTO_SLOTS = [
  {
    label: "Front face",
    illustration: "/svgs/ChatGPT Image Jun 22, 2026, 12_52_18 PM1 1.svg",
  },
  {
    label: "Left/concern",
    illustration: "/svgs/ChatGPT Image Jun 22, 2026, 12_52_18 PMed 2.svg",
  },
  {
    label: "Right/concern",
    illustration: "/svgs/ChatGPT Image Jun 22, 2026, 12_52_18 PMed 2 (1).svg",
  },
  {
    label: "3/4 left",
    illustration: "/svgs/ChatGPT Image Jun 22, 2026, 12_52_18 11 4.svg",
    flip: true,
  },
  {
    label: "3/4 right",
    illustration: "/svgs/ChatGPT Image Jun 22, 2026, 12_52_18 11 4.svg",
  },
  {
    label: "from below",
    illustration: "/svgs/ChatGPT Image Jun 22, 2026, 12_52_18 1 1.svg",
  },
] as const;

const PLAN_PHOTO_LIMITS: Record<PlanId, number> = {
  free: 1,
  clarity: 3,
  transform: 6,
};

const EMPTY_PHOTOS: (string | null)[] = Array(PHOTO_SLOTS.length).fill(null);
const EMPTY_CHECKS: (PhotoCheck | null)[] = Array(PHOTO_SLOTS.length).fill(null);


function Tick({ className = "" }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 12 10" className={className} fill="none">
      <path d="M1 5.2L4.2 8.4L11 1.6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const PHOTO_TIPS = ["Face a window", "No makeup", "Beauty filter off"];

function getPhotoLimit(plan: string | null): number {
  if (plan === "clarity" || plan === "transform" || plan === "free") {
    return PLAN_PHOTO_LIMITS[plan];
  }
  return PLAN_PHOTO_LIMITS.free;
}

function areAllPhotosUploaded(
  photos: (string | null)[] | undefined,
  photoLimit: number,
) {
  if (!Array.isArray(photos)) return false;
  for (let index = 0; index < photoLimit; index += 1) {
    if (!photos[index]) return false;
  }
  return true;
}

function InfoIcon() {
  return (
    <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-brand-light text-[10px] font-semibold leading-none text-white sm:h-[1.125rem] sm:w-[1.125rem] sm:text-[11px]">
      i
    </span>
  );
}

function PrivacyShieldIcon() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 16 18"
      className="h-4 w-4 shrink-0 text-brand-light"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M8 0.75L1.75 3.25V8.25C1.75 12.05 4.55 15.55 8 16.75C11.45 15.55 14.25 12.05 14.25 8.25V3.25L8 0.75Z"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinejoin="round"
      />
      <path
        d="M5.75 9.25L7.25 10.75L10.5 7.5"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

type UploadPhotosFooterProps = {
  backHref: string;
  nextHref: string;
};

export function UploadPhotosFooter({ backHref, nextHref }: UploadPhotosFooterProps) {
  const photos = useFunnelStore(
    (state) => state.answers["onboarding.photos"] as (string | null)[] | undefined,
  );
  const selectedPlan = useFunnelStore((state) => state.selectedPlan);
  const photoLimit = getPhotoLimit(selectedPlan);
  const unlockFlowStep = useFunnelStore((state) => state.unlockFlowStep);
  const requestStepValidation = useFunnelStore(
    (state) => state.requestStepValidation,
  );
  const clearStepValidationAttempt = useFunnelStore(
    (state) => state.clearStepValidationAttempt,
  );
  const allPhotosUploaded = areAllPhotosUploaded(photos, photoLimit);

  return (
    <div className="flex items-center justify-between gap-4">
      <Link
        href={backHref}
        aria-label="Go back"
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-brand-border-light bg-white text-brand-gray shadow-sm transition-opacity hover:opacity-80"
      >
        <svg
          aria-hidden
          viewBox="0 0 16 16"
          className="h-4 w-4"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M10 3L5 8L10 13"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </Link>

      {allPhotosUploaded ? (
        <Link
          href={nextHref}
          onClick={() => {
            clearStepValidationAttempt();
            const target = resolveUnlockTarget("onboarding", nextHref);
            if (target !== null) unlockFlowStep("onboarding", target);
          }}
          className="subscribe-fill-btn min-h-12 flex-1 rounded-full bg-brand-light px-6 py-3 text-center text-xs font-normal uppercase tracking-[0.15em] text-white sm:py-3.5 sm:text-sm"
        >
          Upload Photos
        </Link>
      ) : (
        <button
          type="button"
          onClick={requestStepValidation}
          className="subscribe-fill-btn min-h-12 flex-1 rounded-full bg-brand-light px-6 py-3 text-center text-xs font-normal uppercase tracking-[0.15em] text-white sm:py-3.5 sm:text-sm"
        >
          Upload Photos
        </button>
      )}
    </div>
  );
}

export default function UploadPhotosStep() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [activeSlot, setActiveSlot] = useState<number | null>(null);
  const selectedPlan = useFunnelStore((state) => state.selectedPlan);
  const photoLimit = getPhotoLimit(selectedPlan);
  const visibleSlots = useMemo(
    () => PHOTO_SLOTS.slice(0, photoLimit),
    [photoLimit],
  );
  const [photos, setPhotos] = useStepAnswer<(string | null)[]>(
    "onboarding.photos",
    EMPTY_PHOTOS,
  );
  // HANDOVER-58 Part 13 — measured values per slot, never shown to the
  // client. Stored with the answers so the studio can see whether a photo
  // was flagged and used anyway.
  const [checks, setChecks] = useStepAnswer<(PhotoCheck | null)[]>(
    PHOTO_CHECKS_ANSWER_KEY,
    EMPTY_CHECKS,
  );
  const [processingSlot, setProcessingSlot] = useState<number | null>(null);
  const clearStepValidationAttempt = useFunnelStore(
    (state) => state.clearStepValidationAttempt,
  );
  const allPhotosUploaded = areAllPhotosUploaded(photos, photoLimit);
  const error = useStepRequiredError(
    !allPhotosUploaded,
    photoLimit === 1
      ? "Front face photo is required."
      : `All ${photoLimit} photos are required.`,
  );

  useEffect(() => {
    if (allPhotosUploaded) {
      clearStepValidationAttempt();
    }
  }, [allPhotosUploaded, clearStepValidationAttempt]);

  // Drop photos beyond the current plan limit if the user changed plans.
  useEffect(() => {
    if (!Array.isArray(photos)) return;
    if (photos.length <= photoLimit) return;

    const trimmed = photos.slice(0, photoLimit);
    while (trimmed.length < photoLimit) trimmed.push(null);
    setPhotos(trimmed);
    if (Array.isArray(checks) && checks.length > photoLimit) setChecks(checks.slice(0, photoLimit));
  }, [photoLimit, photos, setPhotos, checks, setChecks]);

  const setCheck = (slot: number, check: PhotoCheck | null) => {
    const current = useFunnelStore.getState().answers[PHOTO_CHECKS_ANSWER_KEY];
    const next = Array.isArray(current) ? [...(current as (PhotoCheck | null)[])] : [];
    while (next.length < photoLimit) next.push(null);
    next[slot] = check;
    setChecks(next.slice(0, photoLimit));
  };

  const openFilePicker = (index: number) => {
    if (index >= photoLimit) return;
    setActiveSlot(index);
    inputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    const slot = activeSlot;
    event.target.value = "";
    setActiveSlot(null);
    if (!file || slot === null || slot >= photoLimit) return;

    setProcessingSlot(slot);
    try {
      const { dataUrl, check } = await processPhoto(file);
      const current = useFunnelStore.getState().answers["onboarding.photos"];
      const next = Array.isArray(current) ? [...(current as (string | null)[])] : [];
      while (next.length < photoLimit) next.push(null);
      next[slot] = dataUrl;
      setPhotos(next.slice(0, photoLimit));
      setCheck(slot, check);
    } catch {
      // Keep existing photos if compression fails.
    } finally {
      setProcessingSlot(null);
    }
  };

  const acceptPhoto = (slot: number) => {
    const check = Array.isArray(checks) ? checks[slot] : null;
    if (check) setCheck(slot, { ...check, override: true });
  };

  const flagged = visibleSlots
    .map((slot, index) => ({ slot, index, hint: photos[index] ? slotHint(index, checks) : null }))
    .filter((item) => item.hint !== null);
  const allSet = allPhotosUploaded && flagged.length === 0;

  // HANDOVER-58 Part 1.2 — the filter sentence is the single most important
  // line on this step. Beauty filters are on by default in many camera apps,
  // and a smoothed photograph cannot be read.
  const subtitle =
    photoLimit === 1
      ? "A clear front-face photo. Taken on your phone is perfect. Turn off any beauty filter or smoothing in your camera settings."
      : `Front face and concern areas, ${photoLimit} photos. Taken on your phone is perfect. Turn off any beauty filter or smoothing in your camera settings.`;

  return (
    <div>
      <StepHeader
        title="Upload your photos"
        subtitle={subtitle}
        subtitleClassName="mt-2 text-sm leading-relaxed text-brand-gray sm:mt-2.5 sm:text-[0.9375rem]"
      />

      <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5 text-[0.8125rem] text-brand-gray sm:text-sm">
        {PHOTO_TIPS.map((tip) => (
          <li key={tip} className="inline-flex items-center gap-1.5">
            <Tick className="h-2.5 w-3 text-brand-success" />
            {tip}
          </li>
        ))}
      </ul>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />

      <div
        className={`mt-5 grid gap-2.5 sm:mt-6 sm:gap-3 ${
          photoLimit === 1
            ? "mx-auto max-w-[10.5rem] grid-cols-1"
            : "grid-cols-3"
        }`}
      >
        {visibleSlots.map((slot, index) => (
          <div key={slot.label} className="flex flex-col gap-1.5">
            <button
              type="button"
              onClick={() => openFilePicker(index)}
              aria-label={`Upload ${slot.label} photo`}
              className={`relative aspect-[3/4] overflow-hidden rounded-[1.1rem] border bg-white shadow-sm transition-opacity hover:opacity-95 ${
                error && !photos[index]
                  ? "border-brand-error"
                  : "border-brand-border-light/50"
              }`}
            >
              {processingSlot === index ? (
                <span className="absolute inset-0 z-[2] flex items-center justify-center bg-white/70 text-[0.6875rem] text-brand-gray">
                  Checking…
                </span>
              ) : null}
              {photos[index] ? (
                <>
                <span
                  className={`absolute right-1.5 top-1.5 z-[1] flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-semibold text-white shadow-sm ${
                    slotHint(index, checks) ? "bg-brand-primary" : "bg-brand-success"
                  }`}
                  aria-label={slotHint(index, checks) ? "Worth a look" : "Looks good"}
                >
                  {slotHint(index, checks) ? "!" : <Tick className="h-2 w-2.5" />}
                </span>
                <Image
                  src={photos[index]!}
                  alt={`${slot.label} photo`}
                  fill
                  sizes="(max-width: 640px) 30vw, 120px"
                  /* HANDOVER-23 §2.1 — scale in from 0.94, staggered by
                     slot so several photos added at once arrive in order
                     rather than all at the same instant. Keyed on the data
                     URL so replacing a photo re-runs the animation and the
                     swap is visible. */
                  key={photos[index]}
                  style={{ animationDelay: `${index * 60}ms` }}
                  className="photo-thumb-in object-cover"
                  unoptimized
                />
                </>
              ) : (
                <>
                  <span className="pointer-events-none absolute left-2 top-2 z-[1]">
                    <InfoIcon />
                  </span>

                  <span className="absolute inset-x-0 bottom-6 top-5 flex items-end justify-center px-1.5 sm:bottom-7 sm:top-6">
                    <Image
                      src={slot.illustration}
                      alt=""
                      width={80}
                      height={115}
                      unoptimized
                      className={`h-auto max-h-full w-auto max-w-[72%] object-contain object-bottom ${
                        "flip" in slot && slot.flip ? "-scale-x-100" : ""
                      }`}
                    />
                  </span>

                  <span className="pointer-events-none absolute bottom-2 right-2 z-[1] sm:bottom-2.5 sm:right-2.5">
                    <CameraUploadIcon />
                  </span>
                </>
              )}
            </button>

            <span className="text-center text-[0.6875rem] leading-snug text-brand-gray sm:text-xs">
              {slot.label}
            </span>
          </div>
        ))}
      </div>
      <StepRequiredError message={error} />

      {/* One friendly sentence per flagged photo, never a list of problems,
          and never a block: "Use this one" always works. */}
      {flagged.map(({ slot, index, hint }) => (
        <div
          key={slot.label}
          className="mt-3 flex items-start gap-3 rounded-2xl border border-brand-border-light/60 bg-brand-cream-card px-3 py-3 sm:px-4"
        >
          <span className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-white">
            <Image src={photos[index]!} alt="" fill sizes="48px" className="object-cover" unoptimized />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[0.8125rem] font-medium text-brand-ink sm:text-sm">{slot.label}</p>
            <p className="mt-0.5 text-[0.8125rem] leading-snug text-brand-gray sm:text-sm">{PHOTO_HINTS[hint!]}</p>
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                onClick={() => openFilePicker(index)}
                className="rounded-full border border-brand-border-light bg-white px-3.5 py-1.5 text-xs text-brand-gray"
              >
                Retake
              </button>
              <button
                type="button"
                onClick={() => acceptPhoto(index)}
                className="rounded-full bg-brand-light px-3.5 py-1.5 text-xs text-white"
              >
                Use this one
              </button>
            </div>
          </div>
        </div>
      ))}

      {allSet ? (
        <p className="mt-4 flex items-center gap-2 rounded-2xl bg-brand-success/10 px-4 py-3 text-sm font-medium text-brand-success-strong">
          <Tick className="h-2.5 w-3" />
          All set. You can carry on.
        </p>
      ) : null}

      <ClientNotesField />

      <UploadSupportNote />

      <div className="mt-5 flex items-center justify-center gap-2 rounded-2xl border border-brand-border-light/50 bg-white px-3 py-2.5 shadow-sm sm:mt-6 sm:gap-2.5 sm:px-4 sm:py-3">
        <PrivacyShieldIcon />
        <p className="text-[0.6875rem] leading-snug text-brand-gray sm:text-xs">
          Private. Reviewed only by certified practitioners. Never shared.
        </p>
      </div>
    </div>
  );
}
