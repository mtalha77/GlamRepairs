"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";

import { anonymiseLeadAction, archiveLeadAction } from "@/lib/studio/actions";

/**
 * HANDOVER-18 §1 — the two destructive actions on a lead, kept apart.
 *
 * "Archive" and "Delete client data on request" are different actions with
 * different consequences, and the handover is explicit that they must not
 * be presented as one. Archiving tidies your own view and is reversible.
 * A deletion request is a legal obligation that destroys the photographs
 * and erases the personal data for good.
 *
 * So: archive is the ordinary button every staff member gets. The privacy
 * path is super admin only, visually separated, and needs the reference
 * typed out.
 */

type LeadDangerZoneProps = {
  leadId: string;
  displayRef: string;
  canErase: boolean;
};

function SubmitButton({
  idle,
  busy,
  destructive,
  disabled,
}: {
  idle: string;
  busy: string;
  destructive?: boolean;
  disabled?: boolean;
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

export default function LeadDangerZone({
  leadId,
  displayRef,
  canErase,
}: LeadDangerZoneProps) {
  const [erasing, setErasing] = useState(false);
  const [typed, setTyped] = useState("");
  const matches = typed.trim().toUpperCase() === displayRef.toUpperCase();

  return (
    <section className="rounded-2xl border border-brand-lavender/70 bg-white p-5">
      <h2 className="mb-1 font-serif text-xl text-brand-primary">
        Remove this client
      </h2>
      <p className="mb-4 text-sm leading-relaxed text-brand-gray">
        Archiving hides the client from every list and can be undone. Nothing
        is destroyed and the photographs stay, so a mistake costs nothing.
      </p>

      <form action={archiveLeadAction} className="space-y-3">
        <input type="hidden" name="leadId" value={leadId} />
        <div>
          <label
            htmlFor="archive-reason"
            className="mb-2 block text-sm text-brand-ink"
          >
            Reason <span className="text-brand-gray">(optional)</span>
          </label>
          <input
            id="archive-reason"
            name="reason"
            type="text"
            placeholder="internal test data, duplicate, no longer a client…"
            className="w-full rounded-xl border border-brand-border-light/70 bg-white px-3 py-2.5 text-sm text-brand-ink"
          />
        </div>
        <SubmitButton idle="Archive client" busy="Archiving…" />
      </form>

      {canErase ? (
        <div className="mt-6 border-t border-brand-lavender/70 pt-5">
          <h3 className="text-sm font-medium text-brand-ink">
            Delete client data on request
          </h3>
          <p className="mt-1.5 text-sm leading-relaxed text-brand-gray">
            For a client exercising their right to deletion under the privacy
            policy. Deletes the photographs from storage, then erases their
            name, email, phone, answers and notes. The row is kept for
            accounting, and who actioned it is recorded.
          </p>

          {!erasing ? (
            <button
              type="button"
              onClick={() => setErasing(true)}
              className="mt-3 rounded-xl border border-brand-error/40 bg-white px-4 py-2 text-sm text-brand-error"
            >
              Erase personal data
            </button>
          ) : (
            <form
              action={anonymiseLeadAction}
              className="mt-3 rounded-xl border border-brand-error/30 bg-brand-error/5 p-4"
            >
              <input type="hidden" name="leadId" value={leadId} />
              <label
                htmlFor="erase-confirm"
                className="block text-sm text-brand-ink"
              >
                Type <span className="font-mono">{displayRef}</span> to confirm
              </label>
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <input
                  id="erase-confirm"
                  name="confirmRef"
                  type="text"
                  value={typed}
                  autoComplete="off"
                  spellCheck={false}
                  onChange={(event) => setTyped(event.target.value)}
                  className="w-44 rounded-xl border border-brand-border-light/70 bg-white px-3 py-2 font-mono text-sm text-brand-ink"
                />
                <SubmitButton
                  destructive
                  disabled={!matches}
                  idle="Erase personal data"
                  busy="Erasing…"
                />
                <button
                  type="button"
                  onClick={() => {
                    setErasing(false);
                    setTyped("");
                  }}
                  className="text-sm text-brand-gray underline-offset-2 hover:underline"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      ) : null}
    </section>
  );
}
