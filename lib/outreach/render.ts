import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Turning a stored step into an email (Handovers 68 §5.3, 69 §3.5).
 *
 * The body is a small, safe subset of markdown: paragraphs, **bold**,
 * "- " and "1. " lists, and [text](https://...) links. Everything is escaped
 * first, so copy edited in the studio cannot inject HTML.
 *
 * Variables: {{first_name}} and {{company}}. A [square-bracket blank] that
 * is not a link is unfinished copy; renderStep refuses it, and the database
 * refuses to activate a sequence that contains one.
 *
 * Every email ends with who it is from, the business address, why they are
 * receiving it and a working unsubscribe link; the List-Unsubscribe headers
 * make it one click in Gmail and Apple Mail.
 */

export type RenderContact = { id: string; first_name: string | null; company: string | null };
export type RenderStep = { step_no: number; subject: string; body_md: string };

const SITE = "https://www.glamrepairs.com";

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export function unresolvedPlaceholders(text: string): string[] {
  return [...text.matchAll(/(\[[^\]\n]{1,120}\])(?!\()/g)].map((m) => m[1]);
}

function linkKey(): string {
  const key = process.env.OUTREACH_LINK_SECRET || process.env.CONSULTATION_LINK_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("No key to sign unsubscribe links.");
  return key;
}

export const unsubscribeToken = (contactId: string) => createHmac("sha256", linkKey()).update(`outreach-unsub:${contactId}`).digest("base64url");

export function verifyUnsubscribeToken(contactId: string, token: string | null | undefined): boolean {
  if (!token || !/^[0-9a-f-]{36}$/.test(contactId)) return false;
  const a = Buffer.from(unsubscribeToken(contactId));
  const b = Buffer.from(token);
  return a.length === b.length && timingSafeEqual(a, b);
}

export const unsubscribeUrl = (contactId: string) => `${SITE}/outreach/unsubscribe?c=${contactId}&t=${unsubscribeToken(contactId)}`;
export const oneClickUnsubscribeUrl = (contactId: string) => `${SITE}/api/outreach/unsubscribe?c=${contactId}&t=${unsubscribeToken(contactId)}`;

/** Handover 69 §3.5: our own links carry the campaign and the contact, so an application can be traced back. */
function track(url: string, sequenceCode: string, contactId: string): string {
  try {
    const u = new URL(url);
    if (!/(^|\.)glamrepairs\.com$/.test(u.hostname)) return url;
    u.searchParams.set("utm_source", "outreach");
    u.searchParams.set("utm_medium", "email");
    u.searchParams.set("utm_campaign", sequenceCode);
    u.searchParams.set("c", contactId);
    return u.toString();
  } catch {
    return url;
  }
}

function fill(text: string, c: RenderContact): string {
  return text
    .replace(/\{\{\s*first_name\s*\}\}/g, c.first_name?.trim() || "there")
    .replace(/\{\{\s*company\s*\}\}/g, c.company?.trim() || "your brand");
}

function inline(text: string, link: (url: string) => string): string {
  return esc(text)
    .replace(/\[([^\]\n]+)\]\((https?:\/\/[^)\s]+)\)/g, (_m, label: string, url: string) => `<a href="${esc(link(url.replace(/&amp;/g, "&")))}" style="color:#662d91;font-weight:600;">${label}</a>`)
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
}

function toHtml(md: string, link: (url: string) => string): string {
  const blocks = md.replace(/\r\n/g, "\n").trim().split(/\n\s*\n/);
  return blocks
    .map((block) => {
      const lines = block.split("\n");
      if (lines.every((l) => /^\s*- /.test(l))) {
        return `<ul style="margin:0 0 14px;padding-left:20px;">${lines.map((l) => `<li style="margin:0 0 6px;">${inline(l.replace(/^\s*- /, ""), link)}</li>`).join("")}</ul>`;
      }
      if (lines.every((l) => /^\s*\d+\. /.test(l))) {
        return `<ol style="margin:0 0 14px;padding-left:20px;">${lines.map((l) => `<li style="margin:0 0 6px;">${inline(l.replace(/^\s*\d+\. /, ""), link)}</li>`).join("")}</ol>`;
      }
      return `<p style="margin:0 0 14px;">${lines.map((l) => inline(l, link)).join("<br />")}</p>`;
    })
    .join("");
}

function toText(md: string, link: (url: string) => string): string {
  return md
    .replace(/\[([^\]\n]+)\]\((https?:\/\/[^)\s]+)\)/g, (_m, label: string, url: string) => `${label}: ${link(url)}`)
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .trim();
}

export type RenderedEmail = { subject: string; html: string; text: string; headers: Record<string, string> };

export function renderStep(input: {
  step: RenderStep;
  contact: RenderContact;
  sequenceCode: string;
  audience: "practitioner" | "brand";
  businessAddress: string;
}): { ok: true; email: RenderedEmail } | { ok: false; reason: string } {
  const subject = fill(input.step.subject, input.contact);
  const body = fill(input.step.body_md, input.contact);
  const blanks = unresolvedPlaceholders(`${subject}\n${body}`);
  if (blanks.length) return { ok: false, reason: `Unfilled: ${blanks.join(", ")}` };
  if (!input.businessAddress.trim()) return { ok: false, reason: "No business address set." };

  const link = (url: string) => track(url, input.sequenceCode, input.contact.id);
  const unsub = unsubscribeUrl(input.contact.id);
  const why =
    input.audience === "practitioner"
      ? "You are receiving this because you were in touch with Glam Repairs about working with us."
      : "You are receiving this because of your role at your company. We write to a small number of brands, by hand.";

  const html = `<div style="font-family:Arial,Helvetica,sans-serif;line-height:1.6;color:#2b2b2b;max-width:560px;font-size:15px;">${toHtml(body, link)}
<hr style="border:none;border-top:1px solid #e7d9f5;margin:24px 0 12px;" />
<p style="margin:0;color:#6b6b6b;font-size:12px;line-height:1.5;">Glam Repairs, ${esc(input.businessAddress)}<br />${esc(why)}<br /><a href="${esc(unsub)}" style="color:#6b6b6b;">Unsubscribe</a> and you will not hear from us again.</p></div>`;
  const text = `${toText(body, link)}\n\n--\nGlam Repairs, ${input.businessAddress}\n${why}\nUnsubscribe: ${unsub}`;

  return {
    ok: true,
    email: {
      subject,
      html,
      text,
      headers: {
        "List-Unsubscribe": `<${oneClickUnsubscribeUrl(input.contact.id)}>`,
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
      },
    },
  };
}
