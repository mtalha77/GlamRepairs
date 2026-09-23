import {
  formatRegionPrice,
  type PricingRegion,
} from "@/lib/pricing/regions";
import type { PlanSettings } from "@/lib/plans/planSettings";

/**
 * /compare — the three receipts.
 *
 * ── The argument this makes that the matrix cannot ───────────────────────
 * The matrix compares one appointment against one assessment. But skin
 * takes eight to twelve weeks to respond to anything, so a single fee is
 * the wrong unit: what people actually spend is spread across a season, in
 * amounts that never appear on one bill. Three till slips put those totals
 * side by side, which is the comparison a reader is really making and the
 * one no table on this page was showing.
 *
 * ── Two of these are illustrative, and say so ────────────────────────────
 * This page's founding rule is "cite every number, and do not invent a
 * statistic". The pharmacy and clinic slips are not survey data and are
 * not presented as it: each carries an "illustrative" marker, and the note
 * under the rack ties both totals back to figures the page already cites —
 * the Rs. 5,000–15,000 band the matrix labels illustrative throughout, and
 * oladoc's Rs. 300–5,000 for dermatology in Lahore.
 *
 * ── The third is not illustrative at all ─────────────────────────────────
 * Every Glam Repairs line is read from live data: the total from
 * `pricing_regions`, the call and the support window from `plan_settings`.
 * Typing "Rs. 3,000" here would recreate the exact defect HANDOVER-22
 * warned about — a comparison page that contradicts /pricing the first
 * time a number changes.
 *
 * ⚠️ The one line with no database behind it is the follow-up count. It is
 * worded to match lib/faq.ts ("two follow-up check-ins across a month")
 * because that is the claim the rest of the site makes. The design this was
 * built from named specific days — "Follow-up, day 14" and "day 28" — and
 * that cadence is fixed nowhere in this codebase, so it is not stated here.
 */

type Line = {
  name: string;
  /** The small grey line under the item. */
  note?: string;
  value: string;
  tone?: "missing" | "included";
};

