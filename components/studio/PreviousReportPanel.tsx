"use client";

import { useState } from "react";

import type { StudioReport } from "@/lib/studio/reports";

/**
 * HANDOVER-20 Part 1 — what this person was told last time.
 *
 * Sits directly above the report editor, because the moment it is useful is
 * the moment before writing. The handover calls the returning client "the
 * highest-value item here commercially", and the reason is continuity: a
 * second assessment that opens with "last time we started you on
 * niacinamide, how did that go?" is a different product from a second
 * assessment that starts from a blank questionnaire.
 *
 * Collapsed by default with the previous "What we noticed" showing, so the
 * practitioner sees the substance without the editor being pushed off the
 * screen by a full previous report.
 */

type PreviousReportPanelProps = {
  reports: StudioReport[];
};

const SECTIONS: [keyof StudioReport, string][] = [
  ["noticed", "What we noticed"],
  ["startHere", "Start here"],
  ["morningRoutine", "Morning routine"],
  ["nightRoutine", "Night routine"],
  ["avoidItems", "What to avoid"],
  ["timeline", "What to expect"],
  ["goodSigns", "Good signs"],
  ["warningSigns", "Stop and message us if"],
  ["extraNotes", "Extra notes"],
];

function formatDate(value: string | null) {
  if (!value) return "not sent";
  return new Date(value).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function monthsSince(value: string | null) {
  if (!value) return null;
  const then = new Date(value).getTime();
  if (Number.isNaN(then)) return null;
  const days = Math.floor((Date.now() - then) / (1000 * 60 * 60 * 24));
  if (days < 31) return `${days} day${days === 1 ? "" : "s"} ago`;
  const months = Math.round(days / 30);
  return `${months} month${months === 1 ? "" : "s"} ago`;
}

export default function PreviousReportPanel({
  reports,
}: PreviousReportPanelProps) {
  const [openId, setOpenId] = useState<string | null>(reports[0]?.id ?? null);

  if (reports.length === 0) return null;

  return (
    <section className="rounded-2xl border border-brand-primary/30 bg-brand-lavender/15 p-5">
      <h2 className="font-serif text-xl text-brand-primary">
        What we told {reports.length === 1 ? "them" : "them"} last time
      </h2>
      <p className="mt-1.5 text-sm leading-relaxed text-brand-gray">
        Read this before writing the new assessment. Ask how the previous
        routine went — that follow-up is what a repeat assessment is for.
      </p>

      <ul className="mt-4 space-y-3">
        {reports.map((report) => {
          const open = openId === report.id;
          const ago = monthsSince(report.sentAt);
          return (
            <li
              key={report.id}
              className="rounded-xl border border-brand-lavender/70 bg-white"
            >
              <h3>
                <button
                  type="button"
                  onClick={() => setOpenId(open ? null : report.id)}
                  aria-expanded={open}
                  aria-controls={`previous-report-${report.id}`}
                  className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
                >
                  <span className="text-sm text-brand-ink">
                    Sent {formatDate(report.sentAt)}
                    {ago ? (
                      <span className="text-brand-gray"> · {ago}</span>
                    ) : null}
                    <span className="text-brand-gray">
                      {" "}
                      · by {report.authorName}
                    </span>
                  </span>
                  <span className="shrink-0 text-xs text-brand-gray">
                    {open ? "Hide" : "Read"}
                  </span>
                </button>
              </h3>

              <div
                id={`previous-report-${report.id}`}
                hidden={!open}
                className="border-t border-brand-lavender/70 px-4 py-3"
              >
                {SECTIONS.map(([key, label]) => {
                  const value = report[key];
                  if (typeof value !== "string" || !value.trim()) return null;
                  return (
                    <div key={String(key)} className="mb-3 last:mb-0">
                      <h4 className="text-xs font-medium uppercase tracking-wide text-brand-gray">
                        {label}
                      </h4>
                      {/* Their line breaks carried meaning when it was written. */}
                      <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-brand-ink">
                        {value}
                      </p>
                    </div>
                  );
                })}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
