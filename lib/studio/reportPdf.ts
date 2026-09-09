import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";

import type { SkinReportPdfInput } from "@/lib/studio/report";
import { AUTHORS, DEFAULT_AUTHOR_SLUG } from "@/lib/seo/authors";
import { SITE, getCredential } from "@/lib/seo/site";
import { PHOTO_PROMPT } from "@/lib/studio/reportGuidance";

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN = 48;
const PURPLE = rgb(0.4, 0.176, 0.569);
const INK = rgb(0.169, 0.169, 0.169);
const GRAY = rgb(0.29, 0.29, 0.29);
const LINE = rgb(0.839, 0.804, 0.918);
const SOFT = rgb(0.965, 0.929, 1);

type DrawState = {
  doc: PDFDocument;
  page: PDFPage;
  font: PDFFont;
  bold: PDFFont;
  y: number;
};

function toWinAnsi(value: string) {
  return value
    .replaceAll("\u2013", "-")
    .replaceAll("\u2014", "-")
    .replaceAll("\u2018", "'")
    .replaceAll("\u2019", "'")
    .replaceAll("\u201C", '"')
    .replaceAll("\u201D", '"')
    .replaceAll("\u2022", "-")
    .replaceAll("\u00B7", "-")
    .replaceAll("\u2026", "...")
    .replace(/[^\t\n\r\x20-\x7E\xA0-\xFF]/g, "");
}

function drawSafeText(
  page: PDFPage,
  text: string,
  options: {
    x: number;
    y: number;
    size: number;
    font: PDFFont;
    color: ReturnType<typeof rgb>;
  },
) {
  const safe = toWinAnsi(text);
  if (!safe) return;
  page.drawText(safe, options);
}

function wrapText(text: string, font: PDFFont, size: number, maxWidth: number) {
  const paragraphs = toWinAnsi(text).replaceAll("\r\n", "\n").split("\n");
  const lines: string[] = [];

  for (const paragraph of paragraphs) {
    if (!paragraph.trim()) {
      lines.push("");
      continue;
    }
    const words = paragraph.split(/\s+/);
    let current = "";
    for (const word of words) {
      if (font.widthOfTextAtSize(word, size) > maxWidth) {
        if (current) {
          lines.push(current);
          current = "";
        }
        let chunk = "";
        for (const char of word) {
          const next = chunk + char;
          if (chunk && font.widthOfTextAtSize(next, size) > maxWidth) {
            lines.push(chunk);
            chunk = char;
          } else {
            chunk = next;
          }
        }
        current = chunk;
        continue;
      }
      const next = current ? `${current} ${word}` : word;
      if (font.widthOfTextAtSize(next, size) <= maxWidth) {
        current = next;
      } else {
        if (current) lines.push(current);
        current = word;
      }
    }
    if (current) lines.push(current);
  }

  return lines;
}

function ensureSpace(state: DrawState, needed: number) {
  if (state.y - needed >= MARGIN) return;
  state.page = state.doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  state.y = PAGE_HEIGHT - MARGIN;
}

function drawHeader(state: DrawState) {
  const { page } = state;
  page.drawRectangle({
    x: 0,
    y: PAGE_HEIGHT - 72,
    width: PAGE_WIDTH,
    height: 72,
    color: PURPLE,
  });
  drawSafeText(page, "GLAM REPAIRS", {
    x: MARGIN,
    y: PAGE_HEIGHT - 34,
    size: 11,
    font: state.bold,
    color: rgb(1, 1, 1),
  });
  drawSafeText(page, "Skin Guidance Report", {
    x: MARGIN,
    y: PAGE_HEIGHT - 56,
    size: 18,
    font: state.bold,
    color: rgb(1, 1, 1),
  });
  state.y = PAGE_HEIGHT - 96;
}

function fieldBlockHeight(value: string, font: PDFFont, width: number) {
  const lines = Math.max(wrapText(value, font, 11, width).length, 1);
  return 10 + 4 + lines * 14;
}

