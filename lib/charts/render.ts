import "server-only";

import {
  AQI_BANDS,
  bandForAqi,
  UNIT_LABEL,
  type Series,
} from "@/lib/data/airQuality";

/**
 * HANDOVER-38 §4a — the chart kit.
 *
 * Inline SVG built on the server from `lib/data/airQuality.ts`. No chart
 * library, no client JavaScript, nothing to hydrate and nothing to break:
 * these render inside blog post markdown, which is a string of HTML, so a
 * React chart component could not reach them anyway.
 *
 * ── The §6 checklist, enforced rather than remembered ────────────────────
 * Every figure this file produces states its unit in the subtitle, repeats
 * it on the axis note, and names its source in the figcaption — because
 * those come from required fields on `Series` and there is no code path
 * that omits them. A series with any `partial` point renders an asterisk
 * and its `partialNote` automatically. A chart takes exactly one series,
 * so it cannot mix units.
 *
 * ── Why bars are coloured by category ────────────────────────────────────
 * §4a: a reader should see that January is in unhealthy territory without
 * reading a number. AQI charts colour each bar by its band and draw the
 * thresholds faintly behind. Concentration charts do not, because there is
 * no standard band scale for raw micrograms and inventing one would be the
 * same error in the other direction.
 */

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const SANS = "Geist,system-ui,sans-serif";

/** A rounded "nice" ceiling, so the axis reads 200 rather than 193.4. */
function niceMax(values: number[]): number {
  const raw = Math.max(...values) * 1.16;
  const step = raw > 240 ? 60 : raw > 120 ? 30 : raw > 60 ? 20 : 10;
  return Math.ceil(raw / step) * step;
}

function axis(max: number, x0: number, x1: number, top: number, base: number): string {
  const out: string[] = [];
  for (let i = 0; i <= 4; i += 1) {
    const v = (max / 4) * i;
    const y = base - (v / max) * (base - top);
    out.push(
      `<line x1="${x0}" y1="${y.toFixed(1)}" x2="${x1}" y2="${y.toFixed(1)}" stroke="#e4e0ea" stroke-width=".8"/>` +
        `<text x="${x0 - 8}" y="${(y + 4).toFixed(1)}" text-anchor="end" font-size="11" fill="#8a8590" font-family="${SANS}">${Math.round(v)}</text>`,
    );
  }
  return out.join("");
}

/** The faint category bands behind an AQI chart. */
function bands(max: number, x0: number, x1: number, top: number, base: number): string {
  return AQI_BANDS.filter((b) => b.from < max)
    .map((b) => {
      const hi = Math.min(b.to, max);
      const yTop = base - (hi / max) * (base - top);
      const yBot = base - (b.from / max) * (base - top);
      const h = yBot - yTop;
      if (h <= 1) return "";
      return (
        `<rect x="${x0}" y="${yTop.toFixed(1)}" width="${x1 - x0}" height="${h.toFixed(1)}" fill="${b.colour}" opacity=".085"/>` +
        (h > 16
          ? `<text x="${x1 - 6}" y="${(yTop + 13).toFixed(1)}" text-anchor="end" font-size="9.5" fill="#9b95a3" font-family="${SANS}" letter-spacing=".06em">${esc(b.name.toUpperCase())}</text>`
          : "")
      );
    })
    .join("");
}

