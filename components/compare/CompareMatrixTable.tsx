import type {
  CompareCell,
  CompareMatrix,
} from "@/lib/compare/compareMatrix";
import { compareSource } from "@/lib/compare/sources";

/**
 * HANDOVER-22 §5b — the matrix itself.
 *
 * Rendered as a real `<table>` with `<th scope>` on both axes rather than a
 * grid of divs. A twelve-by-six comparison read with a screen reader is
 * unusable without row and column headers, and it is also what lets a
 * crawler read the cells as belonging to "Price / Private clinic visit"
 * instead of as loose text.
 *
 * Wide by nature, so it scrolls inside its own container rather than making
 * the page scroll sideways.
 */

const TONE_CLASS: Record<string, string> = {
  win: "text-brand-ink",
  lose: "text-brand-gray",
  neutral: "text-brand-ink",
};

function Cell({
  cell,
  sourceIndex,
}: {
  cell: CompareCell;
  sourceIndex: number | null;
}) {
  return (
    <span className={TONE_CLASS[cell.tone ?? "neutral"]}>
      {cell.value}
      {sourceIndex !== null ? (
        <a
          href={`#source-${sourceIndex}`}
          className="ml-0.5 align-super text-[0.65em] text-brand-primary underline"
          aria-label={`Source ${sourceIndex}`}
        >
          {sourceIndex}
        </a>
      ) : null}
    </span>
  );
}

export default function CompareMatrixTable({
  matrix,
}: {
  matrix: CompareMatrix;
}) {
  const sourceNumber = (id?: string) =>
    id ? matrix.usedSourceIds.indexOf(id) + 1 : null;

  return (
    <div>
      <div className="overflow-x-auto rounded-2xl border border-black/10">
        <table className="w-full min-w-[56rem] border-collapse text-left text-sm">
          <caption className="sr-only">
            How a Glam Repairs assessment compares with a clinic visit, an
            online doctor, buying products, and free advice online.
          </caption>
          <thead>
            <tr className="border-b border-black/10 bg-black/[0.03]">
              <th scope="col" className="w-48 px-4 py-3 align-bottom font-semibold text-brand-ink">
                <span className="sr-only">Attribute</span>
              </th>
              {matrix.columns.map((column) => (
                <th
                  key={column.id}
                  scope="col"
                  className={`px-4 py-3 align-bottom font-semibold ${
                    column.ours
                      ? "bg-brand-lavender/30 text-brand-primary"
                      : "text-brand-ink"
                  }`}
                >
                  {column.label}
                  <span className="mt-0.5 block text-xs font-normal text-brand-gray">
                    {column.sublabel}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {matrix.rows.map((row) => (
              <tr key={row.id} className="border-b border-black/[0.07] last:border-0">
                <th
                  scope="row"
                  className="px-4 py-3.5 align-top font-medium text-brand-ink"
                >
                  {row.label}
                  {row.note ? (
                    <span className="mt-1 block text-xs font-normal leading-relaxed text-brand-gray">
                      {row.note}
                    </span>
                  ) : null}
                </th>
                {matrix.columns.map((column) => (
                  <td
                    key={column.id}
                    className={`px-4 py-3.5 align-top leading-relaxed ${
                      column.ours ? "bg-brand-lavender/15" : ""
                    }`}
                  >
                    <Cell
                      cell={row.cells[column.id]}
                      sourceIndex={sourceNumber(row.cells[column.id].sourceId)}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/*
        The sourcing note, directly under the table rather than at the foot
        of the page. A reader checking a number should not have to go
        looking for where it came from.
      */}
      <section className="mt-6 rounded-2xl bg-black/[0.03] px-5 py-5">
        <h3 className="text-sm font-semibold text-brand-ink">Where these numbers come from</h3>
        <ol className="mt-3 space-y-3 text-sm leading-relaxed text-brand-gray">
          {matrix.usedSourceIds.map((id, index) => {
            const source = compareSource(id);
            return (
              <li key={id} id={`source-${index + 1}`}>
                <span className="font-medium text-brand-ink">{index + 1}.</span>{" "}
                {source.supports}{" "}
                <a
                  href={source.url}
                  target="_blank"
                  rel="noopener nofollow"
                  className="text-brand-primary underline underline-offset-2"
                >
                  {source.label}
                </a>
                , read on{" "}
                {new Date(source.checkedOn).toLocaleDateString("en-GB", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
                .
              </li>
            );
          })}
        </ol>
        <p className="mt-4 text-sm leading-relaxed text-brand-gray">
          Consultation fees move, and the two fee figures above are readings
          from live listings on the date shown rather than permanent facts.
          The product-spend range is an illustrative estimate, not a survey
          figure, and is labelled as such in the table. Glam Repairs prices
          are our own published prices for {matrix.region.label}, read from
          the same place the pricing page reads them.
        </p>
      </section>
    </div>
  );
}
