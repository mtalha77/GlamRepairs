"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";

import { deleteLeadPhotosAction } from "@/lib/studio/actions";
import {
  MANUAL_PHOTO_DELETION_REASONS,
  PHOTO_DELETION_REASON_LABEL,
  type PhotoDeletionReason,
} from "@/lib/leads/deleteLeadPhotos";

/**
 * HANDOVER-19 — "delete photographs, keep the client".
 *
 * Deliberately separate from archiving a lead and from deleting one. Those
 * are about tidying a view; this destroys a person's face permanently and
 * keeps everything else, which is a different decision with different
 * consequences. Putting them side by side as one menu of destructive
 * actions is how the wrong one gets picked.
 *
 * The confirmation names the exact count and the reference, per the
 * handover, because "are you sure?" is a question people answer yes to
 * without reading.
 */

type DeletePhotosButtonProps = {
  leadId: string;
  displayRef: string;
  photoCount: number;
};

function SubmitButton({ disabled, count }: { disabled: boolean; count: number }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={disabled || pending}
      className="rounded-xl border border-brand-error/40 bg-white px-4 py-2 text-sm text-brand-error transition-opacity disabled:opacity-50"
    >
      {pending
        ? "Deleting…"
        : `Delete ${count} photograph${count === 1 ? "" : "s"}`}
    </button>
  );
}

export default function DeletePhotosButton({
  leadId,
  displayRef,
  photoCount,
}: DeletePhotosButtonProps) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<PhotoDeletionReason | "">("");
  const [note, setNote] = useState("");

  if (photoCount === 0) return null;

  const ready = reason !== "" && (reason !== "other" || note.trim() !== "");

  const confirm = (event: React.FormEvent<HTMLFormElement>) => {
    const message =
      `Permanently delete ${photoCount} photograph${photoCount === 1 ? "" : "s"} for ${displayRef}?\n\n` +
      `The assessment, report and client record are kept. ` +
      `The photographs cannot be recovered.`;
    if (!window.confirm(message)) {
      event.preventDefault();
    }
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-xl border border-brand-error/40 bg-white px-4 py-2 text-sm text-brand-error"
      >
        Delete photographs
      </button>
    );
  }

  return (
    <form
      action={deleteLeadPhotosAction}
      onSubmit={confirm}
      className="rounded-2xl border border-brand-error/30 bg-brand-error/5 p-4"
    >
      <input type="hidden" name="leadId" value={leadId} />
      <p className="mb-3 text-sm leading-relaxed text-brand-ink">
        Deleting {photoCount} photograph{photoCount === 1 ? "" : "s"} for{" "}
        <span className="font-mono text-xs">{displayRef}</span>. The client
        record, assessment and report are kept.
      </p>

      <label
        htmlFor="photo-delete-reason"
        className="mb-2 block text-sm text-brand-ink"
      >
        Reason
      </label>
      <select
        id="photo-delete-reason"
        name="reason"
        value={reason}
        onChange={(event) =>
          setReason(event.target.value as PhotoDeletionReason | "")
        }
        className="mb-3 w-full rounded-xl border border-brand-border-light/70 bg-white px-3 py-2.5 text-sm text-brand-ink"
      >
        <option value="">Choose a reason…</option>
        {MANUAL_PHOTO_DELETION_REASONS.map((value) => (
          <option key={value} value={value}>
            {PHOTO_DELETION_REASON_LABEL[value]}
          </option>
        ))}
      </select>

      {reason === "other" ? (
        <>
          <label
            htmlFor="photo-delete-note"
            className="mb-2 block text-sm text-brand-ink"
          >
            Say why
          </label>
          <input
            id="photo-delete-note"
            name="reasonNote"
            type="text"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            className="mb-3 w-full rounded-xl border border-brand-border-light/70 bg-white px-3 py-2.5 text-sm text-brand-ink"
          />
        </>
      ) : null}

      {reason === "client_request" ? (
        <p className="mb-3 rounded-xl bg-white/70 px-3 py-2 text-xs leading-relaxed text-brand-gray">
          Recorded as a deletion request under the privacy policy, with your
          name and the date. Keep any message where the client asked.
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <SubmitButton disabled={!ready} count={photoCount} />
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-sm text-brand-gray underline-offset-2 hover:underline"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