function drawField(
  state: DrawState,
  label: string,
  value: string,
  x: number,
  y: number,
  width: number,
) {
  drawSafeText(state.page, label.toUpperCase(), {
    x,
    y,
    size: 8,
    font: state.bold,
    color: GRAY,
  });
  const lines = wrapText(value, state.font, 11, width);
  let lineY = y - 14;
  for (const line of lines) {
    if (line) {
      drawSafeText(state.page, line, {
        x,
        y: lineY,
        size: 11,
        font: state.font,
        color: INK,
      });
    }
    lineY -= 14;
  }
}

function drawPatientCard(state: DrawState, patient: SkinReportPdfInput["patient"]) {
  const paddingX = 16;
  const paddingTop = 18;
  const paddingBottom = 16;
  const colGap = 20;
  const innerWidth = PAGE_WIDTH - MARGIN * 2 - paddingX * 2;
  const colWidth = (innerWidth - colGap) / 2;
  const leftX = MARGIN + paddingX;
  const rightX = leftX + colWidth + colGap;

  const rows: Array<[string, string, string, string]> = [
    ["Client name", patient.clientName, "Gender", patient.gender],
    ["Concern", patient.concern, "Age", patient.age],
    ["Plan", patient.plan, "Location", patient.location],
  ];

  const rowHeights = rows.map(([, leftValue, , rightValue]) =>
    Math.max(
      fieldBlockHeight(leftValue, state.font, colWidth),
      fieldBlockHeight(rightValue, state.font, colWidth),
    ),
  );
  const contentHeight = rowHeights.reduce((sum, height) => sum + height, 0) + 12;
  const boxHeight = paddingTop + contentHeight + paddingBottom;
  const boxBottom = state.y - boxHeight;

  state.page.drawRectangle({
    x: MARGIN - 4,
    y: boxBottom,
    width: PAGE_WIDTH - MARGIN * 2 + 8,
    height: boxHeight,
    color: SOFT,
  });

  let rowY = state.y - paddingTop;
  for (const [index, [leftLabel, leftValue, rightLabel, rightValue]] of rows.entries()) {
    drawField(state, leftLabel, leftValue, leftX, rowY, colWidth);
    drawField(state, rightLabel, rightValue, rightX, rowY, colWidth);
    rowY -= rowHeights[index] + 6;
  }

  state.y = boxBottom - 18;
}

function drawSectionTitle(state: DrawState, title: string) {
  ensureSpace(state, 36);
  drawSafeText(state.page, title, {
    x: MARGIN,
    y: state.y,
    size: 13,
    font: state.bold,
    color: PURPLE,
  });
  state.y -= 8;
  state.page.drawLine({
    start: { x: MARGIN, y: state.y },
    end: { x: PAGE_WIDTH - MARGIN, y: state.y },
    thickness: 1,
    color: LINE,
  });
  state.y -= 16;
}

function drawParagraph(state: DrawState, text: string) {
  const maxWidth = PAGE_WIDTH - MARGIN * 2;
  const lines = wrapText(text, state.font, 11, maxWidth);
  for (const line of lines) {
    ensureSpace(state, 16);
    if (line) {
      drawSafeText(state.page, line, {
        x: MARGIN,
        y: state.y,
        size: 11,
        font: state.font,
        color: INK,
      });
    }
    state.y -= 16;
  }
  state.y -= 8;
}

/**
 * HANDOVER-16 Part 2a — the start-here instruction, in a tinted box.
 *
 * It is one sentence competing with two full routines and a list of things
 * to avoid, on a document people skim. Given the same body treatment as
 * every other paragraph it is read last or not at all, which defeats the
 * point of it existing. The box is measured and kept whole: a callout split
 * across a page break reads as a rendering fault, not emphasis.
 */
