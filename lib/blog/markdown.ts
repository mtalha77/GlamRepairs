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

export function renderMarkdown(md: string): string {
  const lines = escapeHtml(md.replace(/\r\n/g, "\n")).split("\n");
  const out: string[] = [];
  let inList = false;
  let para: string[] = [];

  const flushPara = () => {
    if (para.length) {
      out.push(`<p>${inline(para.join(" "))}</p>`);
      para = [];
    }
  };
  const closeList = () => {
    if (inList) {
      out.push("</ul>");
      inList = false;
    }
  };

  for (const raw of lines) {
    const line = raw.trimEnd();

    if (!line.trim()) {
      flushPara();
      closeList();
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
      if (!inList) {
        out.push("<ul>");
        inList = true;
      }
      out.push(`<li>${inline(line.replace(/^[-*]\s+/, ""))}</li>`);
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
