"use client";

import { useState } from "react";

import { SAMPLE_PHOTOS } from "@/components/testPortal/sampleData";
import { useTestMode } from "@/components/testPortal/TestModeContext";

/**
 * Test mode only: fill the photo slots with the sample close-ups in one
 * tap. Each file goes through the same `onFile` the file picker uses, so
 * the real photo checker runs on it.
 */
export default function SamplePhotosButton({
  slots,
  onFile,
}: {
  slots: number;
  onFile: (slot: number, file: File) => Promise<void>;
}) {
  const testMode = useTestMode();
  const [busy, setBusy] = useState(false);
  if (!testMode) return null;

  const fill = async () => {
    setBusy(true);
    try {
      for (let slot = 0; slot < slots; slot += 1) {
        const url = SAMPLE_PHOTOS[slot % SAMPLE_PHOTOS.length];
        const blob = await (await fetch(url)).blob();
        await onFile(slot, new File([blob], url.split("/").pop() ?? "sample.jpg", { type: blob.type || "image/jpeg" }));
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      onClick={fill}
      disabled={busy}
      className="mt-4 w-full rounded-full border-2 border-dashed border-brand-accent bg-brand-cream-light px-4 py-2.5 text-sm font-semibold text-brand-primary disabled:opacity-60"
    >
      {busy ? "Adding sample photos…" : "Test mode: use sample photos"}
    </button>
  );
}