function drawCallout(state: DrawState, text: string) {
  const paddingX = 14;
  const paddingY = 12;
  const innerWidth = PAGE_WIDTH - MARGIN * 2 - paddingX * 2;
  const lines = wrapText(text, state.bold, 10.5, innerWidth);
  const boxHeight = paddingY * 2 + lines.length * 15;

  ensureSpace(state, boxHeight + 8);

  const boxTop = state.y + 4;
  state.page.drawRectangle({
    x: MARGIN,
    y: boxTop - boxHeight,
    width: PAGE_WIDTH - MARGIN * 2,
    height: boxHeight,
    color: SOFT,
  });
  // A left rule rather than a full border — it reads as emphasis instead of
  // as a table cell.
  state.page.drawRectangle({
    x: MARGIN,
    y: boxTop - boxHeight,
    width: 3,
    height: boxHeight,
    color: PURPLE,
  });

  let lineY = boxTop - paddingY - 11;
  for (const line of lines) {
    if (line) {
      drawSafeText(state.page, line, {
        x: MARGIN + paddingX,
        y: lineY,
        size: 10.5,
        font: state.bold,
        color: PURPLE,
      });
    }
    lineY -= 15;
  }

  state.y = boxTop - boxHeight - 18;
}

/**
 * A bold lead-in followed by wrapped body text — "Good signs: less shine by
 * midday…". Used for Part 2d, where the label is doing real work: one half
 * is encouragement and the other is a safety instruction, and they must not
 * read as one undifferentiated paragraph.
 */
function drawLabelledParagraph(state: DrawState, label: string, text: string) {
  const maxWidth = PAGE_WIDTH - MARGIN * 2;
  ensureSpace(state, 16);
  drawSafeText(state.page, `${label}:`, {
    x: MARGIN,
    y: state.y,
    size: 11,
    font: state.bold,
    color: INK,
  });
  state.y -= 15;

  for (const line of wrapText(text, state.font, 11, maxWidth)) {
    ensureSpace(state, 16);
    if (line) {
      drawSafeText(state.page, line, {
        x: MARGIN,
        y: state.y,
        size: 11,
        font: state.font,
        color: INK,
      });
    }
    state.y -= 16;
  }
  state.y -= 8;
}

function drawBulletList(state: DrawState, items: string[]) {
  const maxWidth = PAGE_WIDTH - MARGIN * 2 - 14;
  for (const item of items) {
    const lines = wrapText(item, state.font, 11, maxWidth);
    ensureSpace(state, 16 * Math.max(lines.length, 1) + 4);
    drawSafeText(state.page, "-", {
      x: MARGIN,
      y: state.y,
      size: 11,
      font: state.bold,
      color: PURPLE,
    });
    for (const [index, line] of lines.entries()) {
      if (index > 0) {
        ensureSpace(state, 16);
        state.y -= 16;
      }
      if (line) {
        drawSafeText(state.page, line, {
          x: MARGIN + 14,
          y: state.y,
          size: 11,
          font: state.font,
          color: INK,
        });
      }
    }
    state.y -= 18;
  }
  state.y -= 4;
}

/**
 * HANDOVER-16 §2 — the medical boundary, on the deliverable itself.
 *
 * Every other surface carries this: the site footer, /about, /contact, the
 * Terms, every blog post. The report — the document that actually contains
 * the advice, that a client keeps and may act on for weeks — carried none.
 * A report telling someone to use niacinamide and commenting on their diet
 * has to say what it is and is not.
 *
 * Verbatim and non-negotiable. Do not shorten it to fit a layout; if it does
 * not fit, the block moves to a new page, which is what the measurement
 * below is for.
 */
const DISCLAIMER =
  "This assessment provides cosmetic skincare guidance based on the " +
  "information and photographs you provided. It is not a medical diagnosis " +
  "and does not replace advice from a doctor. If your skin is painful, " +
  "spreading, bleeding, changing rapidly, or does not improve, please see a " +
  "doctor or dermatologist.";