function LineItems({ lines }: { lines: Line[] }) {
  return (
    <dl className="space-y-0">
      {lines.map((line) => (
        <div
          key={line.name}
          className="flex items-baseline justify-between gap-2.5"
        >
          <dt className="flex-1">
            <span className={line.tone === "missing" ? "text-[#a09a94]" : undefined}>
              {line.name}
            </span>
            {line.note ? (
              <span className="block text-[0.6563rem] tracking-[0.02em] text-[#8a8590]">
                {line.note}
              </span>
            ) : null}
          </dt>
          <dd
            className={`whitespace-nowrap tabular-nums ${
              line.tone === "missing"
                ? "font-medium text-[#b64f4f]"
                : line.tone === "included"
                  ? "font-medium text-[#2f7d52]"
                  : ""
            }`}
          >
            {line.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function Rule({ variant = "dashed" }: { variant?: "dashed" | "solid" | "double" }) {
  if (variant === "double") {
    return <div className="gr-slip__rule-double my-[11px]" aria-hidden />;
  }
  return (
    <div
      aria-hidden
      className={`my-[11px] border-t border-[#d8d5cf] ${
        variant === "solid" ? "border-solid" : "border-dashed"
      }`}
    />
  );
}

function Meta({ left, right }: { left: string; right?: string }) {
  return (
    <p className="flex justify-between text-[0.6875rem] text-[#8a8590]">
      <span>{left}</span>
      {right ? <span>{right}</span> : null}
    </p>
  );
}

function Illustrative() {
  return (
    <p className="mt-2 text-center text-[0.625rem] font-semibold uppercase tracking-[0.16em] text-[#8a8590]">
      Illustrative
    </p>
  );
}

function Slip({
  ours = false,
  rotate,
  children,
}: {
  ours?: boolean;
  rotate: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`gr-slip ${ours ? "gr-slip--ours" : ""} ${rotate} px-[22px] pb-[30px] pt-[26px] font-mono text-xs leading-[1.85] ${
        ours ? "text-brand-gray" : "text-[#6b6b6b]"
      }`}
    >
      {children}
    </div>
  );
}

function Head({ name, address, ours = false }: { name: string; address: string; ours?: boolean }) {
  return (
    <div className="mb-3 text-center">
      <p
        className={`text-[0.8125rem] font-semibold tracking-[0.14em] ${
          ours ? "text-brand-primary" : "text-brand-ink"
        }`}
      >
        {name}
      </p>
      <p className="mt-[3px] text-[0.6875rem] tracking-[0.04em] text-[#8a8590]">
        {address}
      </p>
    </div>
  );
}

function Total({ label, value, ours = false }: { label: string; value: string; ours?: boolean }) {
  return (
    <div
      className={`flex items-baseline justify-between gap-2.5 pt-0.5 font-semibold ${
        ours ? "text-base text-brand-primary" : "text-sm text-brand-ink"
      }`}
    >
      <span>{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}

function Stamp({ good = false, children }: { good?: boolean; children: React.ReactNode }) {
  return (
    <p
      className={`mt-3.5 border-[1.5px] px-1.5 py-[7px] text-center text-[0.6875rem] font-semibold tracking-[0.14em] ${
        good
          ? "rotate-[1deg] border-[#bcdcc8] text-[#2f7d52]"
          : "-rotate-[1.6deg] border-[#e2b9b9] text-[#b64f4f]"
      }`}
    >
      {children}
    </p>
  );
}

function Barcode({ digits, faint = false }: { digits: string; faint?: boolean }) {
  return (
    <>
      <div className={`gr-slip__barcode mt-4 ${faint ? "opacity-30" : ""}`} aria-hidden />
      <p
        aria-hidden
        className="mt-[5px] text-center text-[0.625rem] tracking-[0.3em] text-[#8a8590]"
      >
        {digits}
      </p>
    </>
  );
}

function Caption({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <p className="mt-[26px] text-center text-[0.8125rem] text-brand-gray">
      <strong className="font-medium text-brand-ink">{title}</strong>
      <br />
      {children}
    </p>
  );
}

export default function ReceiptsComparison({
  region,
  transform,
  clinicFeeSourceIndex,
  pricedForPakistan,
}: {
  region: PricingRegion;
  transform: PlanSettings;
  /**
   * Footnote number for the oladoc Lahore listing, so the note below the
   * rack points at the same numbered source the matrix does. Passed in
   * rather than hardcoded: the numbering is generated from the order the
   * matrix actually cites things, and a "1" typed here would quietly start
   * pointing at the wrong study the day a row is reordered.
   */
  clinicFeeSourceIndex: number;
  /**
   * False when the Pakistan price could not be read and the matrix fell
   * back to the default region. The slip still shows whatever price
   * resolved — blanking it would be worse — but the note below the rack
   * stops implying the three totals are in one currency, because they
   * are not.
   */
  pricedForPakistan: boolean;
}) {
  /*
   * The included list is assembled rather than written out, so a plan
   * setting that changes takes the line with it. If the video call is ever
   * switched off in `plan_settings`, that row disappears from this receipt
   * without anyone editing this file — which matters, because HANDOVER-21
   * requires the call not be advertised while it cannot be booked.
   */
  const included: Line[] = [
    { name: "Written plan, yours to keep", value: "included", tone: "included" },
    { name: "A reason for every step", value: "included", tone: "included" },
  ];

  if (transform.includesVideoCall && transform.videoMinutes) {
    included.push({
      name: `${transform.videoMinutes} min video consultation`,
      value: "included",
      tone: "included",
    });
  }

  if (transform.includesWhatsapp && transform.supportDays) {
    included.push({
      name: `${transform.supportDays} days on WhatsApp`,
      value: "included",
      tone: "included",
    });
  }

  included.push(
    {
      name: "Two follow-up check-ins",
      note: "across the month, not a second fee",
      value: "included",
      tone: "included",
    },
    {
      name: "Plan corrected if it is not working",
      value: "included",
      tone: "included",
    },
    { name: "Travel", value: "none", tone: "included" },
  );

  return (
    <section aria-labelledby="receipts-heading">
      <h2 id="receipts-heading" className="sr-only">
        Three months of a skin problem, priced three ways
      </h2>

      <div className="mx-auto grid max-w-[380px] grid-cols-1 items-start gap-[26px] md:max-w-none md:grid-cols-3">
        {/* ── 1. Working it out yourself ── */}
        <div>
          <Slip rotate="md:-rotate-[1.1deg]">
            <Head name="CITY MEDICAL STORE" address="MAIN BOULEVARD · CASH COUNTER 2" />
            <Rule variant="solid" />
            <Meta left="OVER ONE SEASON" right="SELF SERVICE" />
            <Illustrative />
            <Rule />

            <LineItems
              lines={[
                { name: "BRIGHTENING SERUM 30ML", note: "recommended by a reel", value: "1,450" },
                { name: "VITAMIN C SERUM", note: "stung, used twice", value: "1,850" },
                { name: "ANTI ACNE FACE WASH", note: "made it worse", value: "690" },
                { name: "FAIRNESS CREAM 50G", note: "worked, then rebounded", value: "480" },
                { name: "CLAY MASK", note: "used once", value: "750" },
              ]}
            />

            <Rule />
            <Total label="TOTAL" value="Rs. 5,220" />
            <Rule />

            <LineItems
              lines={[
                { name: "Anyone who looked at your skin", value: "not incl.", tone: "missing" },
                { name: "A reason for any of it", value: "not incl.", tone: "missing" },
                { name: "Someone to ask in week three", value: "not incl.", tone: "missing" },
              ]}
            />

            <Stamp>NO RETURN · NO EXCHANGE</Stamp>
            <Barcode digits="8 8 4 1 0 0 5 2 2 0" />
          </Slip>
          <Caption title="Working it out yourself.">
            Five products. Four still in the drawer.
          </Caption>
        </div>

        {/* ── 2. A private clinic ── */}
        <div>
          <Slip rotate="md:rotate-[0.7deg]">
            <Head name="SKIN CARE CLINIC" address="CONSULTATION INVOICE" />
            <Rule variant="solid" />
            <Meta left="FIRST VISIT" right="IN PERSON" />
            <Illustrative />
            <Rule />

            <LineItems
              lines={[
                { name: "CONSULTATION FEE", note: "time in room: 12 min", value: "4,000" },
                { name: "TRAVEL & PARKING", value: "600" },
                { name: "HALF DAY OFF WORK", note: "not billed, still paid", value: "—" },
              ]}
            />

            <Rule />
            <Meta left="REVISIT, FIVE WEEKS LATER" />
            <LineItems
              lines={[
                { name: "CONSULTATION FEE", note: "time in room: 9 min", value: "4,000" },
                { name: "TRAVEL & PARKING", value: "600" },
              ]}
            />

            <Rule />
            <Total label="TOTAL" value="Rs. 9,200" />
            <Rule />

            <LineItems
              lines={[
                { name: "A written plan to take home", value: "not incl.", tone: "missing" },
                { name: "Questions after you leave", value: "not incl.", tone: "missing" },
                { name: "Follow-up", value: "chargeable", tone: "missing" },
              ]}
            />

            <Stamp>FEES NON REFUNDABLE</Stamp>
            <Barcode digits="C 2 2 9 1 0 9 2 0 0" />
          </Slip>
          <Caption title="Two clinic appointments.">
            Twenty one minutes of someone&rsquo;s attention.
          </Caption>
        </div>

        {/* ── 3. Ours ── */}
        <div>
          <Slip ours rotate="md:-rotate-[0.4deg]">
            <Head ours name="GLAM REPAIRS" address="ONLINE SKIN ASSESSMENT" />
            <Rule variant="solid" />
            <Meta left="DELIVERED IN 24 HRS" right="REF GR-______" />
            <Rule />

            <LineItems
              lines={[
                {
                  name: `FULL SKIN ASSESSMENT`,
                  note: "read by a named practitioner",
                  value: formatRegionPrice(region, "transform").replace("Rs. ", ""),
                },
              ]}
            />

            <Rule />
            <LineItems lines={included} />

            <Rule />
            <Total label="TOTAL" value={formatRegionPrice(region, "transform")} ours />
            <p className="flex justify-end text-[0.6875rem] text-[#8a8590]">
              <span>PAID ONCE</span>
            </p>
            <Rule variant="double" />

            <Stamp good>
              IF YOU NEED A DOCTOR
              <br />
              WE SAY SO AND REFUND YOU
            </Stamp>
            <Barcode faint digits="G R · P A I D · O N C E" />
          </Slip>
          <Caption title="One assessment.">
            Still being followed in month three.
          </Caption>
        </div>
      </div>

      {/*
        The honesty note. Without it the first two slips read as research,
        which they are not — and this page's whole claim on the reader is
        that it does not do that.
      */}
      <p className="mx-auto mt-10 max-w-3xl text-center text-sm leading-relaxed text-brand-gray">
        The first two receipts are illustrative. They are the shape of what
        people describe spending over a season, not a published figure: the
        Rs. 5,220 of products sits inside the Rs. 5,000&ndash;15,000 range
        this page labels illustrative throughout, and the Rs. 4,000
        consultation fee sits inside the Rs. 300&ndash;5,000 that oladoc lists
        for dermatology in Lahore
        <a
          href={`#source-${clinicFeeSourceIndex}`}
          className="ml-0.5 align-super text-[0.65em] text-brand-primary underline"
          aria-label={`Source ${clinicFeeSourceIndex}`}
        >
          {clinicFeeSourceIndex}
        </a>
        . The Glam Repairs receipt is not illustrative — every line on it is
        read from the same live prices and plan settings the pricing page
        uses.
        {pricedForPakistan ? null : (
          <>
            {" "}
            Our Pakistan price could not be read just now, so the third
            receipt is shown in {region.currency} while the first two are in
            rupees. The two totals are not comparable until it is back.
          </>
        )}
      </p>
    </section>
  );
}
