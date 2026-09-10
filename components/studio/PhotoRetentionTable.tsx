"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";

import { bulkDeleteLeadPhotosAction } from "@/lib/studio/actions";
import {
  MANUAL_PHOTO_DELETION_REASONS,
  PHOTO_DELETION_REASON_LABEL,
  type PhotoDeletionReason,
} from "@/lib/leads/deleteLeadPhotos";
import type { PhotoStatusRow } from "@/lib/studio/photoRetention";

/**
 * HANDOVER-19 — the retention table, with bulk selection.
 *
 * The bulk path exists for one reason stated plainly in the handover:
 * "Clearing 23 overdue leads one at a time is how it does not get done."
 *
 * Two deliberate frictions survive the bulk action, because this deletes
 * people's faces and cannot be undone:
 *   1. a reason is required before the button enables, and
 *   2. the confirmation names the exact number of photographs and clients.
 * Neither is a modal that can be click-through dismissed — the count is
 * recomputed from the current selection every render.
 */

type PhotoRetentionTableProps = {
  rows: PhotoStatusRow[];
  /** Selection and deletion are only offered where they can succeed. */
  canDelete: boolean;
};

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** Negative days mean overdue, and that is the number worth shouting. */
function retentionLabel(row: PhotoStatusRow) {
  if (row.photosDeletedAt) return "Deleted";
  if (row.photoCount === 0) return "—";
  if (row.daysUntilAutoDelete === null) return "No expiry set";
  if (row.daysUntilAutoDelete < 0) {
    const days = Math.abs(row.daysUntilAutoDelete);
    return `${days} day${days === 1 ? "" : "s"} overdue`;
  }
  if (row.daysUntilAutoDelete === 0) return "Due today";
  return `${row.daysUntilAutoDelete} day${row.daysUntilAutoDelete === 1 ? "" : "s"} left`;
}

function DeleteButton({
  disabled,
  label,
}: {
  disabled: boolean;
  label: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={disabled || pending}
      className="rounded-xl bg-brand-error px-5 py-2.5 text-sm text-white transition-opacity disabled:opacity-50"
    >
      {pending ? "Deleting…" : label}
    </button>
  );
}

