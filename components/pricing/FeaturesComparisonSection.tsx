import {
  buildComparisonRows,
  comparisonHeaders,
  type ComparisonCell,
} from "@/components/pricing/featureComparison";
import { getServerPricingRegion } from "@/lib/pricing/geo";

function CheckIcon() {
  return (
    <span className="mx-auto flex h-6 w-6 items-center justify-center rounded-full bg-[#34A853] sm:h-7 sm:w-7">
      <svg
        aria-hidden
        viewBox="0 0 16 12"
        className="h-3 w-4 text-white"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M1 6.2L5.4 10.6L15 1"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}

function ComparisonCellContent({ cell }: { cell: ComparisonCell }) {
  if (cell.type === "check") {
    return <CheckIcon />;
  }

  if (cell.type === "empty") {
    return null;
  }

  return (
    <span className="px-1 text-center font-sans text-sm font-medium leading-snug tracking-[-0.01em] text-[#242424] sm:text-[15px] lg:text-base">
      {cell.value}
    </span>
  );
}

export default async function FeaturesComparisonSection() {
  // HOTFIX-7 §1: region-aware Price row — see PricingSection.tsx for why
  // this must stay a per-request lookup, never a cached/static one.
  const region = await getServerPricingRegion();
  const comparisonRows = buildComparisonRows(region);

  return (
    <section className="bg-white px-4 pb-16 sm:px-6 sm:pb-20 lg:px-10 lg:pb-24 xl:px-12">
      <div className="mx-auto max-w-[86rem]">
        <h2 className="text-center text-brand-primary text-[2rem] sm:text-[2.75rem] lg:text-[3.25rem]">
          <span className="font-sans tracking-[-0.02em]">Price features</span>{" "}
          <span className="font-serif italic">Includes</span>
        </h2>

        <div className="mt-8 overflow-x-auto sm:mt-10">
          <div className="min-w-[48rem]">
            <div className="grid grid-cols-[1.6fr_repeat(3,1fr)] rounded-t-[10px] bg-[#EAD7FF]">
              {comparisonHeaders.map((label, index) => (
                <div
                  key={label}
                  className={`px-5 py-4 font-sans text-[15px] font-medium tracking-[-0.01em] text-brand-primary sm:px-6 sm:py-4 sm:text-base ${
                    index === 0 ? "text-left" : "text-center"
                  }`}
                >
                  {label}
                </div>
              ))}
            </div>

            <div className="overflow-hidden rounded-b-[10px] border border-t-0 border-[#d9d9d9]">
              {comparisonRows.map((row) => (
                <div
                  key={row.feature}
                  className="grid grid-cols-[1.6fr_repeat(3,1fr)] border-b border-[#d9d9d9] last:border-b-0"
                >
                  <div className="border-r border-[#d9d9d9] px-5 py-4 font-sans text-sm font-medium tracking-[-0.01em] text-[#242424] sm:px-6 sm:py-5 sm:text-[15px] lg:text-base">
                    {row.feature}
                  </div>
                  {row.values.map((cell, planIndex) => (
                    <div
                      key={`${row.feature}-${planIndex}`}
                      className={`flex items-center justify-center px-3 py-4 sm:px-4 sm:py-5 ${
                        planIndex < row.values.length - 1
                          ? "border-r border-[#d9d9d9]"
                          : ""
                      }`}
                    >
                      <ComparisonCellContent cell={cell} />
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
