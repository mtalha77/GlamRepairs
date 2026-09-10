"use client";

import { useState } from "react";

import type { StudioCustomer } from "@/lib/studio/customerTypes";
import { photosAreExpired } from "@/lib/studio/customerTypes";
import { describePhotoDeletionReason } from "@/lib/leads/deleteLeadPhotos";

type PhotoGalleryProps = {
  customer: StudioCustomer;
};

export default function PhotoGallery({ customer }: PhotoGalleryProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const expired = photosAreExpired(customer);
  const urls = customer.imageUrls.filter(Boolean);

  if (expired) {
    /**
     * HANDOVER-19 — say when and why, not just that they are gone.
     *
     * This is the sentence you read back to a client who asks whether their
     * images have been deleted, so it has to carry the date and the reason
     * rather than a generic "expired after 30 days" that is untrue whenever
     * a person deleted them deliberately.
     */
    const deletedOn = customer.photosDeletedAt
      ? new Date(customer.photosDeletedAt).toLocaleDateString("en-GB", {
          day: "numeric",
          month: "long",
          year: "numeric",
        })
      : null;
    const reason = customer.photosDeletionReason
      ? describePhotoDeletionReason(customer.photosDeletionReason)
      : null;

    return (
      <p className="rounded-2xl border border-dashed border-brand-lavender bg-brand-purple-soft/40 px-4 py-6 text-sm leading-relaxed text-brand-gray">
        {deletedOn
          ? `Photographs deleted on ${deletedOn}`
          : "Photographs have been deleted"}
        {reason ? ` \u00b7 reason: ${reason}` : ""}. The assessment and any
        report are kept.
      </p>
    );
  }

  if (urls.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-brand-lavender bg-white px-4 py-6 text-sm text-brand-gray">
        No photos uploaded.
      </p>
    );
  }

  const activeUrl = activeIndex != null ? urls[activeIndex] : null;

  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {urls.map((url, index) => (
          <button
            key={`${url}-${index}`}
            type="button"
            onClick={() => setActiveIndex(index)}
            className="overflow-hidden rounded-2xl border border-brand-lavender/70 bg-white"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={url}
              alt={`Assessment photo ${index + 1}`}
              className="h-36 w-full object-cover sm:h-44"
            />
          </button>
        ))}
      </div>
      {activeUrl ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Photo preview"
          onClick={() => setActiveIndex(null)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={activeUrl}
            alt="Assessment photo preview"
            className="max-h-[90vh] max-w-full rounded-2xl object-contain"
            onClick={(event) => event.stopPropagation()}
          />
        </div>
      ) : null}
    </>
  );
}