function figure(series: Series, svg: string, width: number, height: number): string {
  const anyPartial = series.points.some((p) => p.partial);
  const unit = UNIT_LABEL[series.unit];
  return [
    `<figure class="gr-figure">`,
    `<div class="gr-figure__head">`,
    `<div class="gr-figure__title">${esc(series.title)}</div>`,
    // §6 — the unit leads the subtitle on every single chart.
    `<div class="gr-figure__sub">${esc(unit)}. ${esc(series.subtitle)}</div>`,
    `</div>`,
    /*
     * HOTFIX-40 §2.1 — the accessible name comes from the SVG's own
     * <title> and <desc>, referenced by aria-labelledby, rather than a
     * flat aria-label. That is what lets the chart count as a described
     * image rather than an unlabelled one, and it keeps the description in
     * the markup where a crawler reads it too. Ids are namespaced by series
     * so two charts on one page cannot collide.
     */
    `<svg viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="${esc(series.id)}-t${series.desc ? ` ${esc(series.id)}-d` : ""}" xmlns="http://www.w3.org/2000/svg">`,
    `<title id="${esc(series.id)}-t">${esc(series.title)}. ${esc(unit)}.</title>`,
    series.desc ? `<desc id="${esc(series.id)}-d">${esc(series.desc)}</desc>` : "",
    svg,
    `</svg>`,
    `<figcaption>`,
    // The unit keeps its own casing: "US AQI" is an initialism and
    // lowercasing it produced "Figures in us aqi."
    `Source: ${esc(series.source)}. Figures in ${esc(series.unit === "aqi" ? unit : unit.toLowerCase())}.`,
    anyPartial && series.partialNote ? ` * ${esc(series.partialNote)}` : "",
    series.caption ? ` ${esc(series.caption)}` : "",
    `</figcaption>`,
    `</figure>`,
  ].join("");
}

/** Vertical bars. Coloured by AQI band when the unit is AQI. */
export function barChart(series: Series): string {
  const W = 740;
  const H = 330;
  const x0 = 46;
  const x1 = W - 16;
  const top = 30;
  const base = 270;
  const max = niceMax(series.points.map((p) => p.value));
  const n = series.points.length;
  const slot = (x1 - x0) / n;
  const bw = Math.min(56, slot * 0.62);

  const parts: string[] = [];
  if (series.unit === "aqi") parts.push(bands(max, x0, x1, top, base));
  parts.push(axis(max, x0, x1, top, base));

  // A labelled reference line, drawn only if it falls inside the scale.
  if (series.guideline && series.guideline.value < max) {
    const gy = base - (series.guideline.value / max) * (base - top);
    parts.push(
      `<line x1="${x0}" y1="${gy.toFixed(1)}" x2="${x1}" y2="${gy.toFixed(1)}" stroke="#2f7d52" stroke-width="1.5" stroke-dasharray="5 4"/>` +
        `<text x="${x1 - 4}" y="${(gy - 6).toFixed(1)}" text-anchor="end" font-size="11" font-weight="600" fill="#2f7d52" font-family="${SANS}">${esc(series.guideline.label)}</text>`,
    );
  }

  series.points.forEach((p, i) => {
    const cx = x0 + slot * (i + 0.5);
    const h = (p.value / max) * (base - top);
    const y = base - h;
    const fill = series.unit === "aqi" ? bandForAqi(p.value).colour : "#662d91";
    const label = p.partial ? `${p.label} *` : p.label;
    parts.push(
      `<rect x="${(cx - bw / 2).toFixed(1)}" y="${y.toFixed(1)}" width="${bw.toFixed(1)}" height="${h.toFixed(1)}" rx="3" fill="${fill}"/>`,
      `<text x="${cx.toFixed(1)}" y="${(y - 7).toFixed(1)}" text-anchor="middle" font-size="12" font-weight="600" fill="#2b2b2b" font-family="${SANS}">${p.value}</text>`,
      `<text x="${cx.toFixed(1)}" y="${base + 18}" text-anchor="middle" font-size="10.5" fill="#4a4a4a" font-family="${SANS}">${esc(label)}</text>`,
    );
  });

  parts.push(
    `<text x="${x0}" y="${H - 12}" font-size="10.5" fill="#8a8590" font-family="${SANS}">${esc(UNIT_LABEL[series.unit])}</text>`,
  );
  return figure(series, parts.join(""), W, H);
}