/**
 * The signature, built from the same records the credentials page and the
 * Person schema use — lib/seo/authors.ts and the CREDENTIALS array — so a
 * reference number can never say one thing on the site and another on a
 * document a client is holding.
 *
 * Banned everywhere, including here: "Dr.", "MD", "licensed".
 */
function signatureLines(input: SkinReportPdfInput): string[] {
  const author =
    AUTHORS[input.authorSlug ?? DEFAULT_AUTHOR_SLUG] ??
    AUTHORS[DEFAULT_AUTHOR_SLUG];

  // Falls back to the passed-in name so a practitioner without a record still
  // gets a signed report rather than one signed by the wrong person.
  const name = author?.name ?? input.authorName;
  const lines = ["Prepared and reviewed by", name];

  if (author?.title) lines.push(author.title);
  if (author?.credentials) lines.push(author.credentials);
  if (author?.hecReference) {
    lines.push("Degree attested by the Higher Education Commission of Pakistan");
    lines.push(`Ref. ${author.hecReference}`);
  }
  const ids = getCredential("ids-membership");
  if (author?.memberOf) {
    lines.push(
      `Member, ${author.memberOf.name}${ids?.reference ? ` (Membership No. ${ids.reference})` : ""}`,
    );
  }
  lines.push(
    `Glam Repairs \u00b7 glamrepairs.com \u00b7 ${SITE.phone.displayInternational}`,
  );

  const ref = input.reportRef ? `Report reference: ${input.reportRef}` : null;
  const tail = [ref, input.patient.plan, input.patient.reportDate]
    .filter(Boolean)
    .join(" \u00b7 ");
  if (tail) lines.push(tail);

  return lines;
}

/**
 * HANDOVER-16 §1 — why the old version produced a blank second page.
 *
 * The footer was drawn at a FIXED y (MARGIN - 8) but was preceded by
 * `ensureSpace(state, 40)`, which adds a page when the flow cursor is low.
 * On a report whose content filled page one, that call created page two and
 * the footer was then stamped at the bottom of it — a page containing 36
 * characters and nothing else.
 *
 * The block is measured first and only then given a page. It is positioned,
 * not flowed, so it always sits at the bottom of whatever turns out to be
 * the last page.
 */
function drawClosingBlock(state: DrawState, input: SkinReportPdfInput) {
  const disclaimerLines = wrapText(
    DISCLAIMER,
    state.font,
    8,
    PAGE_WIDTH - MARGIN * 2,
  );
  const lines = signatureLines(input);

  const disclaimerHeight = disclaimerLines.length * 11 + 10;
  const signatureHeight = lines.length * 11;
  const blockHeight = disclaimerHeight + signatureHeight + 18;

  // Only now decide whether a new page is needed.
  const needsNewPage = state.y - blockHeight < MARGIN;
  if (needsNewPage) {
    state.page = state.doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    state.y = PAGE_HEIGHT - MARGIN;
  }

  // Anchored to the bottom margin on a page that already carries the report,
  // which is where a signature belongs. On a page created solely for this
  // block there is nothing above it, so the same anchoring would leave the
  // whole sheet blank with twelve lines floating at the foot of it — which
  // reads as the layout bug this function exists to fix. There it flows from
  // the top instead.
  let y = needsNewPage ? state.y : MARGIN + blockHeight - 12;

  state.page.drawLine({
    start: { x: MARGIN, y: y + 10 },
    end: { x: PAGE_WIDTH - MARGIN, y: y + 10 },
    thickness: 0.6,
    color: LINE,
  });

  for (const line of disclaimerLines) {
    drawSafeText(state.page, line, {
      x: MARGIN,
      y,
      size: 8,
      font: state.font,
      color: GRAY,
    });
    y -= 11;
  }

  y -= 10;

  lines.forEach((line, index) => {
    drawSafeText(state.page, line, {
      x: MARGIN,
      y,
      size: index === 1 ? 10 : 8,
      // The practitioner's name is the one line that carries weight.
      font: index === 1 ? state.bold : state.font,
      color: index === 1 ? PURPLE : GRAY,
    });
    y -= 11;
  });
}