export default function PhotoRetentionTable({
  rows,
  canDelete,
}: PhotoRetentionTableProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [reason, setReason] = useState<PhotoDeletionReason | "">("");
  const [note, setNote] = useState("");

  // Only rows that still have files can be selected — offering a checkbox
  // that deletes nothing makes the count meaningless.
  const selectableRows = rows.filter(
    (row) => row.photoCount > 0 && !row.photosDeletedAt,
  );
  const selectableIds = selectableRows.map((row) => row.leadId);
  const allSelected =
    selectableIds.length > 0 && selectableIds.every((id) => selected.has(id));

  const selectedRows = selectableRows.filter((row) => selected.has(row.leadId));
  const selectedPhotoCount = selectedRows.reduce(
    (sum, row) => sum + row.photoCount,
    0,
  );

  const reasonReady = reason !== "" && (reason !== "other" || note.trim() !== "");
  const blocked = selectedRows.length === 0 || !reasonReady;

  const toggle = (leadId: string) =>
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(leadId)) next.delete(leadId);
      else next.add(leadId);
      return next;
    });

  const toggleAll = () =>
    setSelected(allSelected ? new Set() : new Set(selectableIds));

  const confirmBulk = (event: React.FormEvent<HTMLFormElement>) => {
    const message =
      `Permanently delete ${selectedPhotoCount} photograph${selectedPhotoCount === 1 ? "" : "s"} ` +
      `for ${selectedRows.length} client${selectedRows.length === 1 ? "" : "s"}?\n\n` +
      `The assessments, reports and client records are kept. ` +
      `The photographs cannot be recovered.`;
    if (!window.confirm(message)) {
      event.preventDefault();
    }
  };

  if (rows.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-brand-lavender bg-white px-4 py-8 text-center text-sm text-brand-gray">
        Nothing in this state.
      </p>
    );
  }

  return (
    <form action={bulkDeleteLeadPhotosAction} onSubmit={confirmBulk}>
      <div className="overflow-x-auto rounded-2xl border border-brand-lavender/70 bg-white">
        <table className="w-full min-w-[46rem] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-brand-lavender/70 text-xs uppercase tracking-wide text-brand-gray">
              {canDelete ? (
                <th scope="col" className="w-10 px-4 py-3">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleAll}
                    disabled={selectableIds.length === 0}
                    aria-label="Select every client in this list"
                    className="h-4 w-4 accent-brand-primary"
                  />
                </th>
              ) : null}
              <th scope="col" className="px-4 py-3 font-medium">Reference</th>
              <th scope="col" className="px-4 py-3 font-medium">Name</th>
              <th scope="col" className="px-4 py-3 font-medium">Photos</th>
              <th scope="col" className="px-4 py-3 font-medium">Retention</th>
              <th scope="col" className="px-4 py-3 font-medium">Report sent</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const selectable = row.photoCount > 0 && !row.photosDeletedAt;
              const overdue =
                row.daysUntilAutoDelete !== null && row.daysUntilAutoDelete < 0;
              return (
                <tr
                  key={row.leadId}
                  className="border-b border-brand-lavender/40 last:border-b-0"
                >
                  {canDelete ? (
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        name="leadIds"
                        value={row.leadId}
                        checked={selected.has(row.leadId)}
                        onChange={() => toggle(row.leadId)}
                        disabled={!selectable}
                        aria-label={`Select ${row.displayRef}`}
                        className="h-4 w-4 accent-brand-primary disabled:opacity-40"
                      />
                    </td>
                  ) : null}
                  <td className="px-4 py-3">
                    <a
                      href={`/studio/customers/${row.leadId}`}
                      className="font-mono text-xs text-brand-primary underline-offset-2 hover:underline"
                    >
                      {row.displayRef}
                    </a>
                  </td>
                  <td className="px-4 py-3 text-brand-ink">
                    {row.fullName || "—"}
                    {row.isTest ? (
                      <span className="ml-2 rounded-full bg-brand-lavender/40 px-2 py-0.5 text-[0.6875rem] text-brand-gray">
                        test
                      </span>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 tabular-nums text-brand-ink">
                    {row.photoCount}
                  </td>
                  <td
                    className={`px-4 py-3 ${overdue ? "font-medium text-brand-error" : "text-brand-gray"}`}
                  >
                    {retentionLabel(row)}
                    {row.photosDeletedAt && row.photosDeletionReason ? (
                      <span className="block text-xs text-brand-gray/80">
                        {row.photosDeletionReason}
                      </span>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-brand-gray">
                    {formatDate(row.reportSentAt)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {canDelete ? (
        <div className="mt-4 rounded-2xl border border-brand-lavender/70 bg-brand-lavender/10 p-4">
          <div className="flex flex-wrap items-end gap-4">
            <div className="min-w-[14rem] flex-1">
              <label
                htmlFor="bulk-reason"
                className="mb-2 block text-sm text-brand-ink"
              >
                Reason for deletion
              </label>
              <select
                id="bulk-reason"
                name="reason"
                value={reason}
                onChange={(event) =>
                  setReason(event.target.value as PhotoDeletionReason | "")
                }
                className="w-full rounded-xl border border-brand-border-light/70 bg-white px-3 py-2.5 text-sm text-brand-ink"
              >
                <option value="">Choose a reason…</option>
                {MANUAL_PHOTO_DELETION_REASONS.map((value) => (
                  <option key={value} value={value}>
                    {PHOTO_DELETION_REASON_LABEL[value]}
                  </option>
                ))}
              </select>
            </div>
            {reason === "other" ? (
              <div className="min-w-[14rem] flex-1">
                <label
                  htmlFor="bulk-reason-note"
                  className="mb-2 block text-sm text-brand-ink"
                >
                  Say why
                </label>
                <input
                  id="bulk-reason-note"
                  name="reasonNote"
                  type="text"
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  className="w-full rounded-xl border border-brand-border-light/70 bg-white px-3 py-2.5 text-sm text-brand-ink"
                />
              </div>
            ) : null}
            <DeleteButton
              disabled={blocked}
              label={
                selectedRows.length === 0
                  ? "Delete photographs"
                  : `Delete ${selectedPhotoCount} photograph${selectedPhotoCount === 1 ? "" : "s"}`
              }
            />
          </div>
          <p className="mt-3 text-xs leading-relaxed text-brand-gray">
            {selectedRows.length === 0
              ? "Select clients above. The client records, assessments and reports are always kept — only the images are removed."
              : `${selectedRows.length} client${selectedRows.length === 1 ? "" : "s"} selected. The records are kept; the photographs cannot be recovered.`}
          </p>
        </div>
      ) : null}
    </form>
  );
}