/** Horizontal bars, for many long labels — the station spread. */
export function rowChart(series: Series): string {
  const W = 740;
  const rowH = 30;
  const top = 16;
  const H = top + series.points.length * rowH + 40;
  const labelW = 150;
  const x0 = labelW + 12;
  const x1 = W - 60;
  const max = niceMax(series.points.map((p) => p.value));

  const parts: string[] = [];
  series.points.forEach((p, i) => {
    const y = top + i * rowH;
    const w = (p.value / max) * (x1 - x0);
    // The extremes carry the argument, so they carry the stronger colour.
    const isEdge = i === 0 || i === series.points.length - 1;
    parts.push(
      `<text x="${labelW}" y="${y + 15}" text-anchor="end" font-size="11.5" fill="#4a4a4a" font-family="${SANS}">${esc(p.label)}</text>`,
      `<rect x="${x0}" y="${y + 4}" width="${w.toFixed(1)}" height="16" rx="3" fill="${isEdge ? "#662d91" : "#a88ec3"}"/>`,
      `<text x="${(x0 + w + 7).toFixed(1)}" y="${y + 16}" font-size="11.5" font-weight="600" fill="#2b2b2b" font-family="${SANS}">${p.value}</text>`,
    );
  });
  parts.push(
    `<text x="${labelW}" y="${H - 10}" text-anchor="end" font-size="10.5" fill="#8a8590" font-family="${SANS}">${esc(UNIT_LABEL[series.unit])}</text>`,
  );
  return figure(series, parts.join(""), W, H);
}

/** Paired bars — worst and best month per year. */
export function pairedChart(series: Series): string {
  const W = 740;
  const H = 340;
  const x0 = 46;
  const x1 = W - 16;
  const top = 40;
  const base = 276;
  const max = niceMax(
    series.points.flatMap((p) => [p.value, p.secondary?.value ?? 0]),
  );
  const n = series.points.length;
  const slot = (x1 - x0) / n;
  const bw = Math.min(26, slot * 0.28);

  const parts: string[] = [axis(max, x0, x1, top, base)];
  parts.push(
    `<g font-family="${SANS}">` +
      `<rect x="${x0}" y="8" width="11" height="11" rx="2" fill="#662d91"/><text x="${x0 + 16}" y="18" font-size="11" fill="#4a4a4a">Worst month</text>` +
      `<rect x="${x0 + 110}" y="8" width="11" height="11" rx="2" fill="#d6cdea"/><text x="${x0 + 126}" y="18" font-size="11" fill="#4a4a4a">Best month</text>` +
      `</g>`,
  );

  series.points.forEach((p, i) => {
    const cx = x0 + slot * (i + 0.5);
    const draw = (v: number, mon: string, off: number, fill: string) => {
      const h = (v / max) * (base - top);
      const y = base - h;
      const bx = cx + off;
      return (
        `<rect x="${(bx - bw / 2).toFixed(1)}" y="${y.toFixed(1)}" width="${bw.toFixed(1)}" height="${h.toFixed(1)}" rx="3" fill="${fill}"/>` +
        `<text x="${bx.toFixed(1)}" y="${(y - 6).toFixed(1)}" text-anchor="middle" font-size="11" font-weight="600" fill="#2b2b2b" font-family="${SANS}">${v}</text>` +
        `<text x="${bx.toFixed(1)}" y="${base + 16}" text-anchor="middle" font-size="8.5" fill="#9b95a3" font-family="${SANS}">${esc(mon)}</text>`
      );
    };
    parts.push(draw(p.value, p.note ?? "", -bw * 0.6, "#662d91"));
    if (p.secondary) {
      parts.push(draw(p.secondary.value, p.secondary.label, bw * 0.6, "#d6cdea"));
    }
    parts.push(
      `<text x="${cx.toFixed(1)}" y="${base + 34}" text-anchor="middle" font-size="12" font-weight="600" fill="#4a4a4a" font-family="${SANS}">${esc(p.partial ? `${p.label} *` : p.label)}</text>`,
    );
  });

  parts.push(
    `<text x="${x0}" y="${H - 8}" font-size="10.5" fill="#8a8590" font-family="${SANS}">${esc(UNIT_LABEL[series.unit])}</text>`,
  );
  return figure(series, parts.join(""), W, H);
}

/** Picks the right shape for a series. One entry point for the shortcode. */
export function renderSeries(series: Series): string {
  if (series.points.some((p) => p.secondary)) return pairedChart(series);
  if (series.points.length > 8 && series.unit === "pm25") return rowChart(series);
  return barChart(series);
}
