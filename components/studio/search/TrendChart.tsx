import type { TrendPoint } from "@/lib/gsc/dashboard";

/**
 * Daily clicks and impressions — HANDOVER-46 §4.2. Plain server-rendered
 * SVG, no chart library.
 *
 * Two small charts sharing one date axis, not one chart with two y-axes:
 * a dual axis lets the scale choice invent a crossing or a divergence the
 * data does not have. Each point carries a <title>, so hovering shows the
 * day and the value without any client JavaScript.
 */

/** Plot coordinates. The SVG stretches to its box; labels are HTML so text stays readable at any width. */
const W = 1000;
const H = 100;

function niceMax(v: number) {
  if (v <= 0) return 1;
  const pow = 10 ** Math.floor(Math.log10(v));
  const step = [1, 2, 2.5, 5, 10].find((m) => m * pow >= v) ?? 10;
  return step * pow;
}

const fmt = new Intl.NumberFormat("en-GB");
const day = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });

function Series({
  points,
  pick,
  label,
  showDates,
}: {
  points: TrendPoint[];
  pick: (p: TrendPoint) => number;
  label: string;
  showDates: boolean;
}) {
  const max = niceMax(Math.max(...points.map(pick)));
  const n = points.length;
  const xPct = (i: number) => (n === 1 ? 50 : (i / (n - 1)) * 100);
  const x = (i: number) => (xPct(i) / 100) * W;
  const y = (v: number) => H - (v / max) * H;
  const d = points.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(pick(p)).toFixed(1)}`).join(" ");
  const ticks = [0, max / 2, max];
  const every = Math.max(1, Math.ceil(n / 6));
  const total = points.reduce((sum, p) => sum + pick(p), 0);

  return (
    <figure>
      <figcaption className="flex items-baseline justify-between text-sm">
        <span className="font-medium">{label}</span>
        <span className="text-neutral-500">{fmt.format(total)} in this range</span>
      </figcaption>
      <div className={`relative mt-3 pl-12 ${showDates ? "pb-6" : ""}`}>
        <div className="relative h-28">
          {ticks.map((t) => (
            <span
              key={t}
              className="absolute -left-12 w-10 -translate-y-1/2 text-right text-xs tabular-nums text-neutral-500"
              style={{ top: `${100 - (t / max) * 100}%` }}
            >
              {fmt.format(t)}
            </span>
          ))}
          <svg
            viewBox={`0 0 ${W} ${H}`}
            preserveAspectRatio="none"
            className="absolute inset-0 h-full w-full overflow-visible"
            role="img"
            aria-label={`${label} per day`}
          >
            {ticks.map((t) => (
              <line key={t} x1={0} x2={W} y1={y(t)} y2={y(t)} stroke="#e5e5e5" strokeWidth={1} vectorEffect="non-scaling-stroke" />
            ))}
            <path
              d={d}
              fill="none"
              stroke="#662d91"
              strokeWidth={2}
              strokeLinejoin="round"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
            />
            {/* A full-height invisible hit area per day: easier to hover than a 2px line. */}
            {points.map((p, i) => (
              <rect key={p.date} x={x(i) - W / n / 2} y={0} width={W / n} height={H} fill="transparent">
                <title>{`${day(p.date)}: ${fmt.format(pick(p))} ${label.toLowerCase()}`}</title>
              </rect>
            ))}
          </svg>
        </div>
        {showDates
          ? points.map((p, i) =>
              i % every === 0 ? (
                <span
                  key={p.date}
                  // Every other date only at phone width, where six do not fit.
                  className={`absolute bottom-0 -translate-x-1/2 whitespace-nowrap text-xs text-neutral-500 ${
                    (i / every) % 2 === 1 ? "hidden sm:block" : ""
                  }`}
                  style={{ left: `calc(3rem + (100% - 3rem) * ${xPct(i) / 100})` }}
                >
                  {day(p.date)}
                </span>
              ) : null,
            )
          : null}
      </div>
    </figure>
  );
}

export default function TrendChart({ points }: { points: TrendPoint[] }) {
  if (points.length === 0) {
    return <p className="text-sm text-neutral-500">No daily data yet. It appears after the first sync.</p>;
  }
  return (
    <div className="space-y-4">
      <Series points={points} pick={(p) => p.clicks} label="Clicks" showDates={false} />
      <Series points={points} pick={(p) => p.impressions} label="Impressions" showDates />
    </div>
  );
}
