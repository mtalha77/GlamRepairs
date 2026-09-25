/**
 * The cells of the homepage comparison, shared by the desktop table
 * (CompareStrip) and the phone tabs (CompareTabs) so the two can never
 * disagree about what a row says.
 */

export type Cell =
  | { kind: "yes"; note?: string }
  | { kind: "no" }
  | { kind: "text"; value: string; strong?: boolean };

export type CompareRow = {
  label: string;
  products: Cell;
  clinic: Cell;
  us: Cell;
};

export type CompareColumnKey = "products" | "clinic" | "us";

export function Tick({ solid = false }: { solid?: boolean }) {
  return (
    <span
      aria-hidden
      className={`inline-grid h-6 w-6 shrink-0 place-items-center rounded-full ${
        solid
          ? "bg-brand-primary text-white"
          : "bg-brand-success/15 text-brand-success-strong"
      }`}
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.4" className="h-3 w-3" aria-hidden>
        <path d="M20 6L9 17l-5-5" />
      </svg>
    </span>
  );
}

export function CellContent({ cell, ours }: { cell: Cell; ours?: boolean }) {
  if (cell.kind === "no") {
    return (
      <>
        <span aria-hidden className="text-[1.1rem] leading-none text-brand-lavender">
          –
        </span>
        <span className="sr-only">No</span>
      </>
    );
  }
  if (cell.kind === "text") {
    return cell.strong ? (
      <strong className="font-semibold text-brand-ink">{cell.value}</strong>
    ) : (
      <span className="text-brand-gray">{cell.value}</span>
    );
  }
  return (
    <>
      <Tick solid={ours} />
      <span className="sr-only">Yes</span>
      {cell.note ? (
        <small
          className={`mt-1 block text-xs ${
            ours ? "font-medium text-brand-primary" : "text-brand-gray"
          }`}
        >
          {cell.note}
        </small>
      ) : null}
    </>
  );
}
