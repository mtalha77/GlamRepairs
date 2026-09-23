/**
 * A very small Markdown → HTML renderer.
 *
 * ── Why not a library ────────────────────────────────────────────────────────
 * The repo has eight runtime dependencies and no markdown parser. Adding one
 * (plus a sanitiser, which you would need alongside it) for a handful of
 * article pages is a poor trade. This covers exactly the subset the articles
 * use and nothing else.
 *
 * ── Safety ───────────────────────────────────────────────────────────────────
 * Input is escaped FIRST, then markdown constructs are re-introduced. That
 * ordering matters: it means raw HTML in the source is rendered as visible text
 * rather than executed. Article bodies are staff-authored, but "staff-authored"
 * is not a security model — a compromised studio account should not become
 * stored XSS on the public site.
 */
const ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

import { getSeries } from "@/lib/data/airQuality";
import { renderSeries } from "@/lib/charts/render";

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ESCAPES[c] ?? c);
}

/** Inline: **bold**, *italic*, `code`, [text](url). */
function inline(s: string) {
  return s
    .replace(/`([^`]+)`/g, '<code class="rounded bg-black/[0.06] px-1 py-0.5 text-[0.9em]">$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|[^*])\*([^*]+)\*/g, "$1<em>$2</em>")
    .replace(
      // Only http(s) and root-relative links. Blocks javascript: and data:.
      /\[([^\]]+)\]\((https?:\/\/[^)\s]+|\/[^)\s]*)\)/g,
      (_m, text: string, href: string) =>
        href.startsWith("/")
          ? `<a class="underline underline-offset-2" href="${href}">${text}</a>`
          : `<a class="underline underline-offset-2" href="${href}" target="_blank" rel="noopener nofollow">${text}</a>`,
    );
}

/**
 * HANDOVER-38 §4a — `[chart:series-id]` on its own line.
 *
 * Blog posts are rows in `studio_blog_posts`, rendered as a string of HTML
 * through `dangerouslySetInnerHTML`. A React chart component cannot reach
 * inside that, so the charts are built as SVG strings on the server and a
 * shortcode is what lets an author place one — which is what "build once
 * and reuse across all six articles" requires.
 *
 * The token survives `escapeHtml` because square brackets are not escaped,
 * so this matches after escaping and the chart HTML is injected whole.
 *
 * An unknown id renders a visible marker rather than failing the page or
 * silently vanishing: a missing chart in a published article should be
 * obvious to whoever looks at it, not discovered by a reader.
 */
const CHART_RE = /^\[chart:([a-z0-9-]+)\]$/i;

export function renderMarkdown(md: string): string {
  const lines = escapeHtml(md.replace(/\r\n/g, "\n")).split("\n");
  const out: string[] = [];
  let inList = false;
  let inOrdered = false;
  let para: string[] = [];

  const flushPara = () => {
    if (para.length) {
      out.push(`<p>${inline(para.join(" "))}</p>`);
      para = [];
    }
  };
  const closeList = () => {
    if (inList) {
      out.push(inOrdered ? "</ol>" : "</ul>");
      inList = false;
      inOrdered = false;
    }
  };

  for (const raw of lines) {
    const line = raw.trimEnd();

    if (!line.trim()) {
      flushPara();
      closeList();
      continue;
    }

    const chart = CHART_RE.exec(line.trim());
    if (chart) {
      flushPara();
      closeList();
      const series = getSeries(chart[1]);
      out.push(
        series
          ? renderSeries(series)
          : `<p class="gr-figure__missing">Chart not found: ${escapeHtml(chart[1])}</p>`,
      );
      continue;
    }

    const heading = /^(#{2,4})\s+(.*)$/.exec(line);
    if (heading) {
      flushPara();
      closeList();
      const level = heading[1].length; // h2–h4; h1 belongs to the page title
      out.push(`<h${level}>${inline(heading[2])}</h${level}>`);
      continue;
    }

    if (/^[-*]\s+/.test(line)) {
      flushPara();
      // A bullet inside a numbered list ends it, rather than nesting.
      if (inList && inOrdered) closeList();
      if (!inList) {
        out.push("<ul>");
        inList = true;
        inOrdered = false;
      }
      out.push(`<li>${inline(line.replace(/^[-*]\s+/, ""))}</li>`);
      continue;
    }

    /*
     * Ordered lists — HOTFIX-39 §5.
     *
     * There was no branch for these at all, so "1. Cleanse every evening…"
     * fell through to the paragraph accumulator and rendered as one run-on
     * <p> with the numerals as literal text. Two costs: it reads as a wall,
     * and there is no <ol> for a list rich result or an answer engine to
     * lift, which is the traffic these pages are best placed to win.
     *
     * `start` is honoured so a list that genuinely begins at 3 still reads
     * correctly, rather than being silently renumbered from 1.
     */
    const ordered = /^(\d{1,3})[.)]\s+(.*)$/.exec(line);
    if (ordered) {
      flushPara();
      if (inList && !inOrdered) closeList();
      if (!inList) {
        const start = Number(ordered[1]);
        out.push(start === 1 ? "<ol>" : `<ol start="${start}">`);
        inList = true;
        inOrdered = true;
      }
      out.push(`<li>${inline(ordered[2])}</li>`);
      continue;
    }

    if (/^&gt;\s?/.test(line)) {
      flushPara();
      closeList();
      out.push(`<blockquote>${inline(line.replace(/^&gt;\s?/, ""))}</blockquote>`);
      continue;
    }

    if (/^---+$/.test(line)) {
      flushPara();
      closeList();
      out.push("<hr />");
      continue;
    }

    para.push(line.trim());
  }

  flushPara();
  closeList();
  return out.join("\n");
}

/** Rough reading time. 200 wpm is the usual convention. */
export function readingMinutes(md: string): number {
  const words = md.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

/**
 * Pulls `## ` headings for an on-page table of contents.
 *
 * Worth having beyond navigation: AI engines extract answers from
 * question-shaped headings, so surfacing them is a small GEO win.
 */
export function extractHeadings(md: string): { text: string; id: string }[] {
  return md
    .split("\n")
    .map((l) => /^##\s+(.*)$/.exec(l.trim()))
    .filter((m): m is RegExpExecArray => Boolean(m))
    .map((m) => ({ text: m[1], id: slugifyHeading(m[1]) }));
}

export function slugifyHeading(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 60);
}
