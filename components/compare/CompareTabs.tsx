"use client";

import Link from "next/link";
import { useId, useRef, useState, type KeyboardEvent } from "react";

import {
  Tick,
  type Cell,
  type CompareColumnKey,
  type CompareRow,
} from "@/components/compare/compareCells";

export type CompareColumn = {
  key: CompareColumnKey;
  /** Short label for the tab itself. */
  tab: string;
  /** Full name, shown at the top of the panel. */
  title: string;
  price: string;
  priceNote: string;
  /** Competitor prices are struck, ours never is — CompareStrip rule 2. */
  struck: boolean;
};

/**
 * The comparison on a phone — HOTFIX-41 §2.1.
 *
 * Below `sm` the three-column table was a 660px-wide table inside a sideways
 * scroller. A visitor saw the row labels and the first column, "Trying
 * products yourself", and the Glam Repairs column (the one the table
 * exists to show) was off the right edge. It was also 1,500px of the
 * homepage's height.
 *
 * Here the same rows appear one option at a time. Glam Repairs is selected
 * by default, so the view nobody has to tap for is the one we want read;
 * the clinic and do-it-yourself options are one tap away and render the
 * identical rows, so nothing is hidden that the table showed.
 *
 * A standard ARIA tabs pattern: arrow keys, Home and End move between
 * tabs, and only the selected tab is in the tab order.
 */
export default function CompareTabs({
  columns,
  rows,
  paidHref,
  paidPrice,
}: {
  columns: CompareColumn[];
  rows: CompareRow[];
  paidHref: string;
  paidPrice: string;
}) {
  const [selected, setSelected] = useState<CompareColumnKey>("us");
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const baseId = useId();
  const column = columns.find((c) => c.key === selected) ?? columns[0];
  const ours = column.key === "us";

  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const last = columns.length - 1;
    const next =
      event.key === "ArrowRight"
        ? index === last ? 0 : index + 1
        : event.key === "ArrowLeft"
          ? index === 0 ? last : index - 1
          : event.key === "Home"
            ? 0
            : event.key === "End"
              ? last
              : null;
    if (next === null) return;
    event.preventDefault();
    setSelected(columns[next].key);
    tabRefs.current[next]?.focus();
  }

  return (
    <div className="overflow-hidden rounded-[1.4rem] border border-brand-lavender/45 bg-white shadow-brand">
      <div
        role="tablist"
        aria-label="Compare the options"
        className="m-3 flex gap-1 rounded-full bg-brand-purple-soft p-1"
      >
        {columns.map((c, i) => {
          const active = c.key === selected;
          return (
            <button
              key={c.key}
              ref={(el) => {
                tabRefs.current[i] = el;
              }}
              type="button"
              role="tab"
              id={`${baseId}-tab-${c.key}`}
              aria-selected={active}
              aria-controls={`${baseId}-panel`}
              tabIndex={active ? 0 : -1}
              onClick={() => setSelected(c.key)}
              onKeyDown={(e) => onKeyDown(e, i)}
              className={`min-h-11 flex-1 rounded-full px-2 text-[0.8125rem] font-medium transition-colors motion-reduce:transition-none ${
                active
                  ? "bg-brand-primary text-white shadow-sm"
                  : "text-brand-primary hover:bg-white/70"
              }`}
            >
              {c.tab}
            </button>
          );
        })}
      </div>

      <div
        role="tabpanel"
        id={`${baseId}-panel`}
        aria-labelledby={`${baseId}-tab-${column.key}`}
      >
        <div
          className={`px-5 pb-4 pt-2 ${ours ? "bg-brand-purple-soft" : "bg-brand-cream-light"}`}
        >
          <p className="text-xs font-medium uppercase tracking-[0.06em] text-brand-gray">
            {column.title}
          </p>
          <p
            className={`mt-1 font-serif text-2xl font-semibold tracking-[-0.01em] ${
              ours ? "text-brand-primary" : "text-brand-ink"
            } ${
              column.struck
                ? "line-through decoration-brand-accent/80 decoration-[1.5px]"
                : ""
            }`}
          >
            {column.price}
          </p>
          <p className="mt-0.5 text-[0.6875rem] text-brand-gray">
            {column.priceNote}
          </p>
        </div>

        <ul className="px-5">
          {rows.map((row, index) => (
            <li
              key={row.label}
              className={`flex items-center justify-between gap-4 py-3 ${
                index === rows.length - 1 ? "" : "border-b border-brand-lavender/30"
              }`}
            >
              <div className="min-w-0 text-sm text-brand-ink">
                {row.label}
                <CellNote cell={row[column.key]} ours={ours} />
              </div>
              <CellMark cell={row[column.key]} ours={ours} />
            </li>
          ))}
        </ul>
      </div>

      <div className="border-t border-brand-lavender/45 bg-brand-cream-light px-5 py-5 text-center">
        <Link
          href={paidHref}
          className="gr-btn inline-flex min-h-12 items-center rounded-full bg-brand-primary px-8 text-[0.9375rem] font-medium text-white shadow-brand hover:bg-brand-primary-dark"
        >
          Get my assessment &rarr;
        </Link>
        <span className="mt-3 block text-[0.8125rem] text-brand-gray">
          {paidPrice}, one payment. Your plan arrives within 24 hours.
        </span>
      </div>
    </div>
  );
}

function CellNote({ cell, ours }: { cell: Cell; ours: boolean }) {
  if (cell.kind !== "yes" || !cell.note) return null;
  return (
    <small
      className={`mt-0.5 block text-xs ${
        ours ? "font-medium text-brand-primary" : "text-brand-gray"
      }`}
    >
      {cell.note}
    </small>
  );
}

function CellMark({ cell, ours }: { cell: Cell; ours: boolean }) {
  if (cell.kind === "text") {
    return cell.strong ? (
      <strong className="shrink-0 text-right text-sm font-semibold text-brand-ink">
        {cell.value}
      </strong>
    ) : (
      <span className="shrink-0 text-right text-sm text-brand-gray">{cell.value}</span>
    );
  }
  if (cell.kind === "no") {
    return (
      <span className="shrink-0">
        <span aria-hidden className="text-[1.1rem] leading-none text-brand-lavender">
          –
        </span>
        <span className="sr-only">No</span>
      </span>
    );
  }
  return (
    <span className="shrink-0">
      <Tick solid={ours} />
      <span className="sr-only">Yes</span>
    </span>
  );
}
