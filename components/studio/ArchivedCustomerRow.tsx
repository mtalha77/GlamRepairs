"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";

import {
  permanentlyDeleteLeadAction,
  restoreLeadAction,
} from "@/lib/studio/actions";

/**
 * HANDOVER-18 §1 — one archived client, with the two things you can do.
 *
 * Restore is a plain button: nothing was destroyed, so it needs no
 * ceremony.
 *
 * Permanent delete requires typing the reference. "Are you sure?" is a
 * question people answer yes to without reading, and this cascades to the
 * reports, progress, follow-ups, contact edits and availability slots. The
 * reference has to be typed because that is not something you do by reflex
 * on the wrong row — and the button stays disabled until it matches, so the
 * check happens before the click rather than in a dialog after it.
 */

type ArchivedCustomerRowProps = {
  leadId: string;
  displayRef: string;
  fullName: string | null;
  email: string | null;
  deletedAt: string | null;
  deletionReason: string | null;
  photoCount: number;
  isTest: boolean;
};

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function ActionButton({
  disabled,
  idle,
  busy,
  destructive,
}: {
  disabled?: boolean;
  idle: string;
  busy: string;
  destructive?: boolean;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={disabled || pending}
      className={
        destructive
          ? "rounded-xl bg-brand-error px-4 py-2 text-sm text-white transition-opacity disabled:opacity-50"
          : "rounded-xl border border-brand-lavender/70 bg-white px-4 py-2 text-sm text-brand-ink transition-opacity disabled:opacity-50"
      }
    >
      {pending ? busy : idle}
    </button>
  );
}

export default function ArchivedCustomerRow({
  leadId,
  displayRef,
  fullName,
  email,
  deletedAt,
  deletionReason,
  photoCount,
  isTest,
}: ArchivedCustomerRowProps) {
  const [confirming, setConfirming] = useState(false);
  const [typed, setTyped] = useState("");

  const matches = typed.trim().toUpperCase() === displayRef.toUpperCase();

  return (
    <li className="rounded-2xl border border-brand-lavender/70 bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-medium text-brand-ink">
            {fullName || "Unnamed"}
            <span className="ml-2 font-mono text-xs text-brand-gray">
              {displayRef}
            </span>
            {isTest ? (
              <span className="ml-2 rounded-full bg-brand-lavender/40 px-2 py-0.5 text-[0.6875rem] text-brand-gray">
                test
              </span>
            ) : null}
          </p>
          <p className="mt-1 text-xs text-brand-gray">
            {email || "No email"} · archived {formatDate(deletedAt)}
            {deletionReason ? ` · ${deletionReason}` : ""}
          </p>
          <p className="mt-1 text-xs text-brand-gray">
            {photoCount === 0
              ? "No photographs in storage"
              : `${photoCount} photograph${photoCount === 1 ? "" : "s"} still in storage`}
          </p>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <form action={restoreLeadAction}>
            <input type="hidden" name="leadId" value={leadId} />
            <ActionButton idle="Restore" busy="Restoring…" />
          </form>
          {!confirming ? (
            <button
              type="button"
              onClick={() => setConfirming(true)}
              className="rounded-xl border border-brand-error/40 bg-white px-4 py-2 text-sm text-brand-error"
            >
              Delete permanently
            </button>
          ) : null}
        </div>
      </div>

      {confirming ? (
        <form
          action={permanentlyDeleteLeadAction}
          className="mt-4 rounded-xl border border-brand-error/30 bg-brand-error/5 p-4"
        >
          <input type="hidden" name="leadId" value={leadId} />
          <p className="text-sm leading-relaxed text-brand-ink">
            This deletes{" "}
            {photoCount > 0
              ? `${photoCount} photograph${photoCount === 1 ? "" : "s"} from storage and then `
              : ""}
            the client record itself, along with their reports, progress,
            follow-ups and contact history. It cannot be undone.
          </p>
          <label
            htmlFor={`confirm-${leadId}`}
            className="mt-3 block text-sm text-brand-ink"
          >
            Type <span className="font-mono">{displayRef}</span> to confirm
          </label>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <input
              id={`confirm-${leadId}`}
              name="confirmRef"
              type="text"
              value={typed}
              autoComplete="off"
              spellCheck={false}
              onChange={(event) => setTyped(event.target.value)}
              className="w-44 rounded-xl border border-brand-border-light/70 bg-white px-3 py-2 font-mono text-sm text-brand-ink"
            />
            <ActionButton
              destructive
              disabled={!matches}
              idle="Delete permanently"
              busy="Deleting…"
            />
            <button
              type="button"
              onClick={() => {
                setConfirming(false);
                setTyped("");
              }}
              className="text-sm text-brand-gray underline-offset-2 hover:underline"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : null}
    </li>
  );
}