/**
 * HANDOVER-16 §4 — "Page 1 of 2", stamped after pagination is finished.
 *
 * It has to run last: the total is not known until every page exists, and a
 * reader needs to know nothing is missing.
 */
function stampPageNumbers(doc: PDFDocument, font: PDFFont) {
  const pages = doc.getPages();
  if (pages.length < 2) return;
  pages.forEach((page, index) => {
    drawSafeText(page, `Page ${index + 1} of ${pages.length}`, {
      x: PAGE_WIDTH - MARGIN - 60,
      y: MARGIN - 20,
      size: 7,
      font,
      color: GRAY,
    });
  });
}

export async function buildSkinReportPdf(input: SkinReportPdfInput) {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  const state: DrawState = {
    doc,
    page,
    font,
    bold,
    y: PAGE_HEIGHT - MARGIN,
  };

  drawHeader(state);
  drawPatientCard(state, input.patient);

  // §4 — reference and date together in the header. Support, follow-ups and
  // reordering all need the reference, and the client had no way to quote it.
  const headerMeta = [
    `Report date: ${input.patient.reportDate}`,
    input.reportRef ? `Reference: ${input.reportRef}` : null,
    input.followUpDate ? `Your check-in: ${input.followUpDate}` : null,
  ]
    .filter(Boolean)
    .join("   \u00b7   ");
  drawSafeText(state.page, headerMeta, {
    x: MARGIN,
    y: state.y,
    size: 9,
    font,
    color: GRAY,
  });
  state.y -= 28;

  drawSectionTitle(state, "What we noticed");
  drawParagraph(state, input.noticed);

  /**
   * HANDOVER-16 Part 2a — before the routines, deliberately.
   *
   * A client with no existing routine is being handed roughly seven new
   * behaviours at once, which is how routines fail. Placing this after the
   * two routines would make it a footnote to the thing it is meant to make
   * survivable; placing it first reframes everything below as "later".
   */
  if (input.startHere?.trim()) {
    drawSectionTitle(state, "Start here");
    drawCallout(state, input.startHere);
  }

  drawSectionTitle(state, "Morning routine");
  drawParagraph(state, input.morningRoutine);

  drawSectionTitle(state, "Night routine");
  drawParagraph(state, input.nightRoutine);

  drawSectionTitle(state, "What to avoid");
  const avoid = input.avoidItems
    .split("\n")
    .map((item) => item.replace(/^[-•]\s*/, "").trim())
    .filter(Boolean);
  drawBulletList(state, avoid);

  /**
   * Part 2b. Placed after the routines and the avoid list, because it is the
   * answer to "I have done all this — now what?". The last line, telling the
   * client to message us if nothing has changed by week 8, is the one that
   * turns a quiet loss into a conversation.
   */
  if (input.timeline?.trim()) {
    drawSectionTitle(state, "What to expect, week by week");
    drawParagraph(state, input.timeline);
  }

  /** Part 2d — the two halves are one section; separating them would bury the safety line. */
  if (input.goodSigns?.trim() || input.warningSigns?.trim()) {
    drawSectionTitle(state, "How to tell it is working");
    if (input.goodSigns?.trim()) {
      drawLabelledParagraph(state, "Good signs", input.goodSigns);
    }
    if (input.warningSigns?.trim()) {
      drawLabelledParagraph(
        state,
        "Stop and message us if",
        input.warningSigns,
      );
    }
  }

  // Part 2e. The same sentence for every client, so it is not an editor
  // field — and it feeds client_progress, which already exists.
  if (input.timeline?.trim() || input.goodSigns?.trim()) {
    drawParagraph(state, PHOTO_PROMPT);
  }

  if (input.extraNotes.trim()) {
    drawSectionTitle(state, "Extra notes");
    drawParagraph(state, input.extraNotes);
  }

  drawClosingBlock(state, input);
  stampPageNumbers(doc, font);

  return Buffer.from(await doc.save());
}
